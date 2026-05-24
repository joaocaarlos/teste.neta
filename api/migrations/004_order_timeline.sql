-- Task 3.1 — Timeline, SLA e anexos por etapa em pedidos
CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key VARCHAR(500) NOT NULL UNIQUE,
  original_name VARCHAR(300) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 VARCHAR(64),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(40),
  entity_id VARCHAR(50),
  public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_updates (
  id BIGSERIAL PRIMARY KEY,
  order_id VARCHAR(20) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  icon VARCHAR(10) DEFAULT 'note',
  message TEXT NOT NULL,
  pct_at SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE order_updates
  ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS sla_status TEXT;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_status TEXT NOT NULL DEFAULT 'on_time';

CREATE INDEX IF NOT EXISTS idx_order_updates_order ON order_updates(order_id, created_at DESC);
