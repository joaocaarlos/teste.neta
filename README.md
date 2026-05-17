# CapaCity — Marketplace B2B de Manufatura Industrial

[![CI](https://github.com/seu-usuario/capacity/actions/workflows/ci.yml/badge.svg)](https://github.com/seu-usuario/capacity/actions/workflows/ci.yml)

Plataforma B2B que conecta **empresas com demanda de produção industrial** a **fornecedores com capacidade ociosa** — usinagem CNC, injeção plástica, caldeiraria, metalurgia e mais.

---

## Sumário

- [Início rápido](#início-rápido)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testes](#testes)
- [Swagger / Docs da API](#swagger--docs-da-api)
- [CI/CD](#cicd)
- [Segurança](#segurança)
- [Troubleshooting](#troubleshooting)
- [Documentação adicional](#documentação-adicional)

---

## Início rápido

```bash
# 1. Clone e entre no diretório
git clone https://github.com/seu-usuario/capacity.git
cd capacity

# 2. Copie as variáveis de ambiente
cp .env.example .env   # edite conforme necessário

# 3. Suba todos os serviços
docker compose up -d --build

# 4. Aguarde os health checks (≈ 30-60s)
docker compose ps       # todos devem estar "healthy"
```

### URLs após subir

| Serviço            | URL                           |
|--------------------|-------------------------------|
| Frontend React     | http://localhost:3000         |
| API / Swagger UI   | http://localhost:3001/docs    |
| API Health         | http://localhost:3001/health  |
| MinIO console      | http://localhost:9001         |
| pgAdmin (dev)      | http://localhost:5050         |

### Credenciais demo

| Perfil      | E-mail                        | Senha      |
|-------------|-------------------------------|------------|
| Demandante  | joao@metalparts.com.br        | demo123    |
| Fornecedor  | pedro@metalprime.com.br       | demo123    |
| Admin       | admin@capacity.com.br         | admin123   |

---

## Estrutura do projeto

```
capacity/
├── .github/workflows/     ← CI (ci.yml) e deploy (deploy.yml)
├── db/
│   ├── 01_schema.sql      ← DDL completo: tabelas, ENUMs, sequences, índices
│   └── 02_seed.sql        ← 14 empresas, 33 usuários, pedidos e disputas demo
├── api/
│   ├── src/
│   │   ├── index.ts       ← Express app: rotas, middleware, health, Swagger
│   │   ├── db.ts          ← Pool PostgreSQL + helpers query/transaction
│   │   ├── middleware/    ← auth, error
│   │   ├── routes/        ← 20+ rotas REST
│   │   ├── lib/           ← audit, email, idgen, logger, metrics, score, sse,
│   │   │                     state-machine, swagger, tokens, upload, validators…
│   │   ├── cron/          ← 5 jobs: expirar demandas/NDAs, recorrentes, retenção
│   │   └── __tests__/     ← unitários + integração (Vitest)
│   ├── vitest.config.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/           ← App.tsx, AppContext, AuthContext
│   │   ├── features/      ← auth, dashboard, demands, orders, proposals,
│   │   │                     contracts, messages, notifications, disputes
│   │   ├── hooks/         ← useApi, useSSE
│   │   ├── store/         ← Zustand: auth, notifications, ui
│   │   ├── services/      ← api.ts (apiFetch, apiGet, apiPost…)
│   │   └── types/         ← tipos TypeScript completos
│   ├── e2e/               ← Playwright E2E
│   └── package.json
├── docs/                  ← ARCHITECTURE, SECURITY, DATABASE, TESTING…
└── docker-compose.yml
```

---

## Variáveis de ambiente

Copie `.env.example` → `.env`. Variáveis críticas:

| Variável                      | Padrão dev                          | Obrigatório prod |
|-------------------------------|-------------------------------------|------------------|
| `JWT_SECRET`                  | `supersecretkey_change_in_production` | ✅ Mude!        |
| `DB_PASS`                     | `capacity123`                       | ✅ Mude!        |
| `REDIS_PASS`                  | `redis123`                          | ✅ Mude!        |
| `CORS_ORIGIN`                 | `http://localhost:3000`             | ✅ Domínio real |
| `RESEND_API_KEY`              | *(vazio = stub console)*            | Para e-mail real|
| `UPLOAD_STORAGE`              | `s3`                                | `s3` ou `disk`  |
| `S3_ENDPOINT`                 | `http://minio:9000`                 | URL do S3/MinIO |
| `STRIPE_SECRET_KEY`           | *(vazio)*                           | Para pagamentos |
| `REQUIRE_EMAIL_VERIFICATION`  | `true`                              | —               |
| `SENTRY_DSN`                  | *(vazio)*                           | Para prod       |

---

## Rodando localmente (sem Docker)

```bash
# PostgreSQL e Redis devem estar rodando localmente

# API
cd api
npm install
cp ../.env.example .env    # ajuste DB_HOST=localhost, REDIS_HOST=localhost
npm run dev                 # tsx watch src/index.ts (hot reload)

# Frontend
cd frontend
npm install
npm run dev                 # Vite dev server na porta 5173
```

---

## Testes

```bash
# Instalar dependências (fora do container)
cd api && npm install

# Todos os testes
npm test

# Apenas unitários (rápidos, sem banco)
npm test -- src/__tests__/unit

# Integração (precisa de PostgreSQL + Redis)
TEST_DB_URL=postgres://capacity:capacity123@localhost:5433/capacity_test \
npm test -- src/__tests__/integration

# Com relatório de cobertura HTML
npm test -- --coverage
# abrir: api/coverage/index.html

# E2E com Playwright
cd frontend
npx playwright install chromium
npx playwright test

# E2E headful (ver o browser)
npx playwright test --headed
```

### Estrutura de testes

```
api/src/__tests__/
  setup.ts                        ← createTestUser, getAuthToken, clearTables
  unit/
    validators.test.ts            ← v.email, v.password, v.cnpj, v.enumOneOf
    state-machine.test.ts         ← transições: orders, demands, contracts, NDAs, disputes
    score.test.ts                 ← calcScore: pesos, critérios, edge cases
    idgen.test.ts                 ← prefixos DM-, PR-, PD-, CT-, NDA-, DP-…
    audit.test.ts                 ← INSERT correto, nunca lança, redação de PII
  integration/
    auth.test.ts                  ← register, login, forgot-password, /me, logout
    demands.test.ts               ← CRUD + controle de acesso por role/empresa

frontend/e2e/
  publish-smoke.spec.ts           ← smoke: app carrega, auth screens
  auth.spec.ts                    ← login/logout demandante, fornecedor, admin
  marketplace.spec.ts             ← demanda → proposta → aceite → pedido
  admin.spec.ts                   ← aprovação de empresa, gestão de disputas
```

---

## Swagger / Docs da API

```
http://localhost:3001/docs       ← Swagger UI interativo
http://localhost:3001/docs.json  ← spec OpenAPI 3.0 (JSON)
```

**Para autenticar:**
1. Execute `POST /api/auth/login` no Swagger
2. Copie o `token` da resposta
3. Clique em **Authorize** → cole `Bearer <token>`

---

## CI/CD

### CI (`.github/workflows/ci.yml`)

Disparado em push e PRs para `main`/`develop`:

| Job                 | O que faz                                       |
|---------------------|-------------------------------------------------|
| `lint`              | ESLint na API                                   |
| `typecheck`         | `tsc --noEmit` em API e frontend                |
| `unit-tests`        | Vitest unitários + cobertura                    |
| `integration-tests` | Vitest integração com PostgreSQL + Redis reais  |
| `build-api`         | Compila TypeScript                              |
| `build-frontend`    | `vite build`                                    |
| `docker-build`      | Build das imagens Docker (sem push)             |
| `coverage-comment`  | Comenta cobertura no PR                         |

### Deploy (`.github/workflows/deploy.yml`)

Push para `main` com CI verde:
1. Publica imagens no GHCR com tag `:sha`
2. Deploy automático para **staging** via SSH
3. Deploy para **produção** com aprovação manual + backup do banco

**Secrets necessários no repositório:**
```
GHCR_TOKEN     → GitHub PAT com write:packages
SSH_HOST       → IP do servidor
SSH_USER       → usuário SSH
SSH_KEY        → chave privada Ed25519
DEPLOY_PATH    → ex: /opt/capacity
```

---

## Segurança

- JWT (7d) + refresh token rotativo com revogação
- CSRF via cookie `csrf_token` + header `X-CSRF-Token`
- Rate limiting por `userId` (JWT) ou IP
- Bloqueio por brute force: 5 falhas → lockout 15 min (Redis)
- 2FA/TOTP opcional
- Helmet + CSP configurado
- bcrypt rounds 10
- Validação de magic bytes em uploads (previne MIME spoofing)
- Middleware de ownership previne IDOR entre empresas

Veja [`docs/SECURITY.md`](docs/SECURITY.md) para detalhes.

---

## Troubleshooting

| Problema                           | Solução                                                             |
|------------------------------------|---------------------------------------------------------------------|
| Login não funciona                 | `docker compose down -v && docker compose up -d --build` (reseed)  |
| API não inicia                     | `docker compose logs api` — verifique conexão com DB/Redis          |
| Porta 5432 em uso                  | Mude `DB_PORT=5433` no `.env`                                       |
| Upload falha                       | Verifique MinIO: `docker compose ps minio`                          |
| E-mail não chega                   | Configure `RESEND_API_KEY` ou `SMTP_HOST` no `.env`                 |
| `email_not_verified`               | `POST /api/auth/resend-verification` para reenviar e-mail           |
| Token expirado (401)               | `POST /api/auth/refresh` com `refreshToken`                         |
| `company_suspended`                | Admin deve reativar em `/api/companies/:id/reactivate`              |

---

## Documentação adicional

| Arquivo                       | Conteúdo                                    |
|-------------------------------|---------------------------------------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)   | Diagrama, fluxos, ADRs              |
| [`docs/API.md`](docs/API.md)                     | Referência rápida de todos endpoints |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)       | Deploy produção passo a passo        |
| [`docs/SECURITY.md`](docs/SECURITY.md)           | Modelo de segurança detalhado        |
| [`docs/DATABASE.md`](docs/DATABASE.md)           | Schema, ER Mermaid, migrations       |
| [`docs/TESTING.md`](docs/TESTING.md)             | Estratégia e guia de testes          |
| [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)     | Gargalos, índices, cache             |
| [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md) | Logs, métricas, alertas              |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md)             | Procedimentos operacionais           |
| [`docs/ADR/`](docs/ADR/)                         | Architecture Decision Records        |
