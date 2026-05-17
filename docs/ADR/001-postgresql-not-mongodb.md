# ADR-001: PostgreSQL em vez de MongoDB

**Status:** Aceito  
**Data:** 2025-01

## Contexto

O CapaCity opera com entidades fortemente relacionadas: empresas → usuários → demandas → propostas → pedidos → contratos → transações → disputas. Há transações financeiras com garantias ACID.

## Decisão

Usar **PostgreSQL 16** como banco principal.

## Justificativa

- Relações fortes exigem JOINs eficientes — SQL é superior ao lookup manual do MongoDB
- Transações ACID obrigatórias para aceite de proposta (cria order + transaction + contract atomicamente)
- `pg_trgm` para busca fuzzy nativa
- `pgcrypto` para `crypt()` no seed (bcrypt compatível)
- ENUMs para status — previne valores inválidos no nível do banco
- Sequences para IDs legíveis (`DM-00001`, `PR-00001`...)
- Equipe mais familiarizada com SQL do que com MongoDB aggregation pipelines

## Consequências

- Schema rígido: mudanças exigem migrations
- Escalabilidade horizontal mais complexa (mas irrelevante no MVP)
- Queries complexas possíveis sem ORM (usamos `pg` raw, não Prisma/TypeORM)
