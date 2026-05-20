# Service Level Objectives (SLO) — CapaCity

> Versão: 1.0  
> Última revisão: 2026-05-20  
> Responsável: Time de Engenharia

---

## 1. Disponibilidade

| Métrica | Objetivo | Medição |
|---------|----------|---------|
| Disponibilidade mensal | **99,5%** | Uptime medido via health check externo a cada 5 min |
| Manutenção programada | Excluída | Janelas anunciadas com 24h de antecedência via e-mail |

**Cálculo**: Disponibilidade = (1 - taxa_de_falha) × 100%  
Onde: taxa_de_falha = minutos_indisponível / (minutos_totais_no_mês - minutos_manutenção)

**Budget de erros mensal (30 dias)**:
- 99,5% → 216 minutos de downtime permitidos por mês (~3,6h)

---

## 2. Latência

### API (endpoints gerais)

| Percentil | Objetivo | Medição |
|-----------|----------|---------|
| P50 | < 100 ms | Prometheus `capacity_http_request_duration_seconds` |
| P95 | **< 500 ms** | Prometheus `capacity_http_request_duration_seconds` |
| P99 | **< 2 s** | Prometheus `capacity_http_request_duration_seconds` |

### Endpoints Específicos

| Endpoint | P95 | P99 |
|----------|-----|-----|
| `GET /health` | < 200 ms | < 500 ms |
| `POST /api/v1/auth/login` | < 300 ms | < 1 s |
| `GET /api/v1/demands` (listagem) | < 500 ms | < 1.5 s |
| `POST /api/v1/uploads` (upload de arquivo) | < 3 s | < 10 s |

### Banco de Dados

| Métrica | Objetivo |
|---------|----------|
| Latência de query simples (`SELECT 1`) | < 10 ms |
| Latência de query de leitura típica | < 50 ms |
| Latência de query complexa (joins, aggregation) | < 200 ms |

---

## 3. Objetivos de Recuperação

| Objetivo | Valor | Descrição |
|----------|-------|-----------|
| **RTO** (Recovery Time Objective) | **1 hora** | Tempo máximo para restabelecimento após falha P0/P1 |
| **RTO P2** | 8 horas | Para falhas de menor impacto |
| **RPO** (Recovery Point Objective) | **24 horas** | Perda máxima de dados aceitável (backup diário) |

---

## 4. Throughput

| Métrica | Objetivo Mínimo |
|---------|-----------------|
| Requisições simultâneas suportadas | 500 req/s sustentado |
| Uploads simultâneos | 50 uploads em paralelo |
| Conexões ao banco | Pool de até 20 conexões (configurável via `DB_POOL_MAX`) |

---

## 5. Monitoramento e Alertas

### Alertas Automáticos

| Condição | Severidade | Ação |
|----------|------------|------|
| `/health` retorna != 200 | P0 | PagerDuty + Slack |
| `checks.db.ok = false` | P0 | PagerDuty + Slack |
| `checks.redis.ok = false` | P1 | Slack |
| `checks.uploads.ok = false` | P1 | Slack |
| Latência DB > 200 ms | P2 | Slack |
| Disponibilidade < 99,5% no mês | P1 | Revisão de SLO |

### Ferramentas de Monitoramento

- **Health check**: `scripts/health-monitor.sh` (cron a cada 5 min)
- **Métricas**: Prometheus em `http://localhost:9090` (perfil `monitoring`)
- **Dashboards**: Grafana em `http://localhost:3002` (perfil `monitoring`)
- **Endpoint de métricas**: `GET /metrics` (protegido por `METRICS_TOKEN`)
- **Endpoint de health**: `GET /health` (público)

---

## 6. Exclusões do SLO

Os seguintes cenários **não** contam como violação de SLO:

1. Manutenção programada anunciada com 24h de antecedência
2. Incidentes causados por terceiros (Stripe, AWS, etc.) fora de nosso controle
3. Ataques DDoS que excedam as capacidades de rate limiting
4. Falhas causadas por uso fora dos limites documentados (ex: uploads > 10MB)

---

## 7. Revisão do SLO

- **Frequência**: Revisão trimestral pela engenharia
- **Responsável**: Tech Lead Backend + CTO
- **Critério de ajuste**: Se o SLO não for atingido por 2 meses consecutivos, revisar a causa raiz e ajustar objetivo ou arquitetura

---

## 8. Referências

- Runbooks: `docs/runbooks/`
- Observabilidade: `docs/OBSERVABILITY.md`
- Arquitetura: `docs/ARCHITECTURE.md`
- On-call guide: `docs/runbooks/00-on-call.md`
