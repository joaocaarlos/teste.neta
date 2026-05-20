# Runbook: Disk Full

**Severidade**: P1 (API fora do ar) / P2 (uploads falhando)  
**SLA de Resolução**: RTO 1h (P1), 2h (P2)  
**Serviço Afetado**: Uploads de arquivos, banco de dados, logs

---

## Sintomas

- `/health` retorna `checks.uploads.ok = false`
- Logs mostram: `ENOSPC: no space left on device`
- Uploads de arquivos falham com erro 500
- Banco de dados para de aceitar escritas (WAL cheio)
- Container da API ou DB trava

---

## Diagnóstico

### 1. Verificar uso de disco

```bash
# Disco do host
df -h

# Uso por volume Docker
docker system df -v

# Volume do PostgreSQL
docker run --rm -v capacity_pg_data:/data alpine du -sh /data

# Volume de uploads (se usando disco local)
docker run --rm -v capacity_uploads_data:/data alpine du -sh /data

# Volume do MinIO
docker run --rm -v capacity_minio_data:/data alpine du -sh /data

# Logs dos containers
docker compose logs --no-trunc api 2>&1 | wc -c
```

### 2. Identificar maiores consumidores

```bash
# Top 20 diretórios/arquivos no host
du -sh /var/lib/docker/volumes/* 2>/dev/null | sort -rh | head -20

# Logs do sistema
du -sh /var/log/* 2>/dev/null | sort -rh | head -10

# Arquivos de core dump
find /var /tmp -name "core.*" -size +100M 2>/dev/null
```

### 3. Verificar arquivos antigos de upload

```bash
# Uploads mais antigos (se usando disco local)
docker compose exec api sh -c 'find /app/uploads -type f -mtime +30 | head -20'

# Total de uploads por mês
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT DATE_TRUNC('month', created_at) AS month,
          COUNT(*) AS count,
          SUM(size_bytes) / 1024 / 1024 AS total_mb
   FROM file_uploads
   GROUP BY 1 ORDER BY 1 DESC;"
```

---

## Passos de Recuperação

### Ação Imediata: Liberar espaço rapidamente

```bash
# 1. Limpar imagens Docker não utilizadas
docker image prune -f

# 2. Limpar containers parados
docker container prune -f

# 3. Limpar volumes não utilizados (CUIDADO: não remove volumes em uso)
docker volume prune -f

# 4. Limpar build cache
docker builder prune -f

# 5. Truncar logs dos containers (não perde dados de negócio)
for container in $(docker ps -q); do
  log_path=$(docker inspect --format='{{.LogPath}}' "$container")
  if [ -n "$log_path" ] && [ -f "$log_path" ]; then
    echo "Truncating logs for $container: $log_path"
    truncate -s 0 "$log_path"
  fi
done
```

### Cenário A: Uploads locais antigos

```bash
# ATENÇÃO: Antes de deletar, verifique se os arquivos estão referenciados no banco
# Listar uploads sem referência ativa (órfãos)
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT path, size_bytes, created_at
   FROM file_uploads
   WHERE deleted_at IS NOT NULL
     AND created_at < NOW() - INTERVAL '30 days'
   ORDER BY created_at
   LIMIT 100;"

# Marcar como deletados e remover fisicamente
# (prefira o endpoint de admin se disponível)
docker compose exec api sh -c \
  'find /app/uploads -type f -mtime +90 -name "*.tmp" -delete'
```

### Cenário B: Logs do sistema crescendo descontroladamente

```bash
# Configurar logrotate para logs do Docker (se não existir)
cat > /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
  daily
  missingok
  rotate 7
  compress
  delaycompress
  copytruncate
  maxsize 100M
}
EOF

# Aplicar imediatamente
logrotate -f /etc/logrotate.d/docker-containers

# Limitar tamanho de log no docker-compose.yml (adicionar a cada serviço):
# logging:
#   driver: json-file
#   options:
#     max-size: "100m"
#     max-file: "3"
```

### Cenário C: PostgreSQL WAL cheio

```bash
# Verificar WAL
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0'));"

# Forçar checkpoint para liberar WAL
docker compose exec db psql -U capacity -d capacity -c \
  "CHECKPOINT;"

# Se PostgreSQL parou por falta de espaço, reiniciar após liberar espaço
docker compose restart db
docker compose restart api
```

### Cenário D: Disco cheio — escalar armazenamento (cloud)

```bash
# Se no AWS (EBS):
# 1. Acesse AWS Console > EC2 > Volumes
# 2. Modifique o volume (aumentar size)
# 3. No Linux, redimensionar o filesystem:
growpart /dev/xvda 1
resize2fs /dev/xvda1   # ext4
# ou: xfs_growfs /     # XFS

# Se no DigitalOcean:
# Adicione um novo volume block storage e monte em /var/lib/docker/volumes
# ou migre os dados para o novo volume

# Se usando MinIO em S3 externo:
# Não há limite de disco local — verificar cotas do bucket S3
```

---

## Prevenção

Adicione ao crontab para monitoramento de disco:

```bash
# Alertar quando disco > 80%
0 * * * * df -h / | awk 'NR==2{gsub("%",""); if($5>80) print "DISK: "$5"% used on /"}' \
  | grep -q DISK && curl -s -X POST "$SLACK_WEBHOOK_URL" \
  -d '{"text":"WARNING: Disk usage above 80% on CapaCity server"}' || true
```

Configure limpeza automática de uploads no docker-compose ou como cron job:

```bash
# Limpar arquivos temporários de upload com mais de 24h
0 2 * * * docker compose -f /opt/capacity/docker-compose.yml exec -T api \
  sh -c 'find /app/uploads/tmp -type f -mtime +1 -delete' 2>/dev/null || true
```

---

## Validação Pós-Recuperação

```bash
# Verificar espaço disponível
df -h

# Health check de uploads
curl -s http://localhost:3001/health | jq .checks.uploads

# Testar upload de arquivo pequeno
curl -s -X POST http://localhost:3001/api/v1/uploads \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/tmp/test.txt"
```

---

## Contatos

- **DevOps / Infra**: Ver `00-on-call.md`
- **Cloud Provider Support**: AWS/DigitalOcean/GCP (conforme ambiente)
