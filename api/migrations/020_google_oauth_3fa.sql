-- OAuth providers
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local';

-- 3FA (terceiro fator via e-mail)
ALTER TABLE users ADD COLUMN IF NOT EXISTS three_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Códigos temporários de 3FA (e-mail OTP)
CREATE TABLE IF NOT EXISTS three_fa_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code        VARCHAR(8) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_3fa_codes_user ON three_fa_codes(user_id, expires_at);
