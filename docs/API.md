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
