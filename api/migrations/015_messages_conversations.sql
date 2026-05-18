-- Migration 015: Messages and Conversations
-- Adds deleted_at to uploaded_files and creates conversation/messaging tables

ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   VARCHAR(20) REFERENCES orders(id) ON DELETE CASCADE,
  demand_id  UUID REFERENCES demands(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conv_must_have_context CHECK (order_id IS NOT NULL OR demand_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id)      ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, company_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id)          ON DELETE SET NULL,
  msg             TEXT NOT NULL CHECK (char_length(msg) <= 4000),
  attachment_id   UUID REFERENCES uploaded_files(id)          ON DELETE SET NULL,
  edited_at       TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_reads (
  message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    UUID   NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conv     ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_fts      ON messages USING GIN(to_tsvector('portuguese', COALESCE(msg,'')));
CREATE INDEX IF NOT EXISTS idx_conv_participants ON conversation_participants(company_id);
