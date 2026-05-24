# Database — CapaCity

PostgreSQL 16 com extensões `pgcrypto` e `pg_trgm`. Schema versionado via migrations em `api/migrations/` aplicadas automaticamente pelo `runMigrations()` no boot.

## Visão geral

```
companies --+--< users
            +--< machines --< calendar_slots
            +--< verification_documents
            +--< bank_accounts
            +--< orders (client_id, supplier_id)

demands ----< proposals ----< orders ----< transactions
    |            |              |
    |            |              +--< order_updates
    |            |              +--< contracts
    |            |              +--< ndas
    |            |              +--< disputes --< dispute_msgs
    |            |              +--< reviews
    |
    +--< demand_history (audit)

users --< sessions, auth_tokens, notifications, audit_logs
uploaded_files (polimórfico: demand|order|contract|...)
```

## Tabelas principais

### Identidade & Acesso

| Tabela              | Propósito                                       |
|---------------------|--------------------------------------------------|
| `companies`         | PJ no marketplace (demandante ou fornecedor)    |
| `users`             | Pessoas vinculadas a companies                  |
| `sessions`          | Refresh tokens multi-device, rotacionados       |
| `auth_tokens`       | Reset password, email verify, single-use        |
| `verification_documents` | KYC: contrato social, alvará etc.          |
| `bank_accounts`     | Conta para recebimento (Stripe Connect)         |

### Marketplace Core

| Tabela              | Propósito                                       |
|---------------------|--------------------------------------------------|
| `demands`           | Pedido de produção publicado pelo demandante    |
| `demand_history`    | Auditoria por campo de toda alteração em demands |
| `proposals`         | Respostas dos fornecedores (com versionamento)  |
| `orders`            | Pedido confirmado (proposta aceita)             |
| `order_updates`     | Timeline de produção (mensagens + anexos)       |
| `ndas`              | Acordos de confidencialidade dual-sign          |
| `contracts`         | Contrato digital de prestação dual-sign         |

### Pagamentos

| Tabela              | Propósito                                       |
|---------------------|--------------------------------------------------|
| `transactions`      | Pagamentos via Stripe (escrow + liberação)      |

### Pós-venda

| Tabela              | Propósito                                       |
|---------------------|--------------------------------------------------|
| `disputes`          | Disputas com mediação admin                     |
| `dispute_messages`  | Thread de mensagens da disputa                  |
| `reviews`           | Avaliações com reply + moderação                |

### Comunicação

| Tabela              | Propósito                                       |
|---------------------|--------------------------------------------------|
| `conversations`     | Conversa entre 2 participantes                  |
| `messages`          | Mensagens (com edit, soft delete, FTS, anexos)  |
| `notifications`     | Notificações in-app (com agrupamento)           |
| `notification_prefs`| Prefs por canal (email/in_app/push) + digest    |

## Convenções

- Tabelas: plural, snake_case
- FKs: `<tabela_singular>_id`
- Timestamps: sempre `TIMESTAMPTZ` (UTC)
- Índices: `idx_<tabela>_<campos>`

## Migrations

Localização: `api/migrations/`

| Arquivo                          | Adiciona                                |
|----------------------------------|------------------------------------------|
| `001_stripe_events_idempotency`  | Tabela `stripe_events` (webhook dedup)  |
| `002_demand_history`             | Histórico + SLA das demandas            |
| `003_proposal_versioning`        | Versionamento + templates de propostas  |
| `004_order_timeline`             | Deadline + sla_status + anexos timeline |
| `005_messages_features`          | Read receipts + edit + FTS busca        |
| `006_notification_prefs`         | Prefs granulares + agrupamento          |
| `007_calendar_timezone`          | Timezone empresa + start_at TIMESTAMPTZ |
| `008_company_profile`            | Slug + gallery + certs + specialties    |
| `009_kyc_columns`                | kyc_verified_at + trigger updated_at    |

**Rollbacks** em `migrations/down/<nome>.down.sql`.

## Índices críticos

```sql
-- Listagem de demandas filtradas
CREATE INDEX idx_demands_status_urgency ON demands(status, urgency);
CREATE INDEX idx_demands_fts ON demands USING GIN(to_tsvector('portuguese', title || ' ' || process));
CREATE INDEX idx_demands_trgm ON demands USING GIN(title gin_trgm_ops);

-- Score-based ordering de propostas
CREATE INDEX idx_proposals_demand_score ON proposals(demand_id, score DESC);

-- Ownership filters em orders
CREATE INDEX idx_orders_client_status ON orders(client_id, status);
CREATE INDEX idx_orders_supplier_status ON orders(supplier_id, status);

-- Notifications por usuário
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, lida, created_at DESC);
```

## Backup & Recovery

```bash
# Backup completo
docker exec capacity_db pg_dump -U capacity -d capacity --no-owner -Fc > backup-$(date +%Y%m%d).dump

# Restauração
docker exec -i capacity_db pg_restore -U capacity -d capacity --clean --if-exists < backup-20260511.dump
```
