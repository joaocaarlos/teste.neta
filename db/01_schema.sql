-- ============================================================
--  CapaCity -- Schema PostgreSQL 16
--  Gerado em: 2026-05-06
-- ============================================================

-- Extensoes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- busca textual por similaridade

-- ENUMS
CREATE TYPE user_role         AS ENUM ('demandante','fornecedor','admin');
CREATE TYPE company_type      AS ENUM ('Fornecedor','Demandante');
CREATE TYPE company_status    AS ENUM ('Pendente','Em analise','Aprovado','Reprovado','Suspenso');
CREATE TYPE demand_status     AS ENUM ('Publicado','Em cotacao','Em negociacao','Contratado','Finalizado','Cancelado');
CREATE TYPE demand_urgency    AS ENUM ('Baixa','Media','Alta','Critica');
CREATE TYPE order_status      AS ENUM ('Publicado','Em cotacao','Contratado','Em setup','Em producao','Em inspecao','Aguardando coleta','Em transporte','Entregue','Finalizado','Cancelado');
CREATE TYPE proposal_risk     AS ENUM ('Baixo','Medio','Alto','Critico');
CREATE TYPE contract_status   AS ENUM ('Gerado','Aguardando assinatura','Assinado','Cancelado');
CREATE TYPE nda_status        AS ENUM ('Pendente','Ativo','Expirado','Cancelado');
CREATE TYPE txn_status        AS ENUM ('Pendente','Retido','Liberado','Em disputa','Cancelado');
CREATE TYPE dispute_type      AS ENUM ('Qualidade','Atraso','Quantidade','Acabamento incorreto','Quebra de confidencialidade','Outro');
CREATE TYPE dispute_impact    AS ENUM ('Baixo','Medio','Alto','Critico');
CREATE TYPE dispute_status    AS ENUM ('Aberta','Em analise','Resolvida','Encerrada');
CREATE TYPE doc_status        AS ENUM ('Pendente','Em analise','Aprovado','Reprovado');
CREATE TYPE notif_role        AS ENUM ('demandante','fornecedor','admin');
CREATE TYPE recur_status      AS ENUM ('Ativo','Pausado','Encerrado');
CREATE TYPE recur_renovacao   AS ENUM ('Automatica','Manual');

-- COMPANIES
CREATE TABLE companies (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200)    NOT NULL,
    cnpj        VARCHAR(20)     UNIQUE NOT NULL,
    type        company_type    NOT NULL,
    status      company_status  NOT NULL DEFAULT 'Pendente',
    city        VARCHAR(100),
    address     VARCHAR(300),
    site        VARCHAR(200),
    logo_url    VARCHAR(500),
    orders_count INTEGER        NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_type   ON companies(type);

-- USERS
CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(200) UNIQUE NOT NULL,
    password_hash   VARCHAR(100) NOT NULL,
    role            user_role   NOT NULL,
    name            VARCHAR(200) NOT NULL,
    company_id      UUID        REFERENCES companies(id) ON DELETE SET NULL,
    cnpj            VARCHAR(20),
    avatar          VARCHAR(10),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);

