-- Stripe Connect — split payment para fornecedores
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS stripe_account_id        TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_synced_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_stripe_account
  ON companies(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

COMMENT ON COLUMN companies.stripe_account_id IS
  'Stripe Connect Express account ID (acct_xxx). Necessário para receber split payments.';
