#!/bin/bash
# Health monitor — rode como cron job a cada 5 minutos
# Exemplo de crontab: */5 * * * * /opt/capacity/scripts/health-monitor.sh
#
# Envia alerta para Slack/webhook e opcionalmente por e-mail se algum serviço
# ficar unhealthy.
#
# Variáveis de ambiente:
#   API_URL            URL base da API       (default: http://localhost:3001)
#   SLACK_WEBHOOK_URL  Incoming webhook URL  (optional)
#   ALERT_EMAIL        Endereço para e-mail  (optional, requer mailutils/sendmail)
#   ALERT_LOG          Caminho do log        (default: /var/log/capacity-alerts.log)

set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
ALERT_LOG="${ALERT_LOG:-/var/log/capacity-alerts.log}"
HEALTH_TMP="/tmp/capacity_health_response_$$.json"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$ALERT_LOG" >&2
}

send_alert() {
  local msg="$1"
  log "ALERT: $msg"

  if [ -n "$WEBHOOK_URL" ]; then
    curl -s -m 10 -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \":rotating_light: CapaCity Alert: $msg\"}" >/dev/null 2>&1 || true
  fi

  if [ -n "$ALERT_EMAIL" ] && command -v sendmail >/dev/null 2>&1; then
    printf "Subject: [CapaCity] %s\n\n%s\n" "$msg" "$msg" \
      | sendmail "$ALERT_EMAIL" 2>/dev/null || true
  fi
}

cleanup() {
  rm -f "$HEALTH_TMP"
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

check_health() {
  local http_code
  http_code=$(curl -s -m 10 -o "$HEALTH_TMP" -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")

  if [ "$http_code" != "200" ] && [ "$http_code" != "503" ]; then
    send_alert "CRITICAL: API health endpoint unreachable (HTTP $http_code). URL: $API_URL/health"
    return 1
  fi

  if [ ! -s "$HEALTH_TMP" ]; then
    send_alert "CRITICAL: API returned empty health response (HTTP $http_code)"
    return 1
  fi

  # Overall status
  local overall
  overall=$(python3 -c "import sys,json; d=json.load(open('$HEALTH_TMP')); print(d.get('status','unknown'))" 2>/dev/null || echo "unknown")

  if [ "$overall" != "ok" ]; then
    send_alert "CRITICAL: API health status is '$overall' (HTTP $http_code)"
  fi

  # DB check
  local db_ok
  db_ok=$(python3 -c "import sys,json; d=json.load(open('$HEALTH_TMP')); print(d['checks']['db']['ok'])" 2>/dev/null || echo "False")
  if [ "$db_ok" != "True" ]; then
    send_alert "CRITICAL: Database is unhealthy — check PostgreSQL logs"
  fi

  # Redis check
  local redis_ok
  redis_ok=$(python3 -c "import sys,json; d=json.load(open('$HEALTH_TMP')); print(d['checks']['redis']['ok'])" 2>/dev/null || echo "False")
  if [ "$redis_ok" != "True" ]; then
    send_alert "WARNING: Redis is unhealthy — sessions and caching affected"
  fi

  # Storage / uploads check
  local uploads_ok
  uploads_ok=$(python3 -c "import sys,json; d=json.load(open('$HEALTH_TMP')); print(d['checks'].get('uploads',{}).get('ok','False'))" 2>/dev/null || echo "False")
  if [ "$uploads_ok" != "True" ]; then
    send_alert "WARNING: Upload storage is unhealthy — file operations may fail"
  fi

  # DB latency check (warn if > 200 ms)
  local db_latency
  db_latency=$(python3 -c "import sys,json; d=json.load(open('$HEALTH_TMP')); print(d['checks']['db'].get('latencyMs', 0))" 2>/dev/null || echo "0")
  if [ "$db_latency" -gt 200 ] 2>/dev/null; then
    send_alert "WARNING: Database latency is high (${db_latency}ms) — expected < 200ms"
  fi

  log "INFO: Health check passed (status=$overall, db_latency=${db_latency}ms)"
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

log "INFO: Running health check against $API_URL"
check_health
