-- Rollback de 002_demand_history.sql
DROP INDEX IF EXISTS idx_demand_history_demand;
DROP TABLE IF EXISTS demand_history;

ALTER TABLE demands
  DROP COLUMN IF EXISTS sla_hours,
  DROP COLUMN IF EXISTS first_proposal_at;
