-- Rollback de 007_calendar_timezone.sql
DROP INDEX IF EXISTS idx_calslots_start_at;

ALTER TABLE calendar_slots
  DROP COLUMN IF EXISTS start_at,
  DROP COLUMN IF EXISTS end_at;

ALTER TABLE companies
  DROP COLUMN IF EXISTS timezone;
