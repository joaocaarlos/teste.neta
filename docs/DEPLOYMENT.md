# Deploy — CapaCity

## Ambientes

| Ambiente   | Branch  | Trigger       | Aprovação |
|------------|---------|---------------|----------|
| staging    | main    | automático    | não      |
| production | main    | manual        | sim      |

---

## Requisitos do servidor

- Ubuntu 22.04 LTS (recomendado)
- Docker + Docker Compose v2
- 2+ vCPUs, 4+ GB RAM, 40+ GB disco
- Portas 80 e 443 abertas
- Chave SSH configurada

---

## Setup inicial do servidor

```bash
# 1. Instalar Docker
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
newgrp docker

# 2. Instalar Docker Compose
sudo apt-get install docker-compose-plugin

# 3. Criar diretório do projeto
sudo mkdir -p /opt/capacity
sudo chown $USER:$USER /opt/capacity
cd /opt/capacity

# 4. Clonar repositório
git clone https://github.com/seu-usuario/capacity.git .

# 5. Configurar variáveis de ambiente
cp .env.example .env
nano .env   # editar com valores de produção

# 6. Configurar nginx (reverse proxy)
sudo apt install nginx certbot python3-certbot-nginx

# 7. Certificado TLS
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

---

## Configuração do nginx

```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com.br;

    ssl_certificate     /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SSE -- sem timeout
    location /api/events {
        proxy_pass http://localhost:3001;
        proxy_read_timeout 3600s;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }

    location /docs {
        proxy_pass http://localhost:3001;
    }
}
```

---

## Primeiro deploy

```bash
cd /opt/capacity
docker compose up -d --build
watch docker compose ps
docker compose logs -f api
```

---

## Deploy automatizado (CI/CD)

O pipeline `.github/workflows/deploy.yml` executa:

1. Build + push das imagens para GHCR com tag `:sha`
2. SSH para o servidor
3. `docker compose pull` + `docker compose up -d`
4. Health check loop (18 x 10s)
5. Rollback se health check falhar

### Configurar secrets no GitHub

```
GHCR_TOKEN         -> PAT com write:packages
SSH_HOST           -> IP ou hostname do servidor
SSH_USER           -> usuário com acesso Docker
SSH_KEY            -> conteúdo da chave privada (~/.ssh/id_ed25519)
DEPLOY_PATH        -> /opt/capacity
```

---

## Rollback manual

```bash
cd /opt/capacity
docker images | grep capacity
# Editar docker-compose.yml para usar tag anterior
docker compose up -d --no-deps api frontend
curl http://localhost:3001/health | jq .status
```

---

## Backup automático

```bash
#!/bin/bash
set -e
BACKUP_DIR=/opt/backups/capacity
DATE=$(date +%Y%m%d_%H%M)
mkdir -p $BACKUP_DIR

docker exec capacity_db pg_dump -U capacity capacity \
  | gzip > $BACKUP_DIR/db_$DATE.sql.gz

ls -t $BACKUP_DIR/db_*.sql.gz | tail -n +31 | xargs rm -f
```

```bash
# Cron: diariamente as 3h
echo "0 3 * * * /opt/scripts/backup-capacity.sh >> /var/log/capacity-backup.log 2>&1" | crontab -
```
