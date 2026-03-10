-- ============================================================================
-- submit_hazard_feedback() — atomic bulk review of hazard alerts
--
-- Replaces N sequential UPDATE calls from submitAnalysisFeedback() in
-- packages/shared/src/services/supabase/hazards.ts with a single RPC call.
--
-- Uses SECURITY INVOKER to respect the existing hazard_alerts_update_manager
-- RLS policy (manager-only UPDATE access).
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_hazard_feedback(
  p_analysis_id   UUID,
  p_reviewer_id   UUID,
  p_hazard_types  TEXT[],
  p_outcomes      TEXT[],
  p_review_notes  TEXT DEFAULT NULL
)
RETURNS INTEGER  -- number of rows actually updated
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_now   TIMESTAMPTZ := clock_timestamp();
  v_count INTEGER;
BEGIN
  -- Validate parallel arrays
  IF COALESCE(array_length(p_hazard_types, 1), 0)
     != COALESCE(array_length(p_outcomes, 1), 0)
  THEN
    RAISE EXCEPTION 'hazard_types and outcomes arrays must have equal length';
  END IF;

  -- Empty arrays = no-op
  IF COALESCE(array_length(p_hazard_types, 1), 0) = 0 THEN
    RETURN 0;
  END IF;

  -- Validate all outcomes are recognised values before updating
  IF EXISTS (
    SELECT 1 FROM unnest(p_outcomes) AS o(val)
    WHERE val NOT IN ('confirmed', 'false_positive', 'needs_training')
  ) THEN
    RAISE EXCEPTION 'Invalid outcome value. Must be one of: confirmed, false_positive, needs_training';
  END IF;

  -- Normalize hazard_type server-side (lowercase, spaces → underscores)
  -- to match DB convention and prevent client-side mismatch
  UPDATE hazard_alerts ha
  SET
    review_outcome     = u.outcome,
    manager_review_at  = v_now,
    manager_review_by  = p_reviewer_id,
    review_notes       = p_review_notes,
    updated_at         = v_now
  FROM unnest(p_hazard_types, p_outcomes) AS u(hazard_type, outcome)
  WHERE ha.freight_analysis_id = p_analysis_id
    AND ha.hazard_type = lower(replace(u.hazard_type, ' ', '_'));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_hazard_feedback(UUID, UUID, TEXT[], TEXT[], TEXT)
  TO authenticated;
