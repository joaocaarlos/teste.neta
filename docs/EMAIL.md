# E-mail Transacional — CapaCity

Guia de setup, configuração de DNS e operação dos e-mails da plataforma.

## Provedor

**Resend** (recomendado) com fallback SMTP. Configuração via env vars:

```bash
# Produção: Resend
RESEND_API_KEY=re_xxxxxxxxxxxx
MAIL_FROM="CapaCity <noreply@capacity.com.br>"

# Fallback: SMTP genérico
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIAxxxxxxxxxxxxxxxx
SMTP_PASS=xxxxxxxxxxxxxxxxxx

# Dev: console stub (nenhuma var setada -> loga no console)
```

## DNS — Domínio remetente

### 1. SPF

```
Tipo:  TXT
Host:  @  (raiz do domínio)
Valor: v=spf1 include:_spf.resend.com include:amazonses.com ~all
TTL:   3600
```

### 2. DKIM

```
Tipo:  CNAME
Host:  resend._domainkey
Valor: resend.delivery.resend.com
```

### 3. DMARC

```
Tipo:  TXT
Host:  _dmarc
Valor: v=DMARC1; p=quarantine; rua=mailto:dmarc@capacity.com.br; pct=100
```

Estratégia de rollout:
1. Semana 1-2: `p=none` (apenas monitora)
2. Semana 3-4: `p=quarantine`
3. Mês 2+: `p=reject`

## Validação dos registros

```bash
dig TXT capacity.com.br +short                      # SPF
dig TXT resend._domainkey.capacity.com.br +short    # DKIM
dig TXT _dmarc.capacity.com.br +short               # DMARC
```

Alvo: **10/10 no mail-tester.com**.

## Templates

Localização: `api/src/lib/email-templates.ts`

| Trigger                              | Template            | Para quem  |
|--------------------------------------|---------------------|------------|
| Cadastro                             | `welcome`           | Novo user  |
| Após cadastro                        | `emailVerify`       | Novo user  |
| Esqueci senha                        | `passwordReset`     | User       |
| Nova proposta na sua demanda         | `proposalReceived`  | Demandante |
| Sua proposta foi aceita              | `proposalAccepted`  | Fornecedor |
| Contrato assinado por contraparte    | `contractSigned`    | Ambos      |
| Pagamento confirmado em escrow       | `paymentReceived`   | Fornecedor |
| Pagamento liberado da escrow         | `paymentReleased`   | Fornecedor |
| Disputa aberta                       | `disputeOpened`     | Ambos+Admin|
| KYC aprovado                         | `kycApproved`       | Empresa    |
| KYC reprovado/pendente               | `kycRejected`       | Empresa    |
| Resumo semanal (opt-in)              | `weeklyDigest`      | User       |

## Operação

### Métricas a acompanhar

| Métrica          | Alvo        |
|------------------|-------------|
| Delivery rate    | > 98%       |
| Open rate        | > 40%       |
| Spam complaint   | < 0.1%      |
| Bounce rate      | < 2%        |
| Tempo até inbox  | < 30s       |

### Fila de envio (BullMQ)

E-mails passam pela fila `email-queue` (Redis-backed). Permite:
- Retry automático com backoff exponencial
- Não bloquear a request HTTP
- Reordenar prioridades (transacional > digest)

Implementado em `api/src/lib/email-queue.ts`.

## Troubleshooting

### "E-mails caem no spam"

1. Verifique SPF, DKIM, DMARC no `mail-tester.com`
2. Aqueça o domínio gradualmente
3. Evite palavras gatilho no subject: GRÁTIS, URGENTE, 100% OFF
4. Mantenha ratio HTML:texto razoável
5. Sempre tenha unsubscribe link

### "DKIM falhando"

- Confirme que copiou o valor completo (chave RSA é longa, ~400 chars)
- Tempo de propagação: até 24h
