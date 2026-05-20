-- Migration 015: Messages and Conversations
-- Enhances existing messaging tables; original schema already created conversations and messages.

ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add missing columns to the existing conversations table (which uses varchar(30) id)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add missing columns to the existing messages table
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;

-- conversation_participants: create only if it doesn't exist yet
-- Uses VARCHAR(30) to match existing conversations.id type
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id VARCHAR(30) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  company_id      UUID        NOT NULL REFERENCES companies(id)      ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, company_id)
);

-- message_reads: create only if it doesn't exist yet
CREATE TABLE IF NOT EXISTS message_reads (
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID   NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conv     ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_participants ON conversation_participants(company_id);
