# ADR 005 — Structured Error Handling com ApplicationError

**Status:** Accepted  
**Date:** 2026-05-12  
**Deciders:** Tech Lead, Backend Team

## Context

Rotas em CapaCity lançavam erros genéricos `Error`, resultando em:
- Respostas HTTP inconsistentes (às vezes 400, às vezes 500)
- Logs sem contexto estruturado
- Cliente não consegue diferenciar erro de validação vs erro de servidor

### Problema

```typescript
// Antigo
throw new Error("Email já existe");  // Que status HTTP?
if (pgErr.code === "23505") {        // Código mágico
  return res.status(409).json({ error: ... });
}
```

## Decision

**Hierarquia de classes ApplicationError**:

```typescript
class ApplicationError {
  code: ErrorCode  // "VALIDATION_ERROR" | "UNAUTHORIZED" | "NOT_FOUND" | ...
  statusCode: number
  detail?: Record<string, unknown>
}

class ValidationError extends ApplicationError { statusCode = 400 }
class AuthenticationError extends ApplicationError { statusCode = 401 }
class NotFoundError extends ApplicationError { statusCode = 404 }
```

### Uso

```typescript
throw new ValidationError("Email inválido", { field: "email" });
throw new AuthenticationError("Token expirado");
throw new NotFoundError("Demand DM-1234 não encontrada");

// Converter DB errors automaticamente
const appErr = parseDatabaseError(pgErr);  // Converte 23505 -> ConflictError
throw appErr;
```

## Consequences

### Positivas

- Respostas HTTP consistentes
- Cliente pode tratar erros por `code`
- Type-safe: TypeScript previne erros de status
- Logging estruturado

### Negativas

- Nova camada de abstração
- Precisa atualizar todas as rotas (migration gradual OK)

## Migration Path

- [ ] Implementar `ApplicationError` e subclasses
- [ ] Atualizar middleware/error.ts
- [ ] Converter 20% das rotas (auth, demands, proposals) — sprint N+1
- [ ] Converter remaining 80% — sprint N+2
