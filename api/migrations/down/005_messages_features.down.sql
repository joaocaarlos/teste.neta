-- Rollback de 005_messages_features.sql
DROP INDEX IF EXISTS idx_messages_fts;
DROP TABLE IF EXISTS message_reads;

ALTER TABLE messages
  DROP COLUMN IF EXISTS attachment_id,
  DROP COLUMN IF EXISTS edited_at,
  DROP COLUMN IF EXISTS deleted_at;
