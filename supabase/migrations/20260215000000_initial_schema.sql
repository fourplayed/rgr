-- ============================================================================
-- RGR Fleet Manager - Initial Database Schema
-- Migration: 20260215000000_initial_schema.sql
--
-- Tables:
--   1. depots           - Depot/location reference data
--   2. profiles         - User profiles (linked to auth.users)
--   3. assets           - Fleet assets (trailers, dollies)
--   4. scan_events      - QR scan events with geolocation
--   5. photos           - Photo uploads (compressed + original)
--   6. freight_analysis - AI freight classification results
--   7. hazard_alerts    - Detected hazards with review workflow
--   8. maintenance_records - Asset maintenance tracking
--   9. audit_log        - System-wide audit trail
--
-- Design Principles:
--   - snake_case column naming (PostgreSQL convention)
--   - UUID primary keys for distributed compatibility
--   - TIMESTAMPTZ for all timestamps (timezone-aware)
--   - Soft deletes via deleted_at where appropriate
--   - Partial indexes on soft-delete columns to avoid per-query filters
--   - Composite indexes aligned with actual query patterns
--   - RLS enabled on all tables with role-based policies
-- ============================================================================

-- gen_random_uuid() is built-in since PostgreSQL 13+ (Supabase uses PG 15+)
-- No extensions needed for UUID generation

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('driver', 'mechanic', 'manager', 'superuser');
CREATE TYPE asset_status AS ENUM ('active', 'maintenance', 'out_of_service', 'decommissioned');
CREATE TYPE asset_category AS ENUM ('trailer', 'dolly');
CREATE TYPE scan_type AS ENUM ('qr_scan', 'manual_entry', 'nfc_scan', 'gps_auto');
CREATE TYPE photo_type AS ENUM ('freight', 'damage', 'inspection', 'general');
CREATE TYPE hazard_severity AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE hazard_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
CREATE TYPE review_outcome AS ENUM ('confirmed', 'false_positive', 'needs_training');
CREATE TYPE maintenance_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- ============================================================================
-- 1. DEPOTS TABLE
-- ============================================================================
-- Reference table for depot/yard locations.
-- Small table (~10-50 rows), rarely changes. No partitioning needed.

CREATE TABLE depots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20) NOT NULL UNIQUE,  -- Short code like "PER", "KAL"
    address     TEXT,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE depots IS 'Depot/yard locations for asset assignment and tracking';

-- ============================================================================
-- 2. PROFILES TABLE
-- ============================================================================
-- One-to-one with auth.users. Created by trigger on user signup.
-- Expected size: hundreds of users (small table).
-- Primary access pattern: lookup by id (PK), filter by role, depot, is_active.

CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    role            user_role NOT NULL DEFAULT 'driver',
    phone           VARCHAR(20),
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    employee_id     VARCHAR(50),
    depot           VARCHAR(100),          -- Free-text depot reference (matches depots.name)
    depot_id        UUID REFERENCES depots(id),  -- Optional FK to depots
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN profiles.depot IS 'Free-text depot name for backward compatibility';
COMMENT ON COLUMN profiles.depot_id IS 'Optional FK to depots table for structured queries';

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role) WHERE is_active = TRUE;
CREATE INDEX idx_profiles_depot ON profiles(depot) WHERE is_active = TRUE;
CREATE INDEX idx_profiles_employee_id ON profiles(employee_id) WHERE employee_id IS NOT NULL;

