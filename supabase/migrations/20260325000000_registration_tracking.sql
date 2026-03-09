-- Registration Tracking: DOT lookup columns, push tokens, notification log, rego lookup log
-- Part of the Registration Tracking feature: required rego, WA DOT auto-lookup, push reminders

-- ── 1a. New columns on assets for DOT lookup tracking ──
ALTER TABLE assets ADD COLUMN IF NOT EXISTS dot_lookup_status VARCHAR(20);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS dot_lookup_at TIMESTAMPTZ;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS dot_lookup_failures SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS registration_overdue BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN assets.dot_lookup_status IS 'DOT scrape status: pending, success, failed, captcha_blocked';
COMMENT ON COLUMN assets.dot_lookup_at IS 'Timestamp of last DOT lookup attempt';
COMMENT ON COLUMN assets.dot_lookup_failures IS 'Consecutive DOT lookup failure count';
COMMENT ON COLUMN assets.registration_overdue IS 'True if registration_expiry < NOW and DOT confirms not renewed';

-- Index for daily cron queries on registration expiry
CREATE INDEX IF NOT EXISTS idx_assets_registration_expiry
  ON assets (registration_expiry)
  WHERE deleted_at IS NULL AND registration_expiry IS NOT NULL;

-- ── 1b. push_tokens table ──
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_id TEXT NOT NULL,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- RLS for push_tokens: users manage their own, service_role reads all
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_tokens_select_own ON push_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY push_tokens_insert_own ON push_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY push_tokens_update_own ON push_tokens
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY push_tokens_delete_own ON push_tokens
  FOR DELETE USING (user_id = auth.uid());

-- Service role bypass (for edge functions reading all tokens)
CREATE POLICY push_tokens_service_role ON push_tokens
  FOR ALL USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  );

-- ── 1c. notification_log table (deduplication + audit) ──
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  notification_type VARCHAR(30) NOT NULL,
  target_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, notification_type, target_date)
);

-- RLS: service_role only
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_log_service_role ON notification_log
  FOR ALL USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  );

-- ── 1d. rego_lookup_log table (debugging) ──
CREATE TABLE IF NOT EXISTS rego_lookup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  registration_number VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  expiry_date DATE,
  raw_response TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: service_role only
ALTER TABLE rego_lookup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY rego_lookup_log_service_role ON rego_lookup_log
  FOR ALL USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  );

-- Index for querying lookup history per asset
CREATE INDEX IF NOT EXISTS idx_rego_lookup_log_asset
  ON rego_lookup_log (asset_id, created_at DESC);
