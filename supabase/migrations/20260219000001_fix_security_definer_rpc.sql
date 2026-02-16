-- ============================================================================
-- C2: Remove SECURITY DEFINER from RPC functions
--
-- Both functions previously bypassed RLS entirely. Changed to SECURITY INVOKER
-- (the default) so they respect row-level policies. The underlying tables
-- already allow SELECT for all authenticated users, so behavior is unchanged
-- today but future-safe if visibility is ever scoped.
-- ============================================================================

-- Recreate get_fleet_statistics without SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_fleet_statistics()
RETURNS JSON
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'total_assets',    COUNT(*),
    'serviced',        COUNT(*) FILTER (WHERE status = 'serviced'),
    'maintenance',     COUNT(*) FILTER (WHERE status = 'maintenance'),
    'out_of_service',  COUNT(*) FILTER (WHERE status = 'out_of_service'),
    'trailer_count',   COUNT(*) FILTER (WHERE category = 'trailer'),
    'dolly_count',     COUNT(*) FILTER (WHERE category = 'dolly')
  )
  FROM assets
  WHERE deleted_at IS NULL;
$$;

-- M3: Rewrite get_hazard_review_stats — consolidate 7 scans into 2
-- One pass over hazard_alerts, one over freight_analysis
CREATE OR REPLACE FUNCTION get_hazard_review_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  total_photos_analyzed BIGINT;
  pending_count BIGINT;
  total_reviewed BIGINT;
  confirmed_count BIGINT;
  false_positive_count BIGINT;
  sev_critical BIGINT;
  sev_high BIGINT;
  sev_medium BIGINT;
  sev_low BIGINT;
  ai_accuracy NUMERIC;
  false_positive_rate NUMERIC;
BEGIN
  -- Single pass over freight_analysis
  SELECT COUNT(*) INTO total_photos_analyzed FROM freight_analysis;

  -- Single pass over hazard_alerts for ALL counts
  SELECT
    COUNT(*) FILTER (WHERE status = 'active'),
    COUNT(*) FILTER (WHERE review_outcome IS NOT NULL),
    COUNT(*) FILTER (WHERE review_outcome = 'confirmed'),
    COUNT(*) FILTER (WHERE review_outcome = 'false_positive'),
    COUNT(*) FILTER (WHERE status = 'active' AND severity = 'critical'),
    COUNT(*) FILTER (WHERE status = 'active' AND severity = 'high'),
    COUNT(*) FILTER (WHERE status = 'active' AND severity = 'medium'),
    COUNT(*) FILTER (WHERE status = 'active' AND severity = 'low')
  INTO
    pending_count, total_reviewed, confirmed_count, false_positive_count,
    sev_critical, sev_high, sev_medium, sev_low
  FROM hazard_alerts;

  -- Calculate rates
  IF total_reviewed > 0 THEN
    ai_accuracy := ROUND((confirmed_count::NUMERIC / total_reviewed) * 100, 1);
    false_positive_rate := ROUND((false_positive_count::NUMERIC / total_reviewed) * 100, 1);
  ELSE
    ai_accuracy := 0;
    false_positive_rate := 0;
  END IF;

  result := json_build_object(
    'total_photos_analyzed', total_photos_analyzed,
    'pending_reviews',       pending_count,
    'ai_accuracy',           ai_accuracy,
    'false_positive_rate',   false_positive_rate,
    'severity_breakdown',    json_build_object(
      'critical', sev_critical,
      'high',     sev_high,
      'medium',   sev_medium,
      'low',      sev_low
    )
  );

  RETURN result;
END;
$$;
