-- Rollback de 009_kyc_columns.sql
DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
DROP FUNCTION IF EXISTS companies_set_updated_at();
DROP INDEX IF EXISTS idx_companies_kyc_verified;

ALTER TABLE companies
  DROP COLUMN IF EXISTS kyc_verified_at,
  DROP COLUMN IF EXISTS kyc_source,
  DROP COLUMN IF EXISTS updated_at;
