-- #19 Escrow payment columns on orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS platform_fee_amount INTEGER,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- #19/#21 Dispute enhancements
ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS opened_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_decision TEXT,
  ADD COLUMN IF NOT EXISTS admin_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';

-- #18 NDA enhancements (align with digital NDA flow)
ALTER TABLE ndas
  ADD COLUMN IF NOT EXISTS supplier_company_id UUID REFERENCES companies(id),
  ADD COLUMN IF NOT EXISTS document_hash TEXT,
  ADD COLUMN IF NOT EXISTS signed_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS signed_ip TEXT,
  ADD COLUMN IF NOT EXISTS signed_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- #23 Marketplace filter columns on companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS processes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS materials TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications_list TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monthly_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_badge TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS avg_order_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS available_from DATE,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- #17 Demand matching: process and location columns
ALTER TABLE demands
  ADD COLUMN IF NOT EXISTS process TEXT,
  ADD COLUMN IF NOT EXISTS material TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS cert_required TEXT,
  ADD COLUMN IF NOT EXISTS nda_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- #23 Indexes for marketplace filtering
CREATE INDEX IF NOT EXISTS idx_companies_processes ON companies USING GIN(processes);
CREATE INDEX IF NOT EXISTS idx_companies_materials ON companies USING GIN(materials);
CREATE INDEX IF NOT EXISTS idx_companies_trust_score ON companies(trust_score DESC);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='state') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_companies_state ON companies(state)';
  END IF;
END $$;

-- #20 Machines available_capacity column
ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS available_capacity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_capacity INTEGER DEFAULT 0;
