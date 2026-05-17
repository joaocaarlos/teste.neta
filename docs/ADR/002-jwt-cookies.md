# ADR-002: JWT em cookies httpOnly

**Status:** Aceito  
**Data:** 2025-01

## Contexto

Precisa-se armazenar o token de autenticação no cliente de forma segura.

## Decisão

JWT transportado em **cookie httpOnly** (`access_token`) + CSRF token em cookie legível por JS (`csrf_token`).

## Alternativas consideradas

1. **JWT em localStorage** — vulnerável a XSS; qualquer script malicioso pode ler
2. **JWT em memória (variável React)** — perde ao recarregar a página; má UX
3. **Cookie httpOnly (escolhido)** — não acessível por JS, imune a XSS

## Justificativa

- Cookie httpOnly é o padrão recomendado para SPAs com backend próprio
- CSRF protegido pelo double-submit cookie pattern (cookie + header X-CSRF-Token)
- `sameSite: strict` previne CSRF em cross-site requests
- Refresh token em cookie com `path: /api/auth` — escopo restrito

## Consequências

- Requer `credentials: "include"` em todos os fetches
- Não funciona com `Access-Control-Allow-Origin: *` (deve ser domínio específico)
- CSRF deve ser implementado manualmente (feito em `auth.ts`)
- Teste com supertest requer manipulação de cookies (feito no setup de testes)
