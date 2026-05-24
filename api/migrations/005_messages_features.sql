-- Task 4.1 — Read receipts multi-participantes, edit/delete, anexos, FTS
CREATE TABLE IF NOT EXISTS message_reads (
  message_id BIGINT      NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_messages_fts
  ON messages USING GIN(to_tsvector('portuguese', COALESCE(msg, '')));
