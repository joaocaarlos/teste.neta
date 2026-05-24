-- NPS surveys triggered after order completion
CREATE TABLE IF NOT EXISTS nps_surveys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('demandante','fornecedor')),
  score       SMALLINT CHECK (score BETWEEN 0 AND 10),
  comment     TEXT,
  answered_at TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE (order_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_nps_user_pending ON nps_surveys(user_id, answered_at) WHERE answered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_nps_order ON nps_surveys(order_id);
