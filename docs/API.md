# Referência da API — CapaCity

Base URL: `http://localhost:3001`  
Documentação interativa: `http://localhost:3001/docs`

## Autenticação

Todos os endpoints (exceto `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, `/health`) requerem autenticação via:

- **Cookie:** `access_token` (httpOnly, definido no login)
- **CSRF:** header `X-CSRF-Token` em métodos mutantes (POST/PUT/PATCH/DELETE)

---

## Auth — `/api/auth`

| Método | Rota                        | Auth | Descrição                                    |
|--------|-----------------------------|------|----------------------------------------------|
| GET    | `/csrf`                     | ❌   | Obtém token CSRF                             |
| POST   | `/login`                    | ❌   | Login (email, password, role)                |
| POST   | `/register`                 | ❌   | Cadastro (email, password, role, name, cnpj, companyName) |
| POST   | `/logout`                   | ✅   | Logout + revogação de token                  |
| POST   | `/forgot-password`          | ❌   | Solicita reset de senha por email            |
| POST   | `/reset-password`           | ❌   | Redefine senha com token                     |
| GET    | `/verify-email`             | ❌   | Confirma email (query: ?token=)              |
| POST   | `/verify-email`             | ❌   | Confirma email (body: {token})               |
| POST   | `/resend-verification`      | ✅   | Reenvia email de confirmação                 |
| POST   | `/refresh`                  | ❌   | Renova access token com refresh token        |
| GET    | `/me`                       | ✅   | Dados do usuário autenticado                 |
| GET    | `/sessions`                 | ✅   | Lista sessões ativas                         |
| DELETE | `/sessions/:id`             | ✅   | Revoga sessão específica                     |

---

## Demandas — `/api/demands`

| Método | Rota                    | Role                    | Descrição                        |
|--------|-------------------------|-------------------------|----------------------------------|
| GET    | `/`                     | todos                   | Listar (search, status, urgency, nda, limit, offset) |
| GET    | `/categories`           | todos                   | Categorias disponíveis com contagem |
| GET    | `/:id`                  | todos                   | Detalhe                          |
| POST   | `/`                     | demandante, admin       | Criar demanda                    |
| PATCH  | `/:id`                  | owner, admin            | Atualizar                        |
| DELETE | `/:id`                  | owner, admin            | Cancelar (soft delete)           |
| GET    | `/:id/attachments`      | todos                   | Listar anexos                    |
| POST   | `/:id/attachments`      | owner, admin            | Upload de arquivo técnico        |

---

## Propostas — `/api/proposals`

| Método | Rota                    | Role                    | Descrição                              |
|--------|-------------------------|-------------------------|-----------------------------------------|
| GET    | `/`                     | todos                   | Listar (demandId, supplierId, status)  |
| GET    | `/:id`                  | partes, admin           | Detalhe                                |
| POST   | `/`                     | fornecedor, admin       | Criar proposta (calcula score)         |
| POST   | `/:id/accept`           | demandante, admin       | Aceitar → cria Order+Transaction+Contract |
| DELETE | `/:id`                  | fornecedor owner, admin | Retirar proposta                       |

---

## Pedidos — `/api/orders`

| Método | Rota                    | Role                    | Descrição                         |
|--------|-------------------------|-------------------------|-----------------------------------|
| GET    | `/`                     | todos                   | Listar (apenas empresa própria)   |
| GET    | `/:id`                  | partes, admin           | Detalhe                           |
| PATCH  | `/:id/status`           | fornecedor, admin       | Atualizar status + pct            |
| GET    | `/:id/timeline`         | partes, admin           | Timeline de atualizações          |

---

## Contratos — `/api/contracts`

| Método | Rota                    | Role          | Descrição                      |
|--------|-------------------------|---------------|---------------------------------|
| GET    | `/`                     | todos         | Listar (apenas empresa própria)|
| GET    | `/:id`                  | partes, admin | Detalhe                        |
| POST   | `/:id/sign`             | partes        | Assinar contrato               |
| POST   | `/:id/cancel`           | admin         | Cancelar contrato              |

---

## NDAs — `/api/ndas`

| Método | Rota                    | Role               | Descrição               |
|--------|-------------------------|--------------------|-------------------------|
| GET    | `/`                     | todos              | Listar NDAs da empresa  |
| GET    | `/:id`                  | partes, admin      | Detalhe                 |
| POST   | `/`                     | fornecedor, admin  | Criar NDA               |
| POST   | `/:id/sign`             | fornecedor         | Assinar NDA             |
| POST   | `/:id/cancel`           | partes, admin      | Cancelar NDA            |

---

## Transações — `/api/transactions`

| Método | Rota                    | Role            | Descrição                        |
|--------|-------------------------|-----------------|----------------------------------|
| GET    | `/`                     | todos           | Listar (empresa própria)         |
| GET    | `/stats/summary`        | todos           | Resumo financeiro                |
| GET    | `/:id`                  | partes, admin   | Detalhe                          |
| POST   | `/:id/release`          | client, admin   | Liberar pagamento ao fornecedor  |
| POST   | `/:id/dispute`          | client, admin   | Marcar como em disputa           |
| POST   | `/checkout`             | client          | Criar sessão Stripe checkout     |

---

## Disputas — `/api/disputes`

| Método | Rota                    | Role          | Descrição                      |
|--------|-------------------------|---------------|---------------------------------|
| GET    | `/`                     | todos         | Listar (empresa própria)       |
| GET    | `/:id`                  | partes, admin | Detalhe                        |
| POST   | `/`                     | partes        | Abrir disputa                  |
| POST   | `/:id/resolve`          | admin         | Resolver disputa               |
| POST   | `/:id/close`            | admin         | Encerrar disputa               |
| GET    | `/:id/messages`         | partes, admin | Listar mensagens da disputa    |
| POST   | `/:id/messages`         | partes, admin | Enviar mensagem                |

---

## Avaliações — `/api/reviews`

| Método | Rota                    | Role            | Descrição                      |
|--------|-------------------------|-----------------|--------------------------------|
| GET    | `/`                     | todos           | Listar (supplierId, orderId)   |
| GET    | `/:id`                  | todos           | Detalhe                        |
| POST   | `/`                     | partes          | Criar avaliação (pós-entrega)  |
| PATCH  | `/:id/reply`            | fornecedor      | Responder avaliação            |
| PATCH  | `/:id/moderate`         | admin           | Moderar avaliação              |

---

## Mensagens — `/api/messages`

| Método | Rota                          | Role      | Descrição                    |
|--------|-------------------------------|-----------|------------------------------|
| GET    | `/conversations`              | todos     | Listar conversas             |
| POST   | `/conversations`              | todos     | Criar conversa               |
| GET    | `/conversations/:id/messages` | partes    | Listar mensagens             |
| POST   | `/conversations/:id/messages` | partes    | Enviar mensagem              |
| PATCH  | `/conversations/:id/read`     | partes    | Marcar mensagens como lidas  |

---

## Notificações — `/api/notifications`

| Método | Rota             | Role    | Descrição                       |
|--------|------------------|---------|---------------------------------|
| GET    | `/`              | todos   | Listar notificações do usuário  |
| PATCH  | `/:id`           | todos   | Marcar como lida                |
| POST   | `/mark-all-read` | todos   | Marcar todas como lidas         |
| POST   | `/`              | admin   | Criar notificação               |

---

## Empresas — `/api/companies`

| Método | Rota                        | Role        | Descrição                    |
|--------|-----------------------------|-------------|------------------------------|
| GET    | `/`                         | todos       | Listar empresas              |
| GET    | `/:id`                      | todos       | Detalhe                      |
| PATCH  | `/:id`                      | owner, admin| Atualizar                    |
| POST   | `/:id/approve`              | admin       | Aprovar empresa              |
| POST   | `/:id/reject`               | admin       | Reprovar empresa             |
| POST   | `/:id/suspend`              | admin       | Suspender empresa            |
| POST   | `/:id/reactivate`           | admin       | Reativar empresa suspensa    |

---

## Máquinas — `/api/machines`

| Método | Rota         | Role              | Descrição                       |
|--------|--------------|-------------------|---------------------------------|
| GET    | `/`          | todos             | Listar máquinas                 |
| GET    | `/:id`       | todos             | Detalhe                         |
| POST   | `/`          | fornecedor, admin | Cadastrar máquina               |
| PATCH  | `/:id`       | owner, admin      | Atualizar                       |
| DELETE | `/:id`       | owner, admin      | Remover máquina                 |

---

## Uploads — `/api/uploads`

| Método | Rota    | Auth             | Descrição                                   |
|--------|---------|------------------|---------------------------------------------|
| POST   | `/`     | ✅              | Upload de arquivo(s) (multipart/form-data)  |
| GET    | `/:id`  | depende*         | Servir arquivo                              |

---

## Calendário — `/api/calendar`

| Método | Rota         | Role              | Descrição                     |
|--------|--------------|-------------------|-------------------------------|
| GET    | `/`          | todos             | Listar slots de capacidade    |
| PUT    | `/`          | fornecedor, admin | Criar/substituir slots        |
| GET    | `/stats`     | todos             | Resumo de ocupação            |

---

## Auditoria — `/api/audit`

| Método | Rota        | Role  | Descrição                            |
|--------|-------------|-------|--------------------------------------|
| GET    | `/`         | admin | Listar logs (userId, tipo, ref, date) |

---

## SSE — `/api/events`

```
GET /api/events?token=<JWT>
```

Mantém conexão SSE aberta. Eventos emitidos em tempo real para a empresa/role do usuário.

---

## Health

| Rota             | Descrição                                             |
|------------------|-------------------------------------------------------|
| `GET /health`    | Readiness: DB + Redis + sequences + migrations + storage |
| `GET /health/live` | Liveness: apenas "estou vivo"                       |

---

## Métricas

```
GET /metrics
Header: X-Metrics-Token: <METRICS_TOKEN>
```

Formato Prometheus. Protegido em produção.
