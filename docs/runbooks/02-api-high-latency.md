# Runbook: API High Latency

**Severidade**: P1 (latência > 2s) / P2 (latência > 500ms)  
**SLA de Resolução**: RTO 2h (P1), 8h (P2)  
**Serviço Afetado**: Todos os endpoints da API

---

## Sintomas

- P95 da API ultrapassa 500ms ou P99 ultrapassa 2s
- Logs mostram linhas com `[SLOW]` (durationMs > 500) no middleware requestMetrics
- Usuários relatam lentidão ou timeouts
- Grafana mostra `capacity_http_request_duration_seconds` elevado
- `/health` retorna `checks.db.latencyMs` > 200ms

---

## Diagnóstico

### 1. Identificar onde está a latência

```bash
# Verificar latência do DB no health check
curl -s http://localhost:3001/health | jq '{db: .checks.db.latencyMs, redis: .checks.redis.latencyMs}'

# Ver logs de requests lentos (últimos 100)
docker compose logs --tail=100 api | grep SLOW
```

### 2. Verificar DB lento

```bash
# Queries lentas em execução agora
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT pid, now() - query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active' AND now() - query_start > INTERVAL '1 second'
   ORDER BY duration DESC;"

# Queries lentas históricas (requer pg_stat_statements)
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC LIMIT 20;"

# Verificar índices faltando (sequential scans)
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT schemaname, tablename, seq_scan, idx_scan,
          n_live_tup, n_dead_tup
   FROM pg_stat_user_tables
   WHERE seq_scan > 100
   ORDER BY seq_scan DESC LIMIT 20;"
```

### 3. Verificar problemas de N+1

```bash
# Ativar log de queries lentas no Postgres (temporário)
docker compose exec db psql -U capacity -d capacity -c \
  "ALTER SYSTEM SET log_min_duration_statement = '100';"
docker compose exec db psql -U capacity -d capacity -c "SELECT pg_reload_conf();"

# Observar logs
docker compose logs -f db | grep duration

# Reverter após diagnóstico
docker compose exec db psql -U capacity -d capacity -c \
  "ALTER SYSTEM SET log_min_duration_statement = '-1';"
docker compose exec db psql -U capacity -d capacity -c "SELECT pg_reload_conf();"
```

### 4. Verificar Redis lento

```bash
# Latência do Redis
docker compose exec redis redis-cli --latency -i 1

# Verificar memória do Redis
docker compose exec redis redis-cli info memory | grep -E "used_memory_human|maxmemory"

# Ver comandos lentos
docker compose exec redis redis-cli slowlog get 10
```

### 5. Verificar recursos do host

```bash
# CPU e memória dos containers
docker stats --no-stream

# CPU do host
top -bn1 | head -20

# I/O disk
iostat -x 1 5 2>/dev/null || iotop -bn 5 2>/dev/null || true
```

---

## Soluções

### Problema: Queries lentas no DB

```bash
# Analisar query específica
docker compose exec db psql -U capacity -d capacity -c \
  "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) <QUERY AQUI>;"

# VACUUM para tabelas com muitos dead tuples
docker compose exec db psql -U capacity -d capacity -c \
  "VACUUM ANALYZE <tablename>;"

# Criar índice emergencial (não bloqueia em CONCURRENT)
docker compose exec db psql -U capacity -d capacity -c \
  "CREATE INDEX CONCURRENTLY idx_<name> ON <table> (<column>);"
```

### Problema: Pool de conexões esgotado

```bash
# Ver conexões ativas
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT count(*), state FROM pg_stat_activity WHERE datname = 'capacity' GROUP BY state;"

# Reduzir pool para liberar conexões ociosas
# .env: DB_POOL_MAX=10
docker compose restart api
```

### Problema: Redis com memória cheia / evictions

```bash
# Ver taxa de eviction
docker compose exec redis redis-cli info stats | grep evicted

# Se memória > 90%, aumentar maxmemory ou limpar keys expiradas
docker compose exec redis redis-cli config set maxmemory 512mb
```

### Problema: CPU alta na API (GC pressure)

```bash
# Aumentar memória disponível para Node.js
# No docker-compose.yml, adicionar na API:
# environment:
#   NODE_OPTIONS: "--max-old-space-size=512"
docker compose restart api
```

---

## Validação Pós-Resolução

```bash
# Latência deve voltar ao normal
curl -s http://localhost:3001/health | jq .checks.db.latencyMs

# Verificar via metrics endpoint
curl -s -H "x-metrics-token: $METRICS_TOKEN" http://localhost:3001/metrics \
  | grep capacity_http_request_duration_seconds

# Logs não devem ter mais SLOW
docker compose logs --tail=50 api | grep -c SLOW
```
