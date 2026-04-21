# ProduFlow

SaaS industrial multi-tenant para controle de producao, estoque, compras, qualidade, rastreabilidade e operacao fabril.

## Stack

- Backend: Fastify, Prisma, PostgreSQL, Zod, BullMQ, Redis opcional
- Frontend: React 18, Vite, Tailwind CSS, TanStack Query, React Hook Form
- Monorepo: pnpm workspaces
- Infra local: Docker Compose para PostgreSQL

## Estrutura

```text
/
  apps/
    api/
    web/
  packages/
    config/
    types/
    ui/
    utils/
  infrastructure/
```

## Modulos ativos

- Auth com login, refresh token, logout, `me`, 2FA por TOTP, sessoes ativas e politicas por tenant
- Login externo via Google e Microsoft para usuarios ja cadastrados
- Multi-tenant por `company_id` com RBAC por papel e feature flags por tenant/plano
- Billing base com planos `free`, `basic`, `pro`, `enterprise`
- Produtos, insumos, fornecedores, BOM, pedidos de cliente
- OPs com reservas, consumo, perdas, retrabalho e custo real
- Compras com sugestoes, pedidos, RFQ, cotacoes e recomendacao de fornecedor
- Lotes, serializacao, recall e rastreabilidade por lote/serial
- Roteiros multi-etapa, apontamento por etapa, paradas e kiosk operacional
- Qualidade formal com planos, checklists, nao conformidade, CAPA, anexos e assinatura eletronica
- Audit log, feature flags por tenant/plano, health checks e observabilidade operacional
- Armazens, localizacoes, transferencias, inventario rotativo e curva ABC
- MRP com simulacao, aplicacao e sugestoes de compra
- CRP simplificado com centros de trabalho, calendarios e carga x capacidade
- Webhooks de saida com filas, retries e dead-letter simples
- Financeiro basico com contas a pagar, receber e fluxo de caixa
- CRM leve com oportunidades, tarefas e conversao em pedido
- Exportacao LGPD do tenant por job assincrono
- Upload de anexos com provider `local`, `s3` ou `supabase`
- Centro de integracoes com testes reais para SMTP, Stripe, Pagar.me, S3, Supabase e endpoints externos

## Setup local

### 1. Variaveis de ambiente

No PowerShell:

```powershell
Copy-Item .env.example .env
```

Ou em shell Unix:

```bash
cp .env.example .env
```

### 2. Instalar dependencias

```bash
pnpm install
pnpm prisma:generate
```

### 3. Subir o banco

```bash
docker compose up -d postgres
```

### 4. Aplicar migration

```bash
pnpm prisma:migrate
```

### 5. Popular seed demo

```bash
pnpm prisma:seed
```

### 6. Rodar em desenvolvimento

```bash
pnpm dev
```

## Enderecos locais

- Frontend: `http://localhost:5173`
- API: `http://localhost:3333`
- Swagger: `http://localhost:3333/docs`

## Comandos principais

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

## Usuarios demo

- `admin@alpha.local` / `ProduFlow@123`
- `manager@alpha.local` / `ProduFlow@123`
- `operator@alpha.local` / `ProduFlow@123`
- `buyer@alpha.local` / `ProduFlow@123`
- `viewer@alpha.local` / `ProduFlow@123`

O tenant demo principal usa plano `PRO`, com estoque avancado, lotes, serializacao, qualidade e API publica habilitados.

## Endpoints relevantes desta etapa

- `GET /v1/health`
- `GET /v1/health/detailed`
- `GET /v1/auth/oauth/:provider/start`
- `GET /v1/auth/oauth/:provider/callback`
- `GET /v1/files`
- `POST /v1/files/upload`
- `GET /v1/files/:id/download`
- `GET /v1/integrations/catalog`
- `GET /v1/integrations`
- `PUT /v1/integrations/:provider`
- `POST /v1/integrations/:provider/test`
- `GET /v1/production-advanced/kiosk`
- `GET /v1/production-advanced/sequencing`
- `PATCH /v1/production-advanced/sequencing/:id`
- `POST /v1/production-advanced/executions/:id/pause`
- `POST /v1/production-advanced/executions/:id/resume`
- `GET /v1/quality/evidence`
- `POST /v1/quality/signatures`
- `GET /v1/recalls`
- `GET /v1/recalls/:id`
- `GET /v1/recalls/impact`
- `POST /v1/recalls`
- `GET /v1/public/serials`
- `GET /v1/public/recalls`
- `POST /v1/public/customer-orders`
- `GET /v1/webhooks/endpoints`
- `GET /v1/data-exports`
- `GET /v1/billing/events`
- `POST /v1/billing/sync/:provider`
- `POST /v1/odm-documents/upload`
- `GET /v1/odm-documents`
- `GET /v1/odm-documents/:id`
- `PATCH /v1/odm-documents/:id/review`
- `POST /v1/odm-documents/:id/reprocess`
- `GET /v1/odm-documents/exports/csv`
- `GET /v1/odm-documents/exports/xlsx`
- `GET /v1/odm-documents/:id/report.pdf`

## Frontend novo desta etapa

- `/seguranca`
- `/auditoria`
- `/planejamento/mrp`
- `/planejamento/capacidade`
- `/planejamento/sequenciamento`
- `/producao/kiosk`
- `/estoque/armazens`
- `/estoque/localizacoes`
- `/estoque/transferencias`
- `/estoque/inventarios`
- `/estoque/analises`
- `/qualidade/gestao`
- `/qualidade/recalls`
- `/rastreabilidade`
- `/financeiro`
- `/crm`
- `/integracoes/conexoes`
- `/integracoes/webhooks`
- `/governanca/exportacoes`
- `/sso/callback`
- `/odm/upload`
- `/odm/resultados`
- `/odm/historico`
- `/odm/:id`

## Modulo ODM

O monorepo agora inclui um fluxo dedicado para documentos ODM com:

- upload multiplo de PDF e imagem
- leitura nativa de PDF com fallback para OCR
- extracao estruturada apenas dos campos ODM definidos
- revisao manual antes da confirmacao
- historico completo com logs de processamento
- exportacao para CSV, Excel, payload de Google Sheets e relatorio PDF

### Variaveis novas

- `ODM_OCR_LANG`: idioma do Tesseract, padrao `por+eng`
- `ODM_MAX_PDF_PAGES`: limite de paginas renderizadas para OCR em PDFs escaneados

## Integracoes externas

Os adapters abaixo ficam operacionais quando as variaveis de ambiente sao preenchidas corretamente:

- SMTP para envio real de e-mail
- Google OAuth e Microsoft OAuth para login externo de usuarios do tenant
- Amazon S3 e Supabase Storage para anexos e evidencias
- Stripe e Pagar.me para testes reais de conectividade de billing
- Sentry, Grafana, NFe e ERP para health/teste de integracao

## Validacao

Esta base foi validada com:

```bash
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

## Limitacoes atuais

- Stripe, Pagar.me, SMTP, SSO, S3, Supabase, Sentry, Grafana, NFe e ERP dependem de credenciais e endpoints reais para ativacao.
- O callback de SSO usa query string para entregar os tokens ao frontend local; em producao, o ideal e trocar por handoff seguro via cookie ou pagina intermediaria.
- CRP ainda trabalha por centro de trabalho e tempos por produto; calendarios e sequenciamento ja existem, mas o sequenciamento finito avancado ainda pode evoluir.
- A exportacao LGPD gera JSON estruturado localmente; armazenamento remoto e delecao definitiva seguem como ampliacao futura.
