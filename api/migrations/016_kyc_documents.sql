-- Migration 016: KYC Documents
-- Creates kyc_documents table for company identity verification

CREATE TABLE IF NOT EXISTS kyc_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  doc_type     TEXT NOT NULL CHECK (doc_type IN ('cnpj_card','social_contract','id_front','id_back','selfie','other')),
  file_id      UUID NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_id  UUID REFERENCES users(id),
  review_note  TEXT,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_company ON kyc_documents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_kyc_pending  ON kyc_documents(status) WHERE status='pending';
