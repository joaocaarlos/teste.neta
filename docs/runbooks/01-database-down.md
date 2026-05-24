# Runbook: Database Down (PostgreSQL)

**Severidade**: P0  
**SLA de Resolução**: RTO 1h  
**Serviço Afetado**: Toda a aplicação (leitura e escrita)

---

## Sintomas

- `/health` retorna `503` com `checks.db.ok = false`
- Logs da API mostram erros como:
  - `connect ECONNREFUSED 127.0.0.1:5432`
  - `Error: Connection terminated unexpectedly`
  - `too many clients already`
- Todas as requisições autenticadas falham com `500`
- Container `capacity_db` não aparece em `docker compose ps` ou está em `Exit`

---

## Diagnóstico

### 1. Verificar status do container

```bash
docker compose ps db
docker compose logs --tail=50 db
```

### 2. Verificar conectividade

```bash
# De dentro do container da API
docker compose exec api sh -c 'nc -zv db 5432'

# Direto no host
pg_isready -h localhost -p 5433 -U capacity
```

### 3. Verificar uso de disco

```bash
df -h
docker system df
# Volume do postgres
docker run --rm -v capacity_pg_data:/data alpine du -sh /data
```

### 4. Verificar pool de conexões

```bash
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

### 5. Verificar locks

```bash
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT pid, wait_event_type, wait_event, query FROM pg_stat_activity WHERE wait_event IS NOT NULL;"
```

---

## Passos de Recuperação

### Cenário A: Container parado (mais comum)

```bash
# 1. Reiniciar o container
docker compose up -d db

# 2. Aguardar healthcheck passar
docker compose ps db   # esperar "healthy"

# 3. Reiniciar API para reconectar pool
docker compose restart api

# 4. Validar
curl -s http://localhost:3001/health | jq .checks.db
```

### Cenário B: Disco cheio

```bash
# 1. Liberar espaço (ver runbook 04-disk-full.md)
# 2. Reiniciar DB
docker compose restart db
# 3. Reiniciar API
docker compose restart api
```

### Cenário C: Muitas conexões (max_connections atingido)

```bash
# 1. Identificar conexões ociosas longas
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT pid, application_name, state, query_start, query
   FROM pg_stat_activity
   WHERE state = 'idle' AND query_start < NOW() - INTERVAL '5 minutes'
   ORDER BY query_start;"

# 2. Encerrar conexões ociosas (use com cuidado)
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
     AND query_start < NOW() - INTERVAL '10 minutes'
     AND application_name NOT LIKE 'pgAdmin%';"

# 3. Aumentar pool temporariamente se necessário
# No .env: DB_POOL_MAX=10 (reduza para liberar conexões)
docker compose restart api
```

### Cenário D: Corrupção de dados / recovery necessário

```bash
# 1. NÃO reinicie o banco — preserve os dados
# 2. Acione o DBA imediatamente (L2/L3)
# 3. Identifique o último backup disponível:
#    - Backups em: s3://capacity-backups/postgres/ (verificar com DevOps)
# 4. Procedimento de restore é responsabilidade do DBA
```

---

## Validação Pós-Recuperação

```bash
# Health check completo
curl -s http://localhost:3001/health | jq .

# Latência do banco deve ser < 200ms
curl -s http://localhost:3001/health | jq .checks.db.latencyMs

# Verificar migrações
curl -s http://localhost:3001/health | jq .lastMigration
```

---

## Contatos

- **DBA / Infra**: Ver `00-on-call.md`
- **Suporte PostgreSQL**: https://www.postgresql.org/support/
