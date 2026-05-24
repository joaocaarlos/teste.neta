# PostgreSQL Slow Query Logging — CapaCity

## Configurar em Produção

### 1. Via `postgresql.conf`

```ini
# Log queries que levam > 1000ms
log_min_duration_statement = 1000  # em millisegundos (-1 = disabled)

# Log prepared statements
log_statement = 'all'               # all | mod | ddl | none
log_duration = on

# Log connections
log_connections = on
log_disconnections = on

# Formato de log
log_line_prefix = '%t [%p] %u@%d '

# Arquivo de log
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_truncate_on_rotation = on
log_rotation_age = 1d
log_rotation_size = 100MB
```

### 2. Via SQL (para mudança runtime)

```sql
ALTER SYSTEM SET log_min_duration_statement TO 1000;
SELECT pg_reload_conf();
SHOW log_min_duration_statement;
```

---

## Analisar Logs

```bash
# No container
docker compose exec postgres tail -f /var/log/postgresql/postgresql.log | grep "duration:"

# Extrair queries > 5000ms
grep "duration: [5-9][0-9][0-9][0-9]\|duration: [0-9][0-9][0-9][0-9][0-9]" \
  /var/log/postgresql/postgresql.log | \
  sort -t: -k2 -rn | \
  head -20
```

---

## EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE
SELECT d.id, d.title, COUNT(p.id) as proposal_count
FROM demands d
LEFT JOIN proposals p ON p.demand_id = d.id
GROUP BY d.id
LIMIT 50;
```

---

## Índices Críticos

```sql
-- Propostas por demanda
CREATE INDEX idx_proposals_demand_id ON proposals(demand_id);

-- Pedidos por supplier
CREATE INDEX idx_orders_supplier_id ON orders(supplier_id, status);

-- Pedidos por cliente
CREATE INDEX idx_orders_client_id ON orders(client_id, status);

-- Notificações não lidas
CREATE INDEX idx_notifications_user_id_lida ON notifications(user_id, lida);

-- Full-text search em demandas
CREATE INDEX idx_demands_fts ON demands USING GIN(
  to_tsvector('portuguese', title || ' ' || process || ' ' || COALESCE(material,''))
);

-- Trigram para fuzzy search
CREATE INDEX idx_demands_title_trgm ON demands USING GIN(title gin_trgm_ops);
```

---

## Monitoramento

### Via pgAdmin (dev)

```
http://localhost:5050
Email: admin@capacity.com
Senha: admin123
```

### Via Prometheus + Grafana

```bash
docker run -d \
  --name postgres_exporter \
  -e DATA_SOURCE_NAME="postgresql://capacity:capacity123@postgres:5432/capacity" \
  -p 9187:9187 \
  prometheuscommunity/postgres-exporter
```

---

## Alertas Sugeridos

```ini
alert: HighSlowQueryCount
  expr: rate(pg_queries_slow[1m]) > 50
  for: 5m
  annotations:
    summary: "{{ $value }} queries lentas/min em produção"

alert: HighDatabaseLatency
  expr: pg_database_query_duration_seconds{quantile="0.95"} > 0.5
  for: 5m
  annotations:
    summary: "P95 latency: {{ $value }}s"
```

---

## Troubleshooting

### Query não retorna resultado rápido?

1. Rodar `EXPLAIN ANALYZE` 
2. Procurar por `Seq Scan` (deve ser evitado)
3. Adicionar índice na coluna de filtro

### Conexões acumulam?

```sql
SELECT datname, usename, count(*) 
FROM pg_stat_activity 
GROUP BY datname, usename;

SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND query_start < NOW() - INTERVAL '1 hour';
```
