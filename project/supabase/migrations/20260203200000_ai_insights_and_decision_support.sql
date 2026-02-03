/*
  # AI Insights & Decision Support (additive only)
  - ai_insights: JSONB for category/priority reasons, intent signals, confidence
  - No changes to existing columns or constraints
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'ai_insights'
  ) THEN
    ALTER TABLE requests ADD COLUMN ai_insights jsonb;
  END IF;
END $$;

COMMENT ON COLUMN requests.ai_insights IS 'AI explanation: category_reason, priority_reason, intent_signals[], confidence_score, suggested_action, risk_level, business_impact';
