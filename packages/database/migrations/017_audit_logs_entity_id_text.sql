-- 017_audit_logs_entity_id_text.sql
-- Allow non-UUID entity identifiers (such as email template keys like 'welcome_heirloom')
-- to be recorded in audit_logs without Postgres UUID cast failures.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'audit_logs'
      AND column_name = 'entity_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE audit_logs
      ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;
  END IF;
END $$;
