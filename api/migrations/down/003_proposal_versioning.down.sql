-- Rollback de 003_proposal_versioning.sql
DROP INDEX IF EXISTS idx_proposals_parent;
DROP INDEX IF EXISTS idx_templates_company;
DROP TABLE IF EXISTS proposal_templates;

ALTER TABLE proposals
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS parent_id,
  DROP COLUMN IF EXISTS replaced_by;
