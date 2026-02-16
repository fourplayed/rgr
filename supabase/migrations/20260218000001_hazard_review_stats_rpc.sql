-- ============================================================================
-- get_hazard_review_stats() — server-side aggregation replacing 4 sequential
-- client-side queries for hazard review statistics.
-- Returns a single JSON object with all review stats.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_hazard_review_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  total_photos_analyzed BIGINT;
  pending_count BIGINT;
  total_reviewed BIGINT;
  confirmed_count BIGINT;
  false_positive_count BIGINT;
  ai_accuracy NUMERIC;
  false_positive_rate NUMERIC;
BEGIN
  -- Total photos analyzed
  SELECT COUNT(*) INTO total_photos_analyzed FROM freight_analysis;

  -- Pending hazard alerts
  SELECT COUNT(*) INTO pending_count FROM hazard_alerts WHERE status = 'active';

  -- Review outcome counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE review_outcome = 'confirmed'),
    COUNT(*) FILTER (WHERE review_outcome = 'false_positive')
  INTO total_reviewed, confirmed_count, false_positive_count
  FROM hazard_alerts
  WHERE review_outcome IS NOT NULL;

  -- Calculate rates
  IF total_reviewed > 0 THEN
    ai_accuracy := ROUND((confirmed_count::NUMERIC / total_reviewed) * 100, 1);
    false_positive_rate := ROUND((false_positive_count::NUMERIC / total_reviewed) * 100, 1);
  ELSE
    ai_accuracy := 0;
    false_positive_rate := 0;
  END IF;

  -- Severity breakdown of active alerts
  SELECT json_build_object(
    'total_photos_analyzed', total_photos_analyzed,
    'pending_reviews',       pending_count,
    'ai_accuracy',           ai_accuracy,
    'false_positive_rate',   false_positive_rate,
    'severity_breakdown',    json_build_object(
      'critical', (SELECT COUNT(*) FROM hazard_alerts WHERE status = 'active' AND severity = 'critical'),
      'high',     (SELECT COUNT(*) FROM hazard_alerts WHERE status = 'active' AND severity = 'high'),
      'medium',   (SELECT COUNT(*) FROM hazard_alerts WHERE status = 'active' AND severity = 'medium'),
      'low',      (SELECT COUNT(*) FROM hazard_alerts WHERE status = 'active' AND severity = 'low')
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_hazard_review_stats() TO authenticated;
