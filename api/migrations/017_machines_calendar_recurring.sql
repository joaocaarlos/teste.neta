-- Task 1: machines
CREATE TABLE IF NOT EXISTS machines (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  type               TEXT NOT NULL,
  capacity           NUMERIC,
  available_capacity NUMERIC,
  maintenance_until  DATE,
  description        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_machines_company ON machines(company_id);

-- Task 2: calendar_slots
CREATE TABLE IF NOT EXISTS calendar_slots (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  year       SMALLINT NOT NULL,
  month      SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  day        SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  turn       TEXT NOT NULL CHECK (turn IN ('morning','afternoon','night','allday')),
  status     TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','booked','maintenance','blocked')),
  order_id   VARCHAR(20) REFERENCES orders(id) ON DELETE SET NULL,
  start_at   TIMESTAMPTZ,
  end_at     TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, machine_id, year, month, day, turn)
);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calendar_slots' AND column_name='company_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_calslots_company ON calendar_slots(company_id, year, month)';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_calslots_start_at ON calendar_slots(machine_id, start_at);

-- Task 4: recurring_orders
CREATE TABLE IF NOT EXISTS recurring_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  base_order_id       VARCHAR(20) REFERENCES orders(id),
  description         TEXT NOT NULL,
  frequency           TEXT NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly','quarterly')),
  next_due_at         DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  auto_create         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_buyer ON recurring_orders(buyer_company_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_next  ON recurring_orders(next_due_at) WHERE status='active';

-- Machines, calendar_slots, recurring_orders baseline tables
