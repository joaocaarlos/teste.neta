-- Tabela de idempotência para webhooks Stripe
-- Previne processamento duplicado de eventos
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id      TEXT PRIMARY KEY,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para limpeza automática de eventos antigos
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
  ON stripe_events(processed_at);

-- Tabela para tentativas de pagamento (histórico de retrys)
CREATE TABLE IF NOT EXISTS transaction_payment_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  TEXT NOT NULL REFERENCES transactions(id),
  provider        TEXT NOT NULL DEFAULT 'stripe',
  provider_ref    TEXT,
  status          TEXT NOT NULL,
  amount          NUMERIC(12,2) DEFAULT 0,
  raw             JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_id, provider_ref)
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_txn
  ON transaction_payment_attempts(transaction_id);

-- Colunas extras em transactions para rastreio de pagamento
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_provider         TEXT,
  ADD COLUMN IF NOT EXISTS payment_method           TEXT,
  ADD COLUMN IF NOT EXISTS provider_session_id      TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at                  TIMESTAMPTZ;

-- Limpeza automática de eventos Stripe > 90 dias (cron pode usar isso)
-- Ou pode-se criar uma policy de retenção via cron
COMMENT ON TABLE stripe_events IS
  'Idempotência de webhooks Stripe. Eventos processados ficam aqui 90 dias.';