-- DEMANDS
CREATE TABLE demands (
    id              VARCHAR(20)     PRIMARY KEY,  -- ex: DM-4821
    title           VARCHAR(300)    NOT NULL,
    category        VARCHAR(100),
    segment         VARCHAR(100),
    process         VARCHAR(100)    NOT NULL,
    material        VARCHAR(200)    NOT NULL,
    qty             VARCHAR(100),
    deadline        VARCHAR(20),
    urgency         demand_urgency  NOT NULL DEFAULT 'Media',
    budget          VARCHAR(100),
    location        VARCHAR(100),
    status          demand_status   NOT NULL DEFAULT 'Publicado',
    proposals_count INTEGER         NOT NULL DEFAULT 0,
    nda_required    BOOLEAN         NOT NULL DEFAULT FALSE,
    cert_required   VARCHAR(100),
    obs             TEXT,
    sla_hours       INTEGER,
    first_proposal_at TIMESTAMPTZ,
    created_by      UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_demands_status   ON demands(status);
CREATE INDEX idx_demands_process  ON demands(process);
CREATE INDEX idx_demands_urgency  ON demands(urgency);
CREATE INDEX idx_demands_created  ON demands(created_at DESC);
-- Full-text search
CREATE INDEX idx_demands_fts ON demands USING gin(to_tsvector('portuguese', title || ' ' || process || ' ' || COALESCE(material,'')));

CREATE TABLE demand_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id   VARCHAR(20) NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    field_name  TEXT NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_demand_history_demand ON demand_history(demand_id, changed_at DESC);

-- PROPOSALS
CREATE TABLE proposals (
    id              VARCHAR(20)     PRIMARY KEY,  -- ex: PR-901
    demand_id       VARCHAR(20)     REFERENCES demands(id) ON DELETE CASCADE,
    supplier_id     UUID            REFERENCES companies(id) ON DELETE SET NULL,
    supplier_name   VARCHAR(200)    NOT NULL,
    city            VARCHAR(100),
    score           SMALLINT        CHECK (score BETWEEN 0 AND 100),
    total           VARCHAR(50),
    total_raw       NUMERIC(12,2),
    unit_price      VARCHAR(50),
    days            SMALLINT,
    start_date      VARCHAR(20),
    rating          NUMERIC(3,1),
    cert            VARCHAR(100),
    risk            proposal_risk   NOT NULL DEFAULT 'Medio',
    frete           VARCHAR(50),
    payment         VARCHAR(100),
    obs             TEXT,
    risk_factors    JSONB           NOT NULL DEFAULT '[]',
    status          VARCHAR(50)     NOT NULL DEFAULT 'Enviada',
    sent_by         UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_proposals_demand  ON proposals(demand_id);
CREATE INDEX idx_proposals_supplier ON proposals(supplier_id);
CREATE INDEX idx_proposals_risk    ON proposals(risk);

-- ORDERS
CREATE TABLE orders (
    id              VARCHAR(20)     PRIMARY KEY,  -- ex: PD-4821
    demand_id       VARCHAR(20)     REFERENCES demands(id) ON DELETE SET NULL,
    proposal_id     VARCHAR(20)     REFERENCES proposals(id) ON DELETE SET NULL,
    client_id       UUID            REFERENCES companies(id) ON DELETE SET NULL,
    supplier_id     UUID            REFERENCES companies(id) ON DELETE SET NULL,
    client          VARCHAR(200)    NOT NULL,
    product         VARCHAR(300)    NOT NULL,
    value           VARCHAR(50),
    value_raw       NUMERIC(12,2),
    status          order_status    NOT NULL DEFAULT 'Contratado',
    pct             SMALLINT        NOT NULL DEFAULT 0 CHECK (pct BETWEEN 0 AND 100),
    deadline        VARCHAR(20),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_client_id  ON orders(client_id);
CREATE INDEX idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX idx_orders_created    ON orders(created_at DESC);

-- MACHINES
CREATE TABLE machines (
    id          VARCHAR(20)     PRIMARY KEY,  -- ex: MQ-001
    company_id  UUID            REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(200)    NOT NULL,
    type        VARCHAR(100)    NOT NULL,
    brand       VARCHAR(100),
    model       VARCHAR(100),
    year        SMALLINT,
    status      VARCHAR(50)     NOT NULL DEFAULT 'Disponivel',
    turns       VARCHAR(100),
    cost        VARCHAR(50),
    idle        SMALLINT        DEFAULT 0 CHECK (idle BETWEEN 0 AND 100),
    monthly     INTEGER         DEFAULT 0,
    used        INTEGER         DEFAULT 0,
    photo_url   VARCHAR(500),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_machines_company  ON machines(company_id);
CREATE INDEX idx_machines_type     ON machines(type);

-- CONTRACTS
CREATE TABLE contracts (
    id                       VARCHAR(20)     PRIMARY KEY,  -- ex: CT-441
    order_id                 VARCHAR(20)     REFERENCES orders(id) ON DELETE SET NULL,
    demandante               VARCHAR(200)    NOT NULL,
    fornecedor               VARCHAR(200)    NOT NULL,
    demandante_id            UUID            REFERENCES companies(id) ON DELETE SET NULL,
    fornecedor_id            UUID            REFERENCES companies(id) ON DELETE SET NULL,
    valor                    VARCHAR(50),
    valor_raw                NUMERIC(12,2),
    prazo                    VARCHAR(20),
    status                   contract_status NOT NULL DEFAULT 'Gerado',
    scope                    TEXT,
    content_hash             VARCHAR(64),
    generated_at             VARCHAR(20),
    signed_at                VARCHAR(20),
    signed_ip                VARCHAR(50),
    signed_demandante_at     TIMESTAMPTZ,
    signed_demandante_by     UUID            REFERENCES users(id) ON DELETE SET NULL,
    signed_demandante_ip     VARCHAR(50),
    signed_fornecedor_at     TIMESTAMPTZ,
    signed_fornecedor_by     UUID            REFERENCES users(id) ON DELETE SET NULL,
    signed_fornecedor_ip     VARCHAR(50),
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contracts_order   ON contracts(order_id);
CREATE INDEX idx_contracts_status  ON contracts(status);

-- NDAS
CREATE TABLE ndas (
    id          VARCHAR(20)     PRIMARY KEY,  -- ex: NDA-038
    demand_id   VARCHAR(20)     REFERENCES demands(id) ON DELETE CASCADE,
    contraparte VARCHAR(200)    NOT NULL,
    signed_at   VARCHAR(20),
    signed_by   UUID            REFERENCES users(id) ON DELETE SET NULL,
    ip          VARCHAR(50),
    status      nda_status      NOT NULL DEFAULT 'Pendente',
    expires_at  DATE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ndas_demand   ON ndas(demand_id);
CREATE INDEX idx_ndas_expires  ON ndas(expires_at) WHERE status = 'Ativo';

-- TRANSACTIONS
CREATE TABLE transactions (
    id          VARCHAR(20)     PRIMARY KEY,  -- ex: TXN-881
    order_id    VARCHAR(20)     REFERENCES orders(id) ON DELETE SET NULL,
    party       VARCHAR(200)    NOT NULL,
    gross       NUMERIC(12,2)   NOT NULL,
    commission  NUMERIC(12,2)   GENERATED ALWAYS AS (ROUND(gross * 0.07, 2)) STORED,
    status      txn_status      NOT NULL DEFAULT 'Pendente',
    date        VARCHAR(20),
    payment_provider VARCHAR(40),
    payment_method VARCHAR(60),
    provider_session_id VARCHAR(200),
    provider_payment_intent_id VARCHAR(200),
    checkout_url TEXT,
    paid_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    refund_provider_id VARCHAR(200),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transactions_order  ON transactions(order_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_provider_session ON transactions(provider_session_id);

CREATE TABLE transaction_payment_attempts (
    id             BIGSERIAL       PRIMARY KEY,
    transaction_id VARCHAR(20)     NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    provider       VARCHAR(40)     NOT NULL,
    provider_ref   VARCHAR(200),
    status         VARCHAR(80),
    amount         NUMERIC(12,2),
    raw            JSONB,
    created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tx_attempts_tx ON transaction_payment_attempts(transaction_id, created_at DESC);

-- DISPUTES
CREATE TABLE disputes (
    id              VARCHAR(20)     PRIMARY KEY,  -- ex: DP-041
    order_id        VARCHAR(20)     REFERENCES orders(id) ON DELETE SET NULL,
    demandante      VARCHAR(200)    NOT NULL,
    fornecedor      VARCHAR(200)    NOT NULL,
    type            dispute_type    NOT NULL,
    impact          dispute_impact  NOT NULL DEFAULT 'Medio',
    status          dispute_status  NOT NULL DEFAULT 'Aberta',
    date            VARCHAR(20),
    description     TEXT,
    parecer         TEXT,
    resolved_at     VARCHAR(20),
    resolved_by     UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_disputes_status   ON disputes(status);
CREATE INDEX idx_disputes_order_id ON disputes(order_id);

-- REVIEWS
CREATE TABLE reviews (
    id          VARCHAR(20)     PRIMARY KEY,  -- ex: RV-001
    order_id    VARCHAR(20)     REFERENCES orders(id) ON DELETE CASCADE,
    from_company VARCHAR(200)   NOT NULL,
    from_user   UUID            REFERENCES users(id) ON DELETE SET NULL,
    rating      NUMERIC(3,1)    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    date        VARCHAR(20),
    criterios   JSONB           NOT NULL DEFAULT '[]',
    reply       TEXT,
    reply_at    TIMESTAMPTZ,
    moderated   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_order    ON reviews(order_id);
CREATE INDEX idx_reviews_from     ON reviews(from_company);

-- RECURRING CONTRACTS
CREATE TABLE recurring_contracts (
    id          VARCHAR(20)     PRIMARY KEY,  -- ex: CR-021
    demandante  VARCHAR(200)    NOT NULL,
    tipo        VARCHAR(100)    NOT NULL,
    processo    VARCHAR(100)    NOT NULL,
    volume      VARCHAR(100),
    valor       VARCHAR(100),
    inicio      VARCHAR(20),
    vigencia    VARCHAR(20),
    sla         VARCHAR(200),
    status      recur_status    NOT NULL DEFAULT 'Ativo',
    renovacao   recur_renovacao NOT NULL DEFAULT 'Manual',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_recurring_status ON recurring_contracts(status);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    id          BIGSERIAL       PRIMARY KEY,
    evento      VARCHAR(300)    NOT NULL,
    usuario     VARCHAR(200)    NOT NULL,
    empresa     VARCHAR(200),
    ip          VARCHAR(50),
    data        VARCHAR(30),
    tipo        VARCHAR(50)     NOT NULL,
    ref         VARCHAR(200),
    user_id     UUID            REFERENCES users(id) ON DELETE SET NULL,
    request_id  VARCHAR(50),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_tipo     ON audit_logs(tipo);
CREATE INDEX idx_audit_created  ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_user_id  ON audit_logs(user_id);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id          BIGSERIAL       PRIMARY KEY,
    user_role   notif_role      NOT NULL,
    user_id     UUID            REFERENCES users(id) ON DELETE CASCADE,
    tipo        VARCHAR(50)     NOT NULL,
    icone       VARCHAR(10),
    titulo      VARCHAR(200)    NOT NULL,
    descricao   TEXT,
    tempo       VARCHAR(30),
    lida        BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user_id  ON notifications(user_id);
CREATE INDEX idx_notif_role     ON notifications(user_role);
CREATE INDEX idx_notif_lida     ON notifications(lida);
CREATE INDEX idx_notif_created  ON notifications(created_at DESC);

-- CONVERSATIONS
CREATE TABLE conversations (
    id            VARCHAR(30)     PRIMARY KEY,  -- ex: dm-4821
    label         VARCHAR(200)    NOT NULL,
    demand_id     VARCHAR(20)     REFERENCES demands(id) ON DELETE SET NULL,
    order_id      VARCHAR(20)     REFERENCES orders(id) ON DELETE SET NULL,
    participant_a UUID            REFERENCES users(id) ON DELETE SET NULL,
    participant_b UUID            REFERENCES users(id) ON DELETE SET NULL,
    nda_required  BOOLEAN         NOT NULL DEFAULT FALSE,
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conv_part_a   ON conversations(participant_a);
CREATE INDEX idx_conv_part_b   ON conversations(participant_b);
CREATE INDEX idx_conv_updated  ON conversations(updated_at DESC);

-- MESSAGES
CREATE TABLE messages (
    id              BIGSERIAL       PRIMARY KEY,
    conversation_id VARCHAR(30)     REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID            REFERENCES users(id) ON DELETE SET NULL,
    from_name       VARCHAR(200),
    msg             TEXT            NOT NULL,
    tipo            VARCHAR(20)     NOT NULL DEFAULT 'text',
    attachment      VARCHAR(500),
    read            BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conv    ON messages(conversation_id);
CREATE INDEX idx_messages_sender  ON messages(sender_id);
CREATE INDEX idx_messages_unread  ON messages(conversation_id, read) WHERE read = FALSE;
CREATE INDEX idx_messages_created ON messages(created_at ASC);

-- VERIFICATION DOCUMENTS
CREATE TABLE verification_documents (
    id          SERIAL          PRIMARY KEY,
    company_id  UUID            NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome        VARCHAR(200)    NOT NULL,
    obrigatorio BOOLEAN         NOT NULL DEFAULT TRUE,
    status      doc_status      NOT NULL DEFAULT 'Pendente',
    arquivo     VARCHAR(300),
    enviado     VARCHAR(20),
    reviewed_by UUID            REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_verdocs_company ON verification_documents(company_id);
CREATE INDEX idx_verdocs_status  ON verification_documents(status);

-- CALENDAR SLOTS
CREATE TABLE calendar_slots (
    id          SERIAL          PRIMARY KEY,
    machine_id  VARCHAR(20)     NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    year        SMALLINT        NOT NULL,
    month       SMALLINT        NOT NULL CHECK (month BETWEEN 1 AND 12),
    day         SMALLINT        NOT NULL CHECK (day BETWEEN 1 AND 31),
    turn        VARCHAR(2)      NOT NULL CHECK (turn IN ('M','T','N')),
    status      VARCHAR(20)     NOT NULL DEFAULT 'Livre',
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(machine_id, year, month, day, turn)
);
CREATE INDEX idx_calslots_machine ON calendar_slots(machine_id, year, month);

-- UPLOADED FILES
CREATE TABLE uploaded_files (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key   VARCHAR(500)    NOT NULL UNIQUE,
    original_name VARCHAR(300)    NOT NULL,
    mime_type     VARCHAR(150)    NOT NULL,
    size_bytes    BIGINT          NOT NULL,
    sha256        VARCHAR(64),
    uploaded_by   UUID            REFERENCES users(id) ON DELETE SET NULL,
    entity_type   VARCHAR(40),
    entity_id     VARCHAR(50),
    public        BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_uploads_entity ON uploaded_files(entity_type, entity_id);
CREATE INDEX idx_uploads_user   ON uploaded_files(uploaded_by);

-- AUTH TOKENS
CREATE TABLE auth_tokens (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)     NOT NULL UNIQUE,
    purpose     VARCHAR(30)     NOT NULL,
    expires_at  TIMESTAMPTZ     NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_authtoken_user    ON auth_tokens(user_id);
CREATE INDEX idx_authtoken_purpose ON auth_tokens(purpose);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- SESSIONS
CREATE TABLE sessions (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_hash    VARCHAR(64)  NOT NULL UNIQUE,
    user_agent      VARCHAR(300),
    ip              VARCHAR(50),
    expires_at      TIMESTAMPTZ  NOT NULL,
    revoked_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- FEEDBACK
CREATE TABLE feedback (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     UUID            REFERENCES users(id) ON DELETE SET NULL,
    type        VARCHAR(20)     NOT NULL DEFAULT 'feedback',
    rating      SMALLINT        CHECK (rating BETWEEN 1 AND 5),
    page        VARCHAR(200),
    message     TEXT            NOT NULL,
    metadata    JSONB,
    status      VARCHAR(20)     NOT NULL DEFAULT 'open',
    admin_reply TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_feedback_user   ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status);

-- BANK ACCOUNTS
CREATE TABLE bank_accounts (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID            NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_name   VARCHAR(100)    NOT NULL,
    bank_code   VARCHAR(10),
    agency      VARCHAR(20)     NOT NULL,
    account     VARCHAR(30)     NOT NULL,
    account_type VARCHAR(20)    NOT NULL DEFAULT 'corrente',
    pix_key     VARCHAR(150),
    is_default  BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bank_company ON bank_accounts(company_id);

-- DISPUTE MESSAGES
CREATE TABLE dispute_messages (
    id          BIGSERIAL       PRIMARY KEY,
    dispute_id  VARCHAR(20)     NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender_id   UUID            REFERENCES users(id) ON DELETE SET NULL,
    sender_role VARCHAR(20),
    msg         TEXT            NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dispmsg_dispute ON dispute_messages(dispute_id);

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

-- ORDER UPDATES
CREATE TABLE order_updates (
    id          BIGSERIAL       PRIMARY KEY,
    order_id    VARCHAR(20)     NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id     UUID            REFERENCES users(id) ON DELETE SET NULL,
    icon        VARCHAR(10)     DEFAULT '?',
    message     TEXT            NOT NULL,
    pct_at      SMALLINT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orderupd_order ON order_updates(order_id, created_at DESC);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_carrier VARCHAR(100);

-- NOTIFICATION PREFERENCES
CREATE TABLE notification_prefs (
    user_id     UUID            PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    prefs       JSONB           NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS counter_of VARCHAR(20) REFERENCES proposals(id) ON DELETE SET NULL;

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_proposals_score   ON proposals(score DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_status  ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_orders_client     ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier   ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_demands_status    ON demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_urgency   ON demands(urgency);
CREATE INDEX IF NOT EXISTS idx_demands_title_trgm    ON demands USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_demands_process_trgm  ON demands USING gin(process gin_trgm_ops);
ALTER TABLE proposals
  ADD CONSTRAINT proposals_total_raw_nonnegative CHECK (total_raw IS NULL OR total_raw >= 0);
ALTER TABLE transactions
  ADD CONSTRAINT transactions_gross_nonnegative CHECK (gross >= 0);

-- SEQUENCES FOR HUMAN IDs
CREATE SEQUENCE IF NOT EXISTS seq_demand_id    START 4900;
CREATE SEQUENCE IF NOT EXISTS seq_proposal_id  START 1000;
CREATE SEQUENCE IF NOT EXISTS seq_order_id     START 4900;
CREATE SEQUENCE IF NOT EXISTS seq_contract_id  START 500;
CREATE SEQUENCE IF NOT EXISTS seq_nda_id       START 100;
CREATE SEQUENCE IF NOT EXISTS seq_dispute_id   START 100;
CREATE SEQUENCE IF NOT EXISTS seq_review_id    START 1000;
CREATE SEQUENCE IF NOT EXISTS seq_txn_id       START 900;
CREATE SEQUENCE IF NOT EXISTS seq_recur_id     START 100;

-- Helper function to generate ID with prefix
CREATE OR REPLACE FUNCTION next_id(prefix TEXT, seq_name TEXT)
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
BEGIN
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
  RETURN prefix || '-' || next_val::TEXT;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: auto updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies','users','demands','orders','machines',
    'contracts','transactions','disputes','recurring_contracts',
    'verification_documents','calendar_slots'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END;
$$;

-- Business core: public profiles, geo, Connect payouts, partial deliveries, fiscal docs
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_onboarding_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_onboarded_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_decided_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_decided_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_companies_geo ON companies(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_stripe_account ON companies(stripe_account_id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_provider_id VARCHAR(200);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_status VARCHAR(40) NOT NULL DEFAULT 'not_started';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_amount NUMERIC(12,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_status VARCHAR(40);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refund_reason TEXT;

CREATE TABLE IF NOT EXISTS order_deliveries (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    qty VARCHAR(100),
    pct SMALLINT CHECK (pct BETWEEN 0 AND 100),
    status VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    notes TEXT,
    attachment_url VARCHAR(500),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_order ON order_deliveries(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fiscal_documents (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL DEFAULT 'NF-e',
    number VARCHAR(80),
    access_key VARCHAR(80),
    amount NUMERIC(12,2),
    issued_at DATE,
    file_url VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'Recebido',
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_order ON fiscal_documents(order_id, created_at DESC);

ALTER TABLE dispute_messages ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500);
ALTER TABLE dispute_messages ADD COLUMN IF NOT EXISTS internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolution VARCHAR(40);

ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE TABLE IF NOT EXISTS company_required_documents (
    company_type VARCHAR(40) NOT NULL,
    nome VARCHAR(200) NOT NULL,
    obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
    expires BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (company_type, nome)
);

INSERT INTO company_required_documents (company_type, nome, obrigatorio, expires, sort_order) VALUES
    ('Fornecedor','Cartao CNPJ',TRUE,FALSE,10),
    ('Fornecedor','Contrato social',TRUE,FALSE,20),
    ('Fornecedor','Alvara de funcionamento',TRUE,TRUE,30),
    ('Fornecedor','Comprovante bancario',TRUE,FALSE,40),
    ('Fornecedor','Certificacao tecnica principal',FALSE,TRUE,50),
    ('Demandante','Cartao CNPJ',TRUE,FALSE,10),
    ('Demandante','Contrato social',TRUE,FALSE,20),
    ('Demandante','Comprovante de endereco',TRUE,FALSE,30)
ON CONFLICT (company_type, nome) DO UPDATE
SET obrigatorio = EXCLUDED.obrigatorio,
    expires = EXCLUDED.expires,
    sort_order = EXCLUDED.sort_order;
