#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CapaCity — Setup rápido para desenvolvimento local (sem Docker)
# Uso: bash scripts/dev-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m' GRN='\033[0;32m' YEL='\033[1;33m' BLU='\033[0;34m' NC='\033[0m'
info()    { echo -e "${BLU}[INFO]${NC} $*"; }
success() { echo -e "${GRN}[OK]${NC}   $*"; }
warn()    { echo -e "${YEL}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ─── 1. Verificar dependências ────────────────────────────────────────────────
info "Verificando dependências..."
command -v node  >/dev/null 2>&1 || error "Node.js não encontrado. Instale em https://nodejs.org (v18+)"
command -v npm   >/dev/null 2>&1 || error "npm não encontrado."
command -v psql  >/dev/null 2>&1 || error "PostgreSQL não encontrado. Instale: https://postgresql.org"
command -v redis-cli >/dev/null 2>&1 || warn "Redis não encontrado — sessões usarão memória local."

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[[ "$NODE_VER" -lt 18 ]] && error "Node.js 18+ necessário (atual: $NODE_VER)"
success "Node.js $(node --version) OK"

# ─── 2. Criar .env se não existir ─────────────────────────────────────────────
ENV_FILE="$REPO_ROOT/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  info "Criando .env com segredos gerados automaticamente..."

  JWT_SECRET=$(node -e "require('crypto').randomBytes(48).toString('base64')" 2>/dev/null || openssl rand -base64 48)
  DB_PASS=$(node -e "require('crypto').randomBytes(24).toString('base64')" 2>/dev/null || openssl rand -base64 24)

  cat > "$ENV_FILE" << ENVEOF
# Gerado por dev-setup.sh — NÃO commit este arquivo!
NODE_ENV=development

# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_USER=capacity
DB_PASS=${DB_PASS}
DB_NAME=capacity
DB_POOL_MAX=5

# Redis (deixe REDIS_PASS vazio se não usar senha)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# App
PORT=3001
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
BCRYPT_ROUNDS=10

# Upload (disk = pasta local, sem MinIO necessário)
UPLOAD_DIR=./uploads
UPLOAD_MAX_BYTES=10485760
UPLOAD_STORAGE=disk

# Email (desabilitado localmente)
REQUIRE_EMAIL_VERIFICATION=false
EMAIL_QUEUE_ENABLED=false
MAIL_FROM=noreply@capacity.local

# Pagamentos
PAYMENTS_PROVIDER=manual
ALLOW_MANUAL_PAYMENTS=true

# Misc
RUN_MIGRATIONS=true
RATE_LIMIT_MAX=500
LOG_LEVEL=warn
ENABLE_API_DOCS=true
ENVEOF
  success ".env criado em $ENV_FILE"
else
  warn ".env já existe — pulando criação."
fi

# ─── 3. Instalar dependências npm ─────────────────────────────────────────────
info "Instalando dependências da API..."
npm install --prefix "$REPO_ROOT/api" --silent
success "API OK"

info "Instalando dependências do Frontend..."
npm install --prefix "$REPO_ROOT/frontend" --silent
success "Frontend OK"

# ─── 4. Configurar PostgreSQL ─────────────────────────────────────────────────
info "Configurando PostgreSQL..."

# Carregar variáveis do .env
set -a
source "$ENV_FILE"
set +a

# Testar conexão como superusuário
PG_SUPER=""
for u in postgres "$USER" "$(whoami)"; do
  if psql -U "$u" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
    PG_SUPER="$u"
    break
  fi
done

if [[ -z "$PG_SUPER" ]]; then
  warn "Não foi possível conectar ao PostgreSQL automaticamente."
  echo ""
  echo "Execute manualmente:"
  echo "  psql -U postgres -c \"CREATE USER capacity WITH PASSWORD 'sua-senha';\""
  echo "  psql -U postgres -c \"CREATE DATABASE capacity OWNER capacity;\""
  echo ""
else
  psql -U "$PG_SUPER" -d postgres -c "
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
        CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
      ELSE
        ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
      END IF;
    END
    \$\$;
  " >/dev/null 2>&1

  psql -U "$PG_SUPER" -d postgres -c "
    SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
    WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}')
  " -t | psql -U "$PG_SUPER" -d postgres >/dev/null 2>&1 || true

  # Dar permissão ao usuário
  psql -U "$PG_SUPER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" >/dev/null 2>&1
  psql -U "$PG_SUPER" -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};" >/dev/null 2>&1 || true

  success "Banco '$DB_NAME' e usuário '$DB_USER' prontos"
fi

# ─── 5. Instruções finais ─────────────────────────────────────────────────────
echo ""
echo -e "${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GRN}  Setup concluído! Para iniciar o projeto:${NC}"
echo -e "${GRN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Terminal 1 (API):"
echo -e "    ${YEL}cd api && npm run dev${NC}"
echo ""
echo "  Terminal 2 (Frontend):"
echo -e "    ${YEL}cd frontend && npm run dev${NC}"
echo ""
echo "  Acesse: http://localhost:3000"
echo ""
echo "  Credenciais demo:"
echo "    Demandante : joao@metalparts.com.br   / demo123"
echo "    Fornecedor : pedro@metalprime.com.br  / demo123"
echo "    Admin      : admin@capacity.com.br    / admin123"
echo ""
