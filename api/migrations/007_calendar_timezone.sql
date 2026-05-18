-- Task 7.1 — Timezone correto para calendar + slots por intervalo (bulk)
-- O schema atual usa (year, month, day, turn). Adicionamos colunas opcionais
-- start_at/end_at para suportar slots em horários específicos.
ALTER TABLE calendar_slots
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at   TIMESTAMPTZ;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

CREATE INDEX IF NOT EXISTS idx_calslots_start_at ON calendar_slots(machine_id, start_at);
