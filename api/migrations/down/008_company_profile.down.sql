-- Rollback de 008_company_profile.sql
DROP INDEX IF EXISTS idx_companies_slug;
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_slug_unique;

ALTER TABLE companies
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS public_profile_enabled,
  DROP COLUMN IF EXISTS gallery_ids,
  DROP COLUMN IF EXISTS certifications,
  DROP COLUMN IF EXISTS specialties;
