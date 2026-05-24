-- Task 5.1 — Prefs de notificações + agrupamento
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  prefs JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_prefs
  ADD COLUMN IF NOT EXISTS email_enabled    BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS in_app_enabled   BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS push_enabled     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS digest_frequency TEXT    DEFAULT 'realtime';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS group_key TEXT,
  ADD COLUMN IF NOT EXISTS count     INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_notifications_group
  ON notifications(user_id, group_key, lida);
