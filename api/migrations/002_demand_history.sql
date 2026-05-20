-- Task 1.1 — Histórico de alterações de demandas + SLA
CREATE TABLE IF NOT EXISTS demand_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id   VARCHAR(20) NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  field_name  TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_demand_history_demand ON demand_history(demand_id, changed_at DESC);

ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS sla_hours INT,
  ADD COLUMN IF NOT EXISTS first_proposal_at TIMESTAMPTZ;

-- Adicionar segment para filtros avançados (alias de category quando ausente)
ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS segment VARCHAR(100);

-- backfill: aplica sla_hours baseado em urgency para registros antigos
UPDATE demands SET sla_hours = CASE
  WHEN urgency = 'Baixa'    THEN 72
  WHEN urgency = 'Media'    THEN 48
  WHEN urgency = 'Alta'     THEN 24
  WHEN urgency = 'Critica'  THEN 8
  ELSE 48
END
WHERE sla_hours IS NULL;