-- ============================================================================
-- 3. ASSETS TABLE
-- ============================================================================
-- Core table: all fleet assets (trailers TL###, dollies DL###).
-- Expected size: hundreds to low thousands of rows.
-- Primary access patterns:
--   - List all non-deleted assets filtered by status/category
--   - Lookup by asset_number (unique)
--   - Map view: assets with lat/lng not null
--   - Outstanding assets: last_location_updated_at older than N days

CREATE TABLE assets (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_number                VARCHAR(20) NOT NULL UNIQUE,  -- TL001, DL015
    category                    asset_category NOT NULL,
    subtype                     VARCHAR(50),                   -- e.g., "flatbed", "curtainsider", "converter"
    status                      asset_status NOT NULL DEFAULT 'active',
    description                 TEXT,
    year_manufactured           SMALLINT,
    make                        VARCHAR(100),
    model                       VARCHAR(100),
    vin                         VARCHAR(50),
    registration_number         VARCHAR(20),
    registration_expiry         DATE,

    -- Denormalized last-known location (updated from scan_events)
    -- This avoids an expensive JOIN to scan_events for the map view.
    -- Trade-off: slight write overhead on scan insert vs massive read benefit.
    last_latitude               DOUBLE PRECISION,
    last_longitude              DOUBLE PRECISION,
    last_location_accuracy      REAL,                          -- GPS accuracy in meters
    last_location_updated_at    TIMESTAMPTZ,
    last_scanned_by             UUID REFERENCES profiles(id),

    -- Assignment
    assigned_depot_id           UUID REFERENCES depots(id),
    assigned_driver_id          UUID REFERENCES profiles(id),

    -- QR code
    qr_code_data                TEXT,        -- QR payload (rgr://asset/TL001)
    qr_generated_at             TIMESTAMPTZ,

    -- Soft delete
    deleted_at                  TIMESTAMPTZ,

    -- Metadata
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE assets IS 'Fleet assets: trailers (TL###) and dollies (DL###)';
COMMENT ON COLUMN assets.last_latitude IS 'Denormalized from latest scan_event for fast map queries';
COMMENT ON COLUMN assets.last_longitude IS 'Denormalized from latest scan_event for fast map queries';

-- Indexes for assets
-- Primary query: non-deleted assets by status and category (dashboard stats, listing)
CREATE INDEX idx_assets_active_status ON assets(status, category)
    WHERE deleted_at IS NULL;

-- Map query: assets with location data, non-deleted
CREATE INDEX idx_assets_map ON assets(last_latitude, last_longitude)
    WHERE deleted_at IS NULL AND last_latitude IS NOT NULL AND last_longitude IS NOT NULL;

-- Outstanding assets: active assets by last location update
CREATE INDEX idx_assets_outstanding ON assets(last_location_updated_at)
    WHERE deleted_at IS NULL AND status IN ('active', 'maintenance');

-- Assignment lookups
CREATE INDEX idx_assets_depot ON assets(assigned_depot_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_assets_driver ON assets(assigned_driver_id)
    WHERE deleted_at IS NULL AND assigned_driver_id IS NOT NULL;

-- Registration expiry monitoring
CREATE INDEX idx_assets_rego_expiry ON assets(registration_expiry)
    WHERE deleted_at IS NULL AND registration_expiry IS NOT NULL;

-- ============================================================================
-- 4. SCAN EVENTS TABLE
-- ============================================================================
-- High-volume table: every QR scan creates a row.
-- Expected growth: hundreds per day, millions over time.
-- Primary access patterns:
--   - Recent scans ordered by created_at DESC (dashboard feed)
--   - Scans for a specific asset (asset detail page)
--   - Last scan per asset (outstanding assets calculation)
--
-- Partitioning consideration: If this table exceeds 10M rows,
-- partition by RANGE on created_at (monthly). For now, B-tree indexes suffice.

CREATE TABLE scan_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    scanned_by      UUID REFERENCES profiles(id),
    scan_type       scan_type NOT NULL DEFAULT 'qr_scan',

    -- Geolocation at scan time
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    accuracy        REAL,                    -- GPS accuracy in meters
    altitude        REAL,
    heading         REAL,
    speed           REAL,

    -- Scan metadata
    location_description    VARCHAR(255),    -- Human-readable location note
    device_info             JSONB,           -- { platform, userAgent, etc. }
    raw_scan_data           TEXT,            -- Raw QR/NFC data for debugging

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE scan_events IS 'QR/NFC scan events capturing asset location over time';

-- Indexes for scan_events
-- Recent scans feed: ORDER BY created_at DESC (covering index with asset_id)
CREATE INDEX idx_scan_events_recent ON scan_events(created_at DESC);

-- Scans per asset (asset detail page, last scan lookup)
CREATE INDEX idx_scan_events_asset ON scan_events(asset_id, created_at DESC);

-- Scans by user (user activity)
CREATE INDEX idx_scan_events_user ON scan_events(scanned_by, created_at DESC)
    WHERE scanned_by IS NOT NULL;

-- ============================================================================
-- 5. PHOTOS TABLE
-- ============================================================================
-- Photos uploaded for freight analysis, damage reporting, inspections.
-- Expected size: thousands to tens of thousands.
-- Primary access pattern: lookup by asset, by uploader, by analysis status.

CREATE TABLE photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID REFERENCES assets(id) ON DELETE SET NULL,
    scan_event_id   UUID REFERENCES scan_events(id) ON DELETE SET NULL,
    uploaded_by     UUID NOT NULL REFERENCES profiles(id),

    photo_type      photo_type NOT NULL DEFAULT 'general',
    storage_path    TEXT NOT NULL,           -- Path in Supabase storage bucket
    thumbnail_path  TEXT,                    -- Compressed/resized version path
    filename        VARCHAR(255),
    file_size       INTEGER,                -- Bytes
    mime_type       VARCHAR(50) DEFAULT 'image/jpeg',
    width           INTEGER,
    height          INTEGER,

    -- Analysis status
    is_analyzed     BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE photos IS 'Photo uploads for freight analysis and inspections';

-- Indexes for photos
CREATE INDEX idx_photos_asset ON photos(asset_id, created_at DESC)
    WHERE asset_id IS NOT NULL;

CREATE INDEX idx_photos_uploader ON photos(uploaded_by, created_at DESC);

CREATE INDEX idx_photos_unanalyzed ON photos(created_at)
    WHERE is_analyzed = FALSE AND photo_type = 'freight';

-- ============================================================================
-- 6. FREIGHT ANALYSIS TABLE
-- ============================================================================
-- AI analysis results for freight photos.
-- One-to-one with photos (one analysis per photo, can be re-run).
-- Expected size: same order as photos table.

CREATE TABLE freight_analysis (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id                UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    asset_id                UUID REFERENCES assets(id) ON DELETE SET NULL,
    analyzed_by_user        UUID REFERENCES profiles(id),  -- Who triggered analysis

    -- Classification results
    primary_category        VARCHAR(100),     -- e.g., "general_freight", "dangerous_goods"
    secondary_categories    TEXT[],            -- Array of secondary categories
    description             TEXT,
    confidence              REAL,              -- 0.0 to 1.0

    -- Load assessment
    estimated_weight_kg     REAL,
    load_distribution_score REAL,              -- 0.0 to 1.0
    restraint_count         INTEGER,

    -- Hazard summary
    hazard_count            INTEGER NOT NULL DEFAULT 0,
    max_severity            hazard_severity,
    requires_acknowledgment BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_from_departure  BOOLEAN NOT NULL DEFAULT FALSE,

    -- Raw AI response (for debugging/audit)
    raw_response            JSONB,
    model_version           VARCHAR(50),
    processing_duration_ms  INTEGER,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE freight_analysis IS 'AI freight classification and hazard detection results';

-- Indexes for freight_analysis
CREATE INDEX idx_freight_analysis_photo ON freight_analysis(photo_id);

CREATE INDEX idx_freight_analysis_asset ON freight_analysis(asset_id, created_at DESC)
    WHERE asset_id IS NOT NULL;

-- For stats: count of analyses
CREATE INDEX idx_freight_analysis_created ON freight_analysis(created_at DESC);

-- ============================================================================
-- 7. HAZARD ALERTS TABLE
-- ============================================================================
-- Individual hazards detected by AI, with a manager review workflow.
-- Expected size: subset of freight_analysis (not every photo has hazards).
-- Primary access patterns:
--   - Pending reviews (status = 'active', ordered by severity then created_at)
--   - Review statistics (aggregate by review_outcome)
--   - Hazard trends (count by date and severity)

CREATE TABLE hazard_alerts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freight_analysis_id     UUID NOT NULL REFERENCES freight_analysis(id) ON DELETE CASCADE,
    photo_id                UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    asset_id                UUID REFERENCES assets(id) ON DELETE SET NULL,
    scan_event_id           UUID REFERENCES scan_events(id) ON DELETE SET NULL,
    hazard_rule_id          VARCHAR(50),       -- Rule ID from hazard detection config

    -- Hazard details
    hazard_type             VARCHAR(100) NOT NULL,
    severity                hazard_severity NOT NULL,
    confidence_score        REAL NOT NULL DEFAULT 0.0,    -- 0.0 to 1.0
    description             TEXT NOT NULL,
    evidence_points         TEXT[] DEFAULT '{}',
    recommended_actions     TEXT[] DEFAULT '{}',
    location_in_image       VARCHAR(100),       -- e.g., "top-left", "center"
    bounding_box            JSONB,              -- {x, y, width, height} in image coordinates

    -- Review workflow
    status                  hazard_status NOT NULL DEFAULT 'active',
    acknowledged_by         UUID REFERENCES profiles(id),
    acknowledged_at         TIMESTAMPTZ,
    acknowledgment_type     VARCHAR(50),         -- e.g., "accepted_risk", "will_fix"
    manager_review_by       UUID REFERENCES profiles(id),
    manager_review_at       TIMESTAMPTZ,
    review_outcome          review_outcome,
    review_notes            TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hazard_alerts IS 'AI-detected freight hazards with manager review workflow';

-- Indexes for hazard_alerts
-- Pending review queue: active hazards by severity (critical first)
CREATE INDEX idx_hazard_alerts_pending ON hazard_alerts(severity, created_at DESC)
    WHERE status = 'active';

-- Review statistics
CREATE INDEX idx_hazard_alerts_reviewed ON hazard_alerts(review_outcome)
    WHERE review_outcome IS NOT NULL;

-- Hazard trends (date-based aggregation)
CREATE INDEX idx_hazard_alerts_trends ON hazard_alerts(created_at DESC, severity);

-- Lookup by analysis
CREATE INDEX idx_hazard_alerts_analysis ON hazard_alerts(freight_analysis_id);

-- Lookup by asset
CREATE INDEX idx_hazard_alerts_asset ON hazard_alerts(asset_id, created_at DESC)
    WHERE asset_id IS NOT NULL;

-- Lookup by photo (used in hazard review join)
CREATE INDEX idx_hazard_alerts_photo ON hazard_alerts(photo_id);

-- ============================================================================
-- 8. MAINTENANCE RECORDS TABLE
-- ============================================================================
-- Maintenance/service history for assets.
-- Expected size: thousands of records.
-- Primary access patterns:
--   - Upcoming maintenance per asset
--   - Overdue maintenance items
--   - Maintenance history for an asset

CREATE TABLE maintenance_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    reported_by         UUID REFERENCES profiles(id),
    assigned_to         UUID REFERENCES profiles(id),     -- Mechanic
    completed_by        UUID REFERENCES profiles(id),

    -- Maintenance details
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    priority            maintenance_priority NOT NULL DEFAULT 'medium',
    status              maintenance_status NOT NULL DEFAULT 'scheduled',
    maintenance_type    VARCHAR(50),                       -- "scheduled", "reactive", "inspection"

    -- Dates
    scheduled_date      DATE,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    due_date            DATE,

    -- Cost tracking
    estimated_cost      DECIMAL(10, 2),
    actual_cost         DECIMAL(10, 2),
    parts_used          JSONB,               -- [{name, partNumber, quantity, cost}]

    -- Related
    hazard_alert_id     UUID REFERENCES hazard_alerts(id),  -- If created from a hazard
    scan_event_id       UUID REFERENCES scan_events(id),

    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE maintenance_records IS 'Asset maintenance and service history';

-- Indexes for maintenance_records
-- Active maintenance per asset
CREATE INDEX idx_maintenance_asset_active ON maintenance_records(asset_id, scheduled_date)
    WHERE status IN ('scheduled', 'in_progress');

-- Overdue maintenance
CREATE INDEX idx_maintenance_overdue ON maintenance_records(due_date)
    WHERE status = 'scheduled' AND due_date IS NOT NULL;

-- Assigned mechanic's work queue
CREATE INDEX idx_maintenance_assigned ON maintenance_records(assigned_to, status)
    WHERE assigned_to IS NOT NULL AND status IN ('scheduled', 'in_progress');

-- History per asset
CREATE INDEX idx_maintenance_history ON maintenance_records(asset_id, created_at DESC);

-- ============================================================================
-- 9. AUDIT LOG TABLE
-- ============================================================================
-- Append-only audit trail for sensitive operations.
-- Expected size: high volume, grows indefinitely.
-- Consider partitioning by month if > 10M rows.

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES profiles(id),
    action          VARCHAR(100) NOT NULL,     -- "asset.create", "profile.update", etc.
    table_name      VARCHAR(50),
    record_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'System-wide audit trail for compliance and debugging';

-- Indexes for audit_log
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id, created_at DESC);

CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables with that column
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_depots
    BEFORE UPDATE ON depots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_assets
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_freight_analysis
    BEFORE UPDATE ON freight_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_hazard_alerts
    BEFORE UPDATE ON hazard_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_maintenance_records
    BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PROFILE CREATION TRIGGER
-- ============================================================================
-- Automatically create a profile row when a new auth.users row is inserted.
-- This is critical for the signup flow: Supabase Auth creates the user,
-- and this trigger creates the corresponding profile.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        phone,
        employee_id,
        depot,
        is_active
    ) VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(
            (NEW.raw_user_meta_data->>'role')::user_role,
            'driver'::user_role
        ),
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'employee_id',
        NEW.raw_user_meta_data->>'depot',
        TRUE
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists (idempotent)
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't block user creation
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- SCAN EVENT -> ASSET LOCATION UPDATE TRIGGER
-- ============================================================================
-- When a new scan event is inserted with location data, update the
-- denormalized location fields on the assets table.
-- This keeps the map view fast without JOINs.

CREATE OR REPLACE FUNCTION update_asset_location_from_scan()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the scan has location data
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        UPDATE assets
        SET
            last_latitude = NEW.latitude,
            last_longitude = NEW.longitude,
            last_location_accuracy = NEW.accuracy,
            last_location_updated_at = NEW.created_at,
            last_scanned_by = NEW.scanned_by,
            updated_at = NOW()
        WHERE id = NEW.asset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_scan_event_update_asset_location
    AFTER INSERT ON scan_events
    FOR EACH ROW EXECUTE FUNCTION update_asset_location_from_scan();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE depots ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Helper function: get current user's role from profiles table
-- Cached per-transaction for performance (avoids repeated lookups)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role
    FROM profiles
    WHERE id = auth.uid();

    RETURN COALESCE(v_role, 'driver'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- Helper function: check if current user is manager or above
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE OR REPLACE FUNCTION is_manager_or_above()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth_user_role() IN ('manager', 'superuser');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- DEPOTS RLS POLICIES
-- All authenticated users can read depots. Only managers+ can modify.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "depots_select_all"
    ON depots FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "depots_insert_manager"
    ON depots FOR INSERT
    TO authenticated
    WITH CHECK (is_manager_or_above());

CREATE POLICY "depots_update_manager"
    ON depots FOR UPDATE
    TO authenticated
    USING (is_manager_or_above());

CREATE POLICY "depots_delete_superuser"
    ON depots FOR DELETE
    TO authenticated
    USING (auth_user_role() = 'superuser');

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PROFILES RLS POLICIES
-- Users can read all profiles (for display names, assignments).
-- Users can update their own profile.
-- Superusers can update any profile (role changes, deactivation).
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "profiles_select_all"
    ON profiles FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Service role bypass for the trigger
CREATE POLICY "profiles_insert_service"
    ON profiles FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_superuser"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth_user_role() = 'superuser');

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ASSETS RLS POLICIES
-- All authenticated users can read assets (drivers need map, scan lookup).
-- Managers+ can create, update, and soft-delete assets.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "assets_select_all"
    ON assets FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "assets_insert_manager"
    ON assets FOR INSERT
    TO authenticated
    WITH CHECK (is_manager_or_above());

CREATE POLICY "assets_update_manager"
    ON assets FOR UPDATE
    TO authenticated
    USING (is_manager_or_above());

-- Allow the scan trigger (service_role) to update asset location
CREATE POLICY "assets_update_service"
    ON assets FOR UPDATE
    TO service_role
    USING (TRUE);

CREATE POLICY "assets_delete_superuser"
    ON assets FOR DELETE
    TO authenticated
    USING (auth_user_role() = 'superuser');

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- SCAN EVENTS RLS POLICIES
-- All authenticated users can read scan events.
-- All authenticated users can create scan events (drivers scan QR codes).
-- No updates or deletes (append-only audit trail).
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "scan_events_select_all"
    ON scan_events FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "scan_events_insert_all"
    ON scan_events FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PHOTOS RLS POLICIES
-- All authenticated users can read photos (needed for hazard review UI).
-- Authenticated users can upload photos.
-- Only the uploader or managers can delete.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "photos_select_all"
    ON photos FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "photos_insert_authenticated"
    ON photos FOR INSERT
    TO authenticated
    WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "photos_delete_own_or_manager"
    ON photos FOR DELETE
    TO authenticated
    USING (
        uploaded_by = auth.uid()
        OR is_manager_or_above()
    );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- FREIGHT ANALYSIS RLS POLICIES
-- All authenticated users can read analyses (for review dashboard).
-- Service role and managers can insert/update (edge function runs as service).
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "freight_analysis_select_all"
    ON freight_analysis FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "freight_analysis_insert_service"
    ON freight_analysis FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

CREATE POLICY "freight_analysis_insert_auth"
    ON freight_analysis FOR INSERT
    TO authenticated
    WITH CHECK (is_manager_or_above());

CREATE POLICY "freight_analysis_update_service"
    ON freight_analysis FOR UPDATE
    TO service_role
    USING (TRUE);

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- HAZARD ALERTS RLS POLICIES
-- All authenticated users can read alerts.
-- Service role can insert (from edge function).
-- Managers+ can update (review workflow).
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "hazard_alerts_select_all"
    ON hazard_alerts FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "hazard_alerts_insert_service"
    ON hazard_alerts FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

CREATE POLICY "hazard_alerts_update_manager"
    ON hazard_alerts FOR UPDATE
    TO authenticated
    USING (is_manager_or_above());

CREATE POLICY "hazard_alerts_update_service"
    ON hazard_alerts FOR UPDATE
    TO service_role
    USING (TRUE);

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- MAINTENANCE RECORDS RLS POLICIES
-- All authenticated users can read maintenance records.
-- Mechanics can update records assigned to them.
-- Managers+ can create and update all records.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "maintenance_select_all"
    ON maintenance_records FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "maintenance_insert_manager"
    ON maintenance_records FOR INSERT
    TO authenticated
    WITH CHECK (is_manager_or_above());

CREATE POLICY "maintenance_update_assigned"
    ON maintenance_records FOR UPDATE
    TO authenticated
    USING (
        assigned_to = auth.uid()
        OR is_manager_or_above()
    );

CREATE POLICY "maintenance_delete_manager"
    ON maintenance_records FOR DELETE
    TO authenticated
    USING (is_manager_or_above());

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- AUDIT LOG RLS POLICIES
-- Only managers+ can read. Service role can insert.
-- No updates or deletes (append-only).
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "audit_log_select_manager"
    ON audit_log FOR SELECT
    TO authenticated
    USING (is_manager_or_above());

CREATE POLICY "audit_log_insert_service"
    ON audit_log FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

CREATE POLICY "audit_log_insert_auth"
    ON audit_log FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Create storage buckets for photo uploads

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('photos-compressed', 'photos-compressed', TRUE, 10485760,
     ARRAY['image/jpeg', 'image/png', 'image/webp']::TEXT[]),
    ('photos-original', 'photos-original', FALSE, 20971520,
     ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::TEXT[]),
    ('avatars', 'avatars', TRUE, 5242880,
     ARRAY['image/jpeg', 'image/png', 'image/webp']::TEXT[])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies

-- Photos compressed: anyone can read (public), authenticated can upload
CREATE POLICY "photos_compressed_select"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'photos-compressed');

CREATE POLICY "photos_compressed_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'photos-compressed');

-- Photos original: only authenticated users can read and upload
CREATE POLICY "photos_original_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'photos-original');

CREATE POLICY "photos_original_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'photos-original');

-- Avatars: anyone can read, users can upload their own
CREATE POLICY "avatars_select"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "avatars_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================
-- Enable realtime for tables that the frontend subscribes to.
-- The useFleetRealtime hook listens to scan_events and assets.

ALTER PUBLICATION supabase_realtime ADD TABLE scan_events;
ALTER PUBLICATION supabase_realtime ADD TABLE assets;
ALTER PUBLICATION supabase_realtime ADD TABLE hazard_alerts;

-- ============================================================================
-- SEED DATA: Default depots (Western Australia fleet)
-- ============================================================================

INSERT INTO depots (name, code, latitude, longitude, is_active) VALUES
    ('Perth Depot', 'PER', -31.9505, 115.8605, TRUE),
    ('Kalgoorlie Depot', 'KAL', -30.7489, 121.4660, TRUE),
    ('Geraldton Depot', 'GER', -28.7745, 114.6150, TRUE),
    ('Port Hedland Depot', 'PHD', -20.3106, 118.5753, TRUE),
    ('Karratha Depot', 'KAR', -20.7364, 116.8463, TRUE),
    ('Bunbury Depot', 'BUN', -33.3271, 115.6414, TRUE),
    ('Albany Depot', 'ALB', -35.0269, 117.8837, TRUE),
    ('Esperance Depot', 'ESP', -33.8614, 121.8919, TRUE)
ON CONFLICT DO NOTHING;
