-- Task 9 — Colunas de KYC e auditoria para companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS kyc_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_source       TEXT,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Trigger para manter updated_at coerente
CREATE OR REPLACE FUNCTION companies_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION companies_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_companies_kyc_verified ON companies(kyc_verified_at);
