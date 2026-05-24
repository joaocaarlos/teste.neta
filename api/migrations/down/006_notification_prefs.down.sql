-- Rollback de 006_notification_prefs.sql
DROP INDEX IF EXISTS idx_notifications_group;

ALTER TABLE notifications
  DROP COLUMN IF EXISTS group_key,
  DROP COLUMN IF EXISTS count;

ALTER TABLE notification_prefs
  DROP COLUMN IF EXISTS email_enabled,
  DROP COLUMN IF EXISTS in_app_enabled,
  DROP COLUMN IF EXISTS push_enabled,
  DROP COLUMN IF EXISTS digest_frequency;
