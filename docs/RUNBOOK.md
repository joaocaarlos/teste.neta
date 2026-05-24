# Runbook Operacional — CapaCity

## Procedimentos de rotina

### Verificar saúde do sistema

```bash
docker compose ps
curl http://localhost:3001/health | jq .
```
