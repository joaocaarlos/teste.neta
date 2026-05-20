# On-Call Guide — CapaCity

## Contatos de Escalonamento

| Nível | Quem | Canal | SLA de Resposta |
|-------|------|-------|-----------------|
| L1 — On-call engineer | Engineer plantão | PagerDuty / Slack #alerts | 15 min |
| L2 — Backend lead | Tech lead backend | Slack DM / telefone | 30 min |
| L3 — CTO | CTO | Telefone | 1h (só P0/P1) |
| Infra / Cloud | DevOps | Slack #infra | 30 min |
| Banco de Dados | DBA | Slack #database | 30 min |
| Pagamentos | Stripe Support | https://support.stripe.com | SLA Stripe |

---

## SLAs

| Severidade | Descrição | Tempo de Resposta | RTO | Notificação |
|------------|-----------|-------------------|-----|-------------|
| **P0 — Crítico** | Sistema fora do ar, nenhum usuário consegue acessar | 15 min | 1h | PagerDuty + Slack + E-mail |
| **P1 — Alto** | Funcionalidade core degradada (pagamentos, uploads, auth) | 30 min | 2h | PagerDuty + Slack |
| **P2 — Médio** | Funcionalidade não-core degradada, workaround possível | 2h | 8h | Slack |
| **P3 — Baixo** | Bug cosmético, impacto mínimo | Próximo dia útil | 48h | Ticket |

### SLO (Service Level Objectives)

- **Disponibilidade**: 99,5% mensal (exclui janelas de manutenção programadas)
- **Latência P95**: < 500 ms para endpoints da API
- **Latência P99**: < 2 s para endpoints da API
- **RTO** (Recovery Time Objective): 1h para falhas P0/P1
- **RPO** (Recovery Point Objective): 24h para banco de dados (backup diário)

---

## Processo de Incident Response

### 1. Detecção
- Alerta automático via `health-monitor.sh` (cron a cada 5 min)
- Alerta do Prometheus/Grafana (se monitoring profile ativo)
- Reporte de usuário via Slack #suporte

### 2. Triagem (< 5 min)
```
1. Verifique o endpoint de health: curl http://API_URL/health | jq .
2. Verifique os containers: docker compose ps
3. Verifique os logs recentes: docker compose logs --tail=100 api
4. Determine a severidade (P0/P1/P2/P3)
```

### 3. Comunicação
- **P0/P1**: Avise imediatamente no canal Slack #incidents
  - Abra um thread com: `[INCIDENT] <resumo> — <hora> — Status: Investigando`
  - Atualize a cada 15 minutos
- **P2/P3**: Abra ticket no backlog

### 4. Resolução
- Documente a causa raiz
- Implemente fix ou execute runbook correspondente
- Valide via `/health` e métricas

### 5. Post-mortem (P0/P1 obrigatório)
- Prazo: 48h após resolução
- Template: `docs/runbooks/post-mortem-template.md`
- Compartilhe no canal #engineering

---

## Comandos de Diagnóstico Rápido

```bash
# Saúde geral
curl -s http://localhost:3001/health | jq .

# Status dos containers
docker compose ps

# Logs da API (últimos 200 linhas)
docker compose logs --tail=200 api

# Logs do banco
docker compose logs --tail=100 db

# Entrar no banco
docker compose exec db psql -U capacity -d capacity

# Verificar migrações aplicadas
docker compose exec db psql -U capacity -d capacity \
  -c "SELECT id, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;"

# Reiniciar API (sem downtime de banco/redis)
docker compose restart api

# Rollback de migração (N steps)
docker compose exec api node -e "require('./src/lib/migrations').rollbackMigrations(1)"
```
