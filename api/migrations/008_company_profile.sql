-- Task 8.1 — Perfil público de empresas
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS slug                    TEXT,
  ADD COLUMN IF NOT EXISTS public_profile_enabled  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gallery_ids             UUID[],
  ADD COLUMN IF NOT EXISTS certifications          TEXT[],
  ADD COLUMN IF NOT EXISTS specialties             TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_slug_unique'
  ) THEN
    ALTER TABLE companies ADD CONSTRAINT companies_slug_unique UNIQUE (slug);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_slug
  ON companies(slug) WHERE slug IS NOT NULL;

-- Backfill simples de slug para empresas existentes
UPDATE companies
SET slug = lower(
  regexp_replace(
    regexp_replace(COALESCE(name, 'empresa'), '[^A-Za-z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  )
) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL;
