# ADR 004 — Caching Strategy com Redis

**Status:** Proposed  
**Date:** 2026-05-12  
**Deciders:** Tech Lead, Backend Team

## Context

CapaCity enfrenta escalabilidade em listas com muitos JOINs (demands, companies, proposals). Sem cache, latência cresce com volume de dados.

### Problema

- Queries em `GET /companies/:id`, `GET /demands?limit=50` levam **100-300ms**
- Database fica saturada em horas de pico
- Sem way de replicar dados de leitura

### Alternativas Consideradas

| Solução | Pros | Cons |
|---|---|---|
| **Redis Cache (Elegida)** | Simples, operações O(1), TTL automático | Overhead de serialização, invalidação manual |
| **Database Materialized View** | Sem overhead de rede, ACID | Refresh lento (15-60min), sem granularidade |
| **Edge Cache (CDN)** | Distribui load, edge latency | Apenas for read-only, queries dinâmicas não servem |
| **Elasticsearch** | Full-text search rápido | Overhead de sincronização, overhead operacional |

## Decision

**Usar Redis com cache layer em aplicação** para:

1. **Hot data**: Entities acessadas frequentemente (companies, demands, proposals)
2. **TTL diferenciado**:
   - Company: 10 minutos (muda menos)
   - Demand: 5 minutos (muda com proposals)
   - Proposal: 3 minutos (muito dinâmico)
3. **Invalidação on-write**: Ao CREATE/UPDATE/DELETE, purgar cache

### Implementação

```typescript
// Use entityCache.company.getOrFetch()
const company = await entityCache.company.getOrFetch(
  companyId,
  () => pool.query("SELECT * FROM companies WHERE id = $1", [companyId])
);

// Invalidar ao editar
await pool.query("UPDATE companies SET ... WHERE id = $1", [companyId]);
await entityCache.company.invalidate(companyId);
```

## Consequences

### Positivas

- Latência em reads: **100-300ms** → **10-50ms** (8-30x faster)
- Database load reduz ~40-60%
- TTL automático limpa dados antigos

### Negativas

- Eventual consistency: dados podem estar stale por até 10 minutos
- Invalidação manual necessária (bug risk se esquecer)
- Redis adiciona ponto de falha (mitiga-se com Sentinel/Cluster)

## Monitoring

- `cache_hits` vs `cache_misses` ratio
- Alertar se hit rate < 70%
- TTL reajustar conforme padrão observado
