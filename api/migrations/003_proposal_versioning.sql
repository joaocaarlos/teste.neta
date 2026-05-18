-- Task 2.1 — Versionamento de propostas + templates
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_id VARCHAR(20) REFERENCES proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replaced_by VARCHAR(20) REFERENCES proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_parent ON proposals(parent_id);

CREATE TABLE IF NOT EXISTS proposal_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  process_desc    TEXT,
  lead_time_days  INT,
  certifications  TEXT[],
  capacity_m3     NUMERIC,
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_templates_company ON proposal_templates(company_id);
