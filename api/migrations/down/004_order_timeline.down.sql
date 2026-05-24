-- Rollback de 004_order_timeline.sql
DROP INDEX IF EXISTS idx_order_updates_order;

ALTER TABLE order_updates
  DROP COLUMN IF EXISTS attachment_id,
  DROP COLUMN IF EXISTS stage,
  DROP COLUMN IF EXISTS sla_status;

ALTER TABLE orders
  DROP COLUMN IF EXISTS deadline,
  DROP COLUMN IF EXISTS sla_status;
