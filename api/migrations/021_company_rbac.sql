-- Cargos da empresa (padrão + customizados)
CREATE TABLE IF NOT EXISTS company_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  hierarchy_level INT NOT NULL DEFAULT 0,
  is_system_role  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Permissões globais (catálogo)
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  module      TEXT NOT NULL,
  description TEXT
);

-- Permissões por cargo
CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       UUID NOT NULL REFERENCES company_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  allowed       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(role_id, permission_id)
);

-- Membros da empresa
CREATE TABLE IF NOT EXISTS company_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID REFERENCES company_roles(id) ON DELETE SET NULL,
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'blocked')),
  invited_by UUID REFERENCES users(id),
  joined_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Convites
CREATE TABLE IF NOT EXISTS company_invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role_id    UUID REFERENCES company_roles(id) ON DELETE SET NULL,
  token      TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user    ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(token);

-- Seed: catálogo de permissões
INSERT INTO permissions (code, module, description) VALUES
('company.view',               'empresa',    'Visualizar dados da empresa'),
('company.edit',               'empresa',    'Editar dados da empresa'),
('members.view',               'membros',    'Visualizar membros'),
('members.invite',             'membros',    'Convidar membros'),
('members.remove',             'membros',    'Remover membros'),
('members.block',              'membros',    'Bloquear membros'),
('roles.create',               'cargos',     'Criar cargos'),
('roles.edit',                 'cargos',     'Editar cargos'),
('roles.delete',               'cargos',     'Excluir cargos'),
('roles.permissions.edit',     'cargos',     'Editar permissões dos cargos'),
('demands.create',             'demandas',   'Criar demandas'),
('demands.view',               'demandas',   'Visualizar demandas'),
('demands.edit',               'demandas',   'Editar demandas'),
('demands.approve',            'demandas',   'Aprovar demandas'),
('proposals.view',             'propostas',  'Visualizar propostas'),
('proposals.create',           'propostas',  'Criar propostas'),
('proposals.negotiate',        'propostas',  'Negociar propostas'),
('proposals.approve',          'propostas',  'Aprovar propostas'),
('technical.files.view',       'engenharia', 'Visualizar arquivos técnicos'),
('technical.files.upload',     'engenharia', 'Enviar arquivos técnicos'),
('technical.status.update',    'engenharia', 'Atualizar status técnico'),
('quality.approve',            'qualidade',  'Aprovar qualidade'),
('quality.nonconformity',      'qualidade',  'Registrar não conformidade'),
('logistics.view',             'logistica',  'Visualizar logística'),
('logistics.schedule',         'logistica',  'Agendar coleta'),
('logistics.invoice.upload',   'logistica',  'Anexar nota fiscal'),
('logistics.delivery.confirm', 'logistica',  'Confirmar entrega'),
('machines.view',              'manutencao', 'Visualizar máquinas'),
('machines.create',            'manutencao', 'Cadastrar máquinas'),
('machines.edit',              'manutencao', 'Editar máquinas'),
('capacity.update',            'manutencao', 'Atualizar capacidade produtiva'),
('finance.view',               'financeiro', 'Visualizar financeiro'),
('finance.approve_transfer',   'financeiro', 'Aprovar repasse'),
('contracts.view',             'contratos',  'Visualizar contratos'),
('contracts.cancel',           'contratos',  'Cancelar contratos'),
('audit.view',                 'auditoria',  'Visualizar auditoria')
ON CONFLICT (code) DO NOTHING;
