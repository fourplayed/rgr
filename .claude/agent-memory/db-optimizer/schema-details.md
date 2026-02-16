# Schema Details

## Enum Types
```sql
user_role: driver, mechanic, manager, superuser
asset_status: active, maintenance, out_of_service, decommissioned
asset_category: trailer, dolly
scan_type: qr_scan, manual_entry, nfc_scan, gps_auto
photo_type: freight, damage, inspection, general
hazard_severity: critical, high, medium, low
hazard_status: active, acknowledged, resolved, dismissed
review_outcome: confirmed, false_positive, needs_training
maintenance_status: scheduled, in_progress, completed, cancelled
maintenance_priority: low, medium, high, critical
```

## Table: depots
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| name | VARCHAR(100) | NOT NULL |
| code | VARCHAR(20) | NOT NULL UNIQUE |
| address | TEXT | |
| latitude | DOUBLE PRECISION | |
| longitude | DOUBLE PRECISION | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Table: profiles
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID PK | FK -> auth.users(id) ON DELETE CASCADE |
| email | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(200) | NOT NULL |
| role | user_role | NOT NULL DEFAULT 'driver' |
| phone | VARCHAR(20) | |
| avatar_url | TEXT | |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| employee_id | VARCHAR(50) | |
| depot | VARCHAR(100) | free-text depot name |
| depot_id | UUID | FK -> depots(id) |
| last_login_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Table: assets
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| asset_number | VARCHAR(20) | NOT NULL UNIQUE |
| category | asset_category | NOT NULL |
| subtype | VARCHAR(50) | |
| status | asset_status | NOT NULL DEFAULT 'active' |
| description | TEXT | |
| year_manufactured | SMALLINT | |
| make | VARCHAR(100) | |
| model | VARCHAR(100) | |
| vin | VARCHAR(50) | |
| registration_number | VARCHAR(20) | |
| registration_expiry | DATE | |
| last_latitude | DOUBLE PRECISION | denormalized from scan |
| last_longitude | DOUBLE PRECISION | denormalized from scan |
| last_location_accuracy | REAL | GPS accuracy meters |
| last_location_updated_at | TIMESTAMPTZ | |
| last_scanned_by | UUID | FK -> profiles(id) |
| assigned_depot_id | UUID | FK -> depots(id) |
| assigned_driver_id | UUID | FK -> profiles(id) |
| qr_code_data | TEXT | |
| qr_generated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | soft delete |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Table: scan_events
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| asset_id | UUID | NOT NULL FK -> assets(id) ON DELETE CASCADE |
| scanned_by | UUID | FK -> profiles(id) |
| scan_type | scan_type | NOT NULL DEFAULT 'qr_scan' |
| latitude | DOUBLE PRECISION | |
| longitude | DOUBLE PRECISION | |
| accuracy | REAL | |
| altitude | REAL | |
| heading | REAL | |
| speed | REAL | |
| location_description | VARCHAR(255) | |
| device_info | JSONB | |
| raw_scan_data | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Table: photos
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| asset_id | UUID | FK -> assets(id) ON DELETE SET NULL |
| scan_event_id | UUID | FK -> scan_events(id) ON DELETE SET NULL |
| uploaded_by | UUID | NOT NULL FK -> profiles(id) |
| photo_type | photo_type | NOT NULL DEFAULT 'general' |
| storage_path | TEXT | NOT NULL |
| thumbnail_path | TEXT | |
| filename | VARCHAR(255) | |
| file_size | INTEGER | |
| mime_type | VARCHAR(50) | DEFAULT 'image/jpeg' |
| width | INTEGER | |
| height | INTEGER | |
| is_analyzed | BOOLEAN | NOT NULL DEFAULT FALSE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Table: freight_analysis
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| photo_id | UUID | NOT NULL FK -> photos(id) ON DELETE CASCADE |
| asset_id | UUID | FK -> assets(id) ON DELETE SET NULL |
| analyzed_by_user | UUID | FK -> profiles(id) |
| primary_category | VARCHAR(100) | |
| secondary_categories | TEXT[] | |
| description | TEXT | |
| confidence | REAL | 0.0 to 1.0 |
| estimated_weight_kg | REAL | |
| load_distribution_score | REAL | 0.0 to 1.0 |
| restraint_count | INTEGER | |
| hazard_count | INTEGER | NOT NULL DEFAULT 0 |
| max_severity | hazard_severity | |
| requires_acknowledgment | BOOLEAN | NOT NULL DEFAULT FALSE |
| blocked_from_departure | BOOLEAN | NOT NULL DEFAULT FALSE |
| raw_response | JSONB | |
| model_version | VARCHAR(50) | |
| processing_duration_ms | INTEGER | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Table: hazard_alerts
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| freight_analysis_id | UUID | NOT NULL FK -> freight_analysis(id) ON DELETE CASCADE |
| photo_id | UUID | NOT NULL FK -> photos(id) ON DELETE CASCADE |
| asset_id | UUID | FK -> assets(id) ON DELETE SET NULL |
| scan_event_id | UUID | FK -> scan_events(id) ON DELETE SET NULL |
| hazard_rule_id | VARCHAR(50) | |
| hazard_type | VARCHAR(100) | NOT NULL |
| severity | hazard_severity | NOT NULL |
| confidence_score | REAL | NOT NULL DEFAULT 0.0 |
| description | TEXT | NOT NULL |
| evidence_points | TEXT[] | DEFAULT '{}' |
| recommended_actions | TEXT[] | DEFAULT '{}' |
| location_in_image | VARCHAR(100) | |
| bounding_box | JSONB | |
| status | hazard_status | NOT NULL DEFAULT 'active' |
| acknowledged_by | UUID | FK -> profiles(id) |
| acknowledged_at | TIMESTAMPTZ | |
| acknowledgment_type | VARCHAR(50) | |
| manager_review_by | UUID | FK -> profiles(id) |
| manager_review_at | TIMESTAMPTZ | |
| review_outcome | review_outcome | |
| review_notes | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Table: maintenance_records
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| asset_id | UUID | NOT NULL FK -> assets(id) ON DELETE CASCADE |
| reported_by | UUID | FK -> profiles(id) |
| assigned_to | UUID | FK -> profiles(id) |
| completed_by | UUID | FK -> profiles(id) |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | |
| priority | maintenance_priority | NOT NULL DEFAULT 'medium' |
| status | maintenance_status | NOT NULL DEFAULT 'scheduled' |
| maintenance_type | VARCHAR(50) | |
| scheduled_date | DATE | |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| due_date | DATE | |
| estimated_cost | DECIMAL(10,2) | |
| actual_cost | DECIMAL(10,2) | |
| parts_used | JSONB | |
| hazard_alert_id | UUID | FK -> hazard_alerts(id) |
| scan_event_id | UUID | FK -> scan_events(id) |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Table: audit_log
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID | FK -> profiles(id) |
| action | VARCHAR(100) | NOT NULL |
| table_name | VARCHAR(50) | |
| record_id | UUID | |
| old_values | JSONB | |
| new_values | JSONB | |
| ip_address | INET | |
| user_agent | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

