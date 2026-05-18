-- Rollback de 013_stripe_connect.sql
DROP INDEX IF EXISTS idx_companies_stripe_account;

ALTER TABLE companies
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_charges_enabled,
  DROP COLUMN IF EXISTS stripe_payouts_enabled,
  DROP COLUMN IF EXISTS stripe_details_submitted,
  DROP COLUMN IF EXISTS stripe_synced_at;
