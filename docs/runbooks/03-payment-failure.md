# Runbook: Payment Failure

**Severidade**: P1  
**SLA de Resolução**: RTO 2h  
**Serviço Afetado**: Fluxo de pagamento (Stripe / manual)

---

## Sintomas

- Usuários relatam erro ao tentar pagar
- Webhook do Stripe retornando `400` ou `500` nos logs
- `checks.payments` no `/health` está `degraded`
- Transações com status `pending` há mais de 1h sem atualização
- E-mail de confirmação de pagamento não enviado

---

## Diagnóstico

### 1. Verificar configuração do Stripe

```bash
# Verificar se Stripe está configurado
curl -s http://localhost:3001/health | jq .checks.payments

# Verificar variáveis de ambiente
docker compose exec api sh -c 'echo "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:0:10}..."'
docker compose exec api sh -c 'echo "STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:0:10}..."'
```

### 2. Verificar logs do webhook

```bash
# Ver erros no endpoint do webhook
docker compose logs --tail=200 api | grep -i "stripe\|webhook\|payment\|transaction"

# Ver eventos recentes de pagamento no banco
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT id, status, provider, amount, currency, created_at, updated_at
   FROM transactions
   WHERE created_at > NOW() - INTERVAL '2 hours'
   ORDER BY created_at DESC LIMIT 20;"
```

### 3. Verificar no painel Stripe

- Acesse: https://dashboard.stripe.com/webhooks
- Verifique se os eventos recentes estão sendo entregues
- Verifique o endpoint configurado (deve ser: `https://<dominio>/api/transactions/stripe/webhook`)
- Verifique falhas de entrega e clique em "Retry" se necessário

### 4. Verificar transações presas em `pending`

```bash
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT t.id, t.status, t.provider, t.amount, t.currency,
          t.created_at, t.updated_at,
          o.id AS order_id, o.status AS order_status
   FROM transactions t
   JOIN orders o ON o.id = t.order_id
   WHERE t.status = 'pending'
     AND t.created_at < NOW() - INTERVAL '1 hour'
   ORDER BY t.created_at;"
```

---

## Passos de Recuperação

### Cenário A: Webhook não configurado / URL errada

```bash
# 1. No painel Stripe, vá em Developers > Webhooks
# 2. Clique em "Add endpoint"
# 3. URL: https://<seu-dominio>/api/transactions/stripe/webhook
# 4. Eventos a escutar:
#    - payment_intent.succeeded
#    - payment_intent.payment_failed
#    - checkout.session.completed
#    - invoice.paid
#    - customer.subscription.updated
#    - customer.subscription.deleted

# 5. Copie o Webhook Signing Secret e atualize o .env
# STRIPE_WEBHOOK_SECRET=whsec_...

# 6. Reiniciar API para aplicar novo secret
docker compose restart api
```

### Cenário B: Webhook chegando mas sendo rejeitado (assinatura inválida)

```bash
# Verificar timestamp do evento (Stripe rejeita eventos > 5 min antigos)
docker compose logs --tail=50 api | grep "webhook\|signature"

# Verificar se o body chega sem modificação (deve ser raw)
# O endpoint /api/transactions/stripe/webhook usa express.raw() — não deve
# passar por express.json() antes. Verificar a ordem dos middlewares em app.ts.

# Reprocessar manualmente um evento do Stripe:
# No painel: Developers > Webhooks > selecione o evento > "Resend"
```

### Cenário C: Transação presa em `pending` — liberar manualmente

**ATENÇÃO**: Só faça isso após confirmar no painel Stripe que o pagamento foi processado com sucesso.

```bash
# 1. Confirme o PaymentIntent no painel Stripe
#    Acesse: https://dashboard.stripe.com/payments/<payment_intent_id>
#    Verifique se status = "succeeded"

# 2. Atualize a transação no banco (substitua os IDs reais)
docker compose exec db psql -U capacity -d capacity -c \
  "BEGIN;
   UPDATE transactions
   SET status = 'paid', updated_at = NOW()
   WHERE id = '<TRANSACTION_ID>'
     AND status = 'pending';

   -- Atualizar order associada se necessário
   UPDATE orders
   SET status = 'confirmed', updated_at = NOW()
   WHERE id = '<ORDER_ID>'
     AND status = 'pending_payment';
   COMMIT;"

# 3. Disparar e-mail de confirmação manualmente via API (se disponível)
# curl -X POST http://localhost:3001/api/v1/admin/orders/<ORDER_ID>/resend-confirmation \
#   -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Cenário D: Modo manual de pagamentos (Stripe desativado)

```bash
# Verificar se PAYMENTS_PROVIDER=manual está configurado
docker compose exec api sh -c 'echo $PAYMENTS_PROVIDER'

# No modo manual, o admin confirma pagamentos manualmente via painel
# Acesse /admin/payments para aprovar transações pendentes
```

### Cenário E: Stripe em modo incidente

```bash
# Verificar status do Stripe
curl -s https://status.stripe.com/api/v2/status.json | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d['status']['description'])"

# Se Stripe estiver down:
# 1. Informe os usuários via banner no frontend
# 2. Habilite pagamento manual temporariamente:
#    ALLOW_MANUAL_PAYMENTS=true
#    docker compose restart api
```

---

## Validação Pós-Recuperação

```bash
# Health check de pagamentos
curl -s http://localhost:3001/health | jq .checks.payments

# Verificar transações ainda pendentes
docker compose exec db psql -U capacity -d capacity -c \
  "SELECT count(*), status FROM transactions
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;"

# Confirmar que novos webhooks estão sendo processados
docker compose logs -f api | grep -i "payment\|webhook"
```

---

## Contatos

- **Stripe Support**: https://support.stripe.com (plano pago tem suporte 24/7)
- **Stripe Status**: https://status.stripe.com
- **On-call**: Ver `00-on-call.md`
