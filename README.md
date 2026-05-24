# CapaCity — Marketplace B2B de Manufatura Industrial

[![CI](https://github.com/joaocaarlos/teste.neta/actions/workflows/ci.yml/badge.svg)](https://github.com/joaocaarlos/teste.neta/actions/workflows/ci.yml)

Plataforma B2B que conecta **empresas com demanda de produção industrial** a **fornecedores com capacidade ociosa** — usinagem CNC, injeção plástica, caldeiraria, metalurgia e mais.

---

## Sumário

1. [Pré-requisitos](#pré-requisitos)
2. [Início rápido (Docker)](#início-rápido-docker)
3. [Desenvolvimento local (sem Docker)](#desenvolvimento-local-sem-docker)
4. [Variáveis de ambiente](#variáveis-de-ambiente)
5. [Estrutura do projeto](#estrutura-do-projeto)
6. [Testes](#testes)
7. [API & Swagger](#api--swagger)
8. [CI/CD](#cicd)
9. [Segurança](#segurança)
10. [Troubleshooting](#troubleshooting)
11. [Documentação adicional](#documentação-adicional)

---

## Pré-requisitos

| Ferramenta     | Versão mínima | Como instalar                          |
|----------------|---------------|----------------------------------------|
| Docker         | 24+           | https://docs.docker.com/get-docker     |
| Docker Compose | v2 (plugin)   | incluído no Docker Desktop             |
| Node.js        | 20+           | https://nodejs.org (só para dev local) |
| npm            | 10+           | incluído no Node.js                    |

---

## Início rápido (Docker)

### 1. Clone o repositório

```bash
git clone https://github.com/joaocaarlos/teste.neta.git
cd teste.neta
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Abra `.env` e substitua os valores `CHANGE_ME`:

```bash
# Gere segredos seguros com OpenSSL:
openssl rand -base64 48   # para JWT_SECRET
openssl rand -base64 24   # para DB_PASS e MINIO_ROOT_PASSWORD
```

Exemplo mínimo para rodar localmente:

```env
DB_PASS=minha_senha_local
MINIO_ROOT_PASSWORD=minha_senha_minio
JWT_SECRET=cole_aqui_o_resultado_do_openssl_rand_base64_48
```

### 3. Suba todos os serviços

```bash
# Primeira execução: faz build das imagens (~2-3 min)
docker compose up -d --build

# Acompanhe os logs até aparecer "CapaCity API started"
docker compose logs -f api
```

### 4. Verifique a saúde dos serviços

```bash
docker compose ps
# Todos devem estar com status "healthy"
```

```bash
# Confirmação via endpoint de health
curl http://localhost:3001/health
```

### URLs disponíveis

| Serviço             | URL                          | Notas                                        |
|---------------------|------------------------------|----------------------------------------------|
| Frontend React      | http://localhost:3000        | —                                            |
| API REST            | http://localhost:3001        | —                                            |
| Swagger UI          | http://localhost:3001/docs   | Apenas em desenvolvimento                    |
| Health check        | http://localhost:3001/health | JSON com status de todas as dependências     |
| MinIO console       | http://localhost:9001        | Storage local de arquivos (usuário: capacity)|
| pgAdmin (opcional)  | http://localhost:5050        | `docker compose --profile dev up`            |

### Usuários de demonstração

> Estes dados são apenas para o banco de desenvolvimento local (seed). Nunca use em produção.

| Perfil      | E-mail                      | Senha    |
|-------------|-----------------------------|----------|
| Demandante  | joao@metalparts.com.br      | demo123  |
| Fornecedor  | pedro@metalprime.com.br     | demo123  |
| Admin       | admin@capacity.com.br       | admin123 |

### Parar os serviços

```bash
# Para os containers mantendo os dados
docker compose down

# Para e apaga todos os volumes (reset completo do banco)
docker compose down -v
```

---

## Desenvolvimento local (sem Docker)

Ideal para iteração rápida sem rebuildar imagens.

### 1. Suba apenas a infraestrutura

```bash
# Inicia apenas PostgreSQL, Redis e MinIO
docker compose up -d db redis minio
```

### 2. Configure o `.env` para acesso local

```env
DB_HOST=localhost
DB_PORT=5433          # porta mapeada no docker-compose.yml
REDIS_HOST=localhost
REDIS_PORT=6379
S3_ENDPOINT=http://localhost:9000
UPLOAD_STORAGE=s3
```

### 3. Rode a API

```bash
cd api
npm install
npm run dev        # hot-reload com ts-node-dev → http://localhost:3001
```

### 4. Rode o frontend

```bash
cd frontend
npm install
npm run dev        # Vite dev server → http://localhost:5173
```

> O Vite está configurado para fazer proxy de `/api/*` para `http://localhost:3001` automaticamente.

### Migrations manuais

```bash
cd api

# Aplica todas as migrations pendentes
npm run db:migrate

# Reverte a última migration
npm run db:rollback

# Reverte N migrations
STEPS=3 npm run db:rollback
```

---

## Variáveis de ambiente

O arquivo `.env.example` na raiz contém todas as variáveis documentadas com comentários. Copie para `.env` e ajuste antes de rodar.

Na inicialização, a API valida todas as variáveis via **Zod**. Se alguma obrigatória estiver faltando ou com formato inválido, a API recusa iniciar com uma mensagem clara:

```
Variáveis de ambiente inválidas:
  JWT_SECRET: JWT_SECRET deve ter pelo menos 32 caracteres
  DB_PASS: Required
```

### Variáveis críticas para produção

| Variável              | Descrição                              | Como gerar                      |
|-----------------------|----------------------------------------|---------------------------------|
| `JWT_SECRET`          | Chave de assinatura JWT (mín. 32 chars)| `openssl rand -base64 48`       |
| `DB_PASS`             | Senha do PostgreSQL                    | `openssl rand -base64 24`       |
| `MINIO_ROOT_PASSWORD` | Senha do MinIO / bucket S3             | `openssl rand -base64 24`       |
| `APP_URL`             | URL pública da aplicação (HTTPS)       | `https://seudominio.com.br`     |
| `CORS_ORIGIN`         | Origem permitida pelo CORS             | `https://seudominio.com.br`     |
| `SENTRY_DSN`          | Rastreamento de erros em produção      | Painel Sentry                   |
| `METRICS_TOKEN`       | Protege o endpoint `/metrics`          | `openssl rand -base64 24`       |

### E-mail transacional (escolha uma opção)

```env
# Opção A — Resend (recomendado)
RESEND_API_KEY=re_xxxxxxxxxx

# Opção B — SMTP genérico
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario@exemplo.com
SMTP_PASS=senha_smtp
```

### Pagamentos com Stripe

```env
PAYMENTS_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=brl
```

Consulte [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md) para configurar o webhook e o Connect.

---

## Estrutura do projeto

```
teste.neta/
├── .github/
│   └── workflows/
│       └── ci.yml                  ← Lint, typecheck, testes, build, Docker
├── api/                            ← Backend Node.js / Express / TypeScript
│   ├── src/
│   │   ├── app.ts                  ← Express factory (testável de forma isolada)
│   │   ├── server.ts               ← Startup: migrations, e-mail queue, listen
│   │   ├── db.ts                   ← Pool PostgreSQL + helpers query/transaction
│   │   ├── config/
│   │   │   ├── env.schema.ts       ← Schema Zod de todas as env vars
│   │   │   └── env.ts              ← Parse validado e export tipado
│   │   ├── middleware/
│   │   │   ├── auth.ts             ← JWT, CSRF, revogação de token, RBAC
│   │   │   ├── captcha.ts          ← hCaptcha / reCaptcha após falhas de login
│   │   │   └── error.ts            ← Handler global de erros + Sentry
│   │   ├── routes/
│   │   │   ├── v1/index.ts         ← Agrega todas as rotas (montado em /api/v1)
│   │   │   ├── auth.ts             ← Login, register, 2FA, CSRF, refresh…
│   │   │   ├── demands.ts          ← CRUD + matching industrial + NDA flow
│   │   │   ├── orders.ts           ← Pedidos + escrow Stripe (checkout/approve)
│   │   │   ├── companies.ts        ← Empresas + trust score do fornecedor
│   │   │   ├── marketplace.ts      ← Busca com filtros industriais avançados
│   │   │   ├── admin.ts            ← KPI dashboard, disputas, KYC
│   │   │   └── ...                 ← proposals, ndas, disputes, reviews…
│   │   └── lib/
│   │       ├── migrations.ts       ← Runner de migrations (up + rollback)
│   │       ├── score.ts            ← Score de matching industrial (6 critérios)
│   │       ├── response.ts         ← ok() e fail() helpers de resposta
│   │       ├── email.ts            ← Templates + envio (Resend / SMTP)
│   │       └── ...                 ← audit, idgen, logger, metrics, redis…
│   ├── migrations/                 ← Arquivos SQL versionados (001 → 014)
│   ├── vitest.config.ts
│   └── package.json
├── frontend/                       ← Frontend React 18 / Vite / TypeScript
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx             ← React Router v6 (createBrowserRouter)
│   │   │   ├── AppContext.tsx      ← Estado global com apiGetList
│   │   │   └── AuthContext.tsx     ← Sessão via cookie httpOnly (/auth/me)
│   │   ├── features/
│   │   │   ├── demands/
│   │   │   │   └── DemandWizard.tsx    ← Wizard guiado de 8 passos
│   │   │   ├── admin/
│   │   │   │   └── ExecutiveDashboard.tsx  ← KPIs + funil de conversão
│   │   │   └── ...                 ← auth, proposals, contracts, disputes…
│   │   ├── components/ui/
│   │   │   ├── Input.tsx           ← Input com label / hint / erro / ícone
│   │   │   ├── Badge.tsx
│   │   │   └── BaseComponents.tsx  ← Btn, Card, Stat, FormField, SectionTitle
│   │   ├── services/
│   │   │   └── api.ts              ← apiFetch, apiGet (ApiResult<T>), apiGetList
│   │   └── styles/
│   │       ├── global.ts           ← CSS global injetado via JS
│   │       └── tokens.ts           ← Design tokens (cores, tipografia, espaçamento)
│   └── package.json
├── db/
│   ├── 01_schema.sql               ← DDL completo: tabelas, ENUMs, sequences, índices
│   └── 02_seed.sql                 ← Dados demo: 14 empresas, 33 usuários
├── docs/                           ← Documentação técnica detalhada
├── .env.example                    ← Template de configuração comentado
└── docker-compose.yml
```

---

## Testes

### API (Vitest)

```bash
cd api
npm install

# Todos os testes
npm test

# Somente unitários (sem banco, rápidos)
npx vitest run src/__tests__/unit

# Com relatório de cobertura HTML
npm run test:coverage
# Resultado em: api/coverage/index.html

# Modo watch durante desenvolvimento
npm run test:watch
```

**Testes de integração** (requerem PostgreSQL + Redis):

```bash
NODE_ENV=test \
DB_HOST=localhost \
DB_PORT=5433 \
DB_USER=capacity \
DB_PASS=<senha_do_env> \
DB_NAME=capacity \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=test-secret-at-least-32-chars-long \
BCRYPT_ROUNDS=1 \
npx vitest run
```

### Frontend (Vitest + Playwright)

```bash
cd frontend

# Unitários com Testing Library
npm test

# E2E (Playwright)
npx playwright install chromium   # somente na primeira vez
npx playwright test               # headless
npx playwright test --headed      # com browser visível
npx playwright test --ui          # modo interativo
```

---

## API & Swagger

```
Swagger UI:    http://localhost:3001/docs
OpenAPI JSON:  http://localhost:3001/docs.json
```

> Disponível apenas quando `NODE_ENV !== production`. Para habilitar em produção: `ENABLE_API_DOCS=true`.

### Como autenticar no Swagger

1. Execute `POST /api/auth/login` com e-mail e senha
2. Copie o campo `token` da resposta
3. Clique em **Authorize** → insira `Bearer <token>`

### Versionamento de rotas

```
/api/v1/...   ← canônico (use em novos clientes)
/api/...      ← alias de compatibilidade (será removido na v2)
```

### Endpoints principais

| Método | Rota                                 | Descrição                               |
|--------|--------------------------------------|-----------------------------------------|
| `POST` | `/api/v1/auth/register`              | Cadastro de usuário                     |
| `POST` | `/api/v1/auth/login`                 | Login (define cookie httpOnly)          |
| `GET`  | `/api/v1/auth/me`                    | Perfil do usuário autenticado           |
| `GET`  | `/api/v1/auth/csrf`                  | Obtém token CSRF                        |
| `GET`  | `/api/v1/demands`                    | Lista demandas                          |
| `POST` | `/api/v1/demands`                    | Cria demanda                            |
| `GET`  | `/api/v1/demands/:id/matches`        | Matching industrial com score explicável|
| `POST` | `/api/v1/demands/:id/nda/request`    | Solicita NDA para arquivos técnicos     |
| `POST` | `/api/v1/demands/:id/nda/sign`       | Assina NDA digitalmente                 |
| `GET`  | `/api/v1/demands/:id/files`          | Arquivos técnicos (requer NDA assinado) |
| `GET`  | `/api/v1/marketplace/suppliers`      | Busca fornecedores com filtros          |
| `GET`  | `/api/v1/companies/:id/trust-score`  | Score de confiança do fornecedor        |
| `POST` | `/api/v1/orders/:id/checkout`        | Cria sessão Stripe Checkout (escrow)    |
| `POST` | `/api/v1/orders/:id/approve`         | Demandante aprova entrega               |
| `GET`  | `/api/v1/admin/dashboard/kpis`       | KPIs do marketplace (somente admin)     |

---

## CI/CD

### Pipeline CI (`.github/workflows/ci.yml`)

Disparado em push e PRs para `main` e `develop`:

| Job                  | O que verifica                                     |
|----------------------|----------------------------------------------------|
| `lint`               | ESLint sem erros na API                            |
| `typecheck`          | `tsc --noEmit` em API e frontend                   |
| `unit-tests`         | Vitest unitários + artefato de cobertura           |
| `integration-tests`  | Vitest com PostgreSQL + Redis reais (via services) |
| `build-api`          | Compilação TypeScript → `dist/`                    |
| `build-frontend`     | `vite build` → `dist/`                             |
| `docker-build`       | Build das imagens Docker (sem push)                |
| `coverage-comment`   | Posta relatório de cobertura no PR                 |

### Deploy manual para produção

```bash
# 1. Build das imagens com tag de versão
docker build -t capacity-api:$(git rev-parse --short HEAD) ./api
docker build -t capacity-frontend:$(git rev-parse --short HEAD) ./frontend

# 2. Configure .env de produção (com valores seguros, sem CHANGE_ME)

# 3. Suba os serviços
docker compose up -d

# 4. Migrations são aplicadas automaticamente na inicialização
#    (controlado por RUN_MIGRATIONS=true no .env)
```

---

## Segurança

| Mecanismo                 | Implementação                                                    |
|---------------------------|------------------------------------------------------------------|
| Autenticação              | JWT em cookie `httpOnly` + refresh token rotativo com revogação  |
| CSRF                      | Cookie `csrf_token` + header `X-CSRF-Token` obrigatório em mutations |
| Rate limiting             | 500 req / 15 min por usuário autenticado ou IP                   |
| Brute force               | 5 falhas → lockout 15 min via Redis                              |
| 2FA                       | TOTP compatível com Google Authenticator                         |
| Headers de segurança      | Helmet (CSP, HSTS, X-Frame-Options, Referrer-Policy…)           |
| Senhas                    | bcrypt rounds 10                                                 |
| Uploads                   | Validação de magic bytes (previne MIME spoofing)                 |
| IDOR                      | Middleware de ownership: usuário só acessa dados da própria empresa |
| Env vars                  | Validação Zod no boot; falha imediata se inválidas               |
| Docs da API               | `/docs` retorna 403 em produção por padrão                       |

Detalhes completos: [`docs/SECURITY.md`](docs/SECURITY.md)

---

## Troubleshooting

| Problema                                        | Solução                                                                     |
|-------------------------------------------------|-----------------------------------------------------------------------------|
| API não inicia                                  | `docker compose logs api` — verifique se DB e Redis estão `healthy`        |
| `DB_PASS is required` ou `JWT_SECRET inválido`  | Copie `.env.example` → `.env` e preencha todos os `CHANGE_ME`              |
| Login não funciona após reset                   | `docker compose down -v && docker compose up -d --build` (reseed completo)  |
| Porta 5432 em conflito                          | Altere `DB_PORT=5434` no `.env` e reinicie os containers                    |
| Upload falha (erro S3)                          | `docker compose ps minio` — aguarde status `healthy`                        |
| E-mail não chega                                | Configure `RESEND_API_KEY` ou `SMTP_HOST` no `.env`                        |
| `email_not_verified` no login                   | `POST /api/auth/resend-verification` com o e-mail do usuário               |
| 401 após algum tempo                            | Token expirado — faça login novamente ou use `POST /api/auth/refresh`      |
| 403 nas mutations (CSRF)                        | Chame `GET /api/auth/csrf` antes de requisições POST/PUT/PATCH/DELETE      |
| Empresa com status `Suspenso`                   | Admin chama `POST /api/admin/companies/:id/reactivate`                     |

---

## Documentação adicional

| Arquivo                                                   | Conteúdo                                       |
|-----------------------------------------------------------|------------------------------------------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)            | Diagrama de sistema, fluxos, ADRs              |
| [`docs/API.md`](docs/API.md)                              | Referência completa de todos os endpoints      |
| [`docs/DATABASE.md`](docs/DATABASE.md)                    | Schema ER, migrations, índices                 |
| [`docs/SECURITY.md`](docs/SECURITY.md)                    | Modelo de segurança detalhado                  |
| [`docs/TESTING.md`](docs/TESTING.md)                      | Estratégia e guia de testes                    |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)                | Deploy em produção passo a passo               |
| [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md)            | Configuração de pagamentos com Stripe          |
| [`docs/EMAIL.md`](docs/EMAIL.md)                          | Configuração de e-mail transacional            |
| [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md)          | Logs estruturados, métricas, Sentry            |
| [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)              | Gargalos, índices, cache Redis                 |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md)                      | Procedimentos operacionais de emergência       |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)      | Guia de diagnóstico detalhado                  |