## Triggers
1. `set_updated_at_*` - Auto-updates `updated_at` on UPDATE for: profiles, depots, assets, freight_analysis, hazard_alerts, maintenance_records
2. `on_auth_user_created` - Creates profile row when auth.users row inserted
3. `on_scan_event_update_asset_location` - Updates denormalized location on assets when scan inserted

## Indexes (32 custom)
### profiles
- idx_profiles_email(email)
- idx_profiles_role(role) WHERE is_active=TRUE
- idx_profiles_depot(depot) WHERE is_active=TRUE
- idx_profiles_employee_id(employee_id) WHERE NOT NULL

### assets
- idx_assets_active_status(status, category) WHERE deleted_at IS NULL
- idx_assets_map(last_latitude, last_longitude) WHERE deleted_at IS NULL AND coords NOT NULL
- idx_assets_outstanding(last_location_updated_at) WHERE deleted_at IS NULL AND status IN (active, maintenance)
- idx_assets_depot(assigned_depot_id) WHERE deleted_at IS NULL
- idx_assets_driver(assigned_driver_id) WHERE deleted_at IS NULL AND NOT NULL
- idx_assets_rego_expiry(registration_expiry) WHERE deleted_at IS NULL AND NOT NULL

### scan_events
- idx_scan_events_recent(created_at DESC)
- idx_scan_events_asset(asset_id, created_at DESC)
- idx_scan_events_user(scanned_by, created_at DESC) WHERE NOT NULL

### photos
- idx_photos_asset(asset_id, created_at DESC) WHERE NOT NULL
- idx_photos_uploader(uploaded_by, created_at DESC)
- idx_photos_unanalyzed(created_at) WHERE is_analyzed=FALSE AND photo_type='freight'

### freight_analysis
- idx_freight_analysis_photo(photo_id)
- idx_freight_analysis_asset(asset_id, created_at DESC) WHERE NOT NULL
- idx_freight_analysis_created(created_at DESC)

### hazard_alerts
- idx_hazard_alerts_pending(severity, created_at DESC) WHERE status='active'
- idx_hazard_alerts_reviewed(review_outcome) WHERE NOT NULL
- idx_hazard_alerts_trends(created_at DESC, severity)
- idx_hazard_alerts_analysis(freight_analysis_id)
- idx_hazard_alerts_asset(asset_id, created_at DESC) WHERE NOT NULL
- idx_hazard_alerts_photo(photo_id)

### maintenance_records
- idx_maintenance_asset_active(asset_id, scheduled_date) WHERE status IN (scheduled, in_progress)
- idx_maintenance_overdue(due_date) WHERE status='scheduled' AND NOT NULL
- idx_maintenance_assigned(assigned_to, status) WHERE NOT NULL AND status IN (scheduled, in_progress)
- idx_maintenance_history(asset_id, created_at DESC)

### audit_log
- idx_audit_log_user(user_id, created_at DESC) WHERE NOT NULL
- idx_audit_log_table(table_name, record_id, created_at DESC)
- idx_audit_log_action(action, created_at DESC)

## Storage Buckets
- photos-compressed (public, 10MB limit, jpeg/png/webp)
- photos-original (private, 20MB limit, jpeg/png/webp/heic)
- avatars (public, 5MB limit, jpeg/png/webp)

## Realtime Publications
- scan_events, assets, hazard_alerts added to supabase_realtime
