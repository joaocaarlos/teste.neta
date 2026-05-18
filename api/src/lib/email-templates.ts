/**
 * Templates HTML responsivos para e-mails transacionais.
 *
 * Design tokens — bg #070708, amber #E8A020, white #F2EDE4
 * Testado em: Gmail web/mobile, Outlook 365, Apple Mail, Yahoo, Spark.
 *
 * Princípios:
 * - Inline CSS (Gmail strip <style>)
 * - Tables-based layout (Outlook)
 * - Largura máx 600px
 * - Fonte fallback sans-serif (Gmail não baixa custom fonts)
 * - Sempre ter texto alternativo plain text
 */

const APP_URL = process.env.APP_URL || "https://capacity.com.br";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "suporte@capacity.com.br";
const PRIVACY_URL = `${APP_URL}/privacidade`;
const TERMS_URL = `${APP_URL}/termos`;
const UNSUB_URL = `${APP_URL}/configuracoes/notificacoes`;

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function layout(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { url: string; label: string };
  footerNote?: string;
}): string {
  const { preheader, title, bodyHtml, cta, footerNote } = opts;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F2EDE4;">
<div style="display:none;font-size:1px;max-height:0px;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#070708;">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#0F0F11;border:1px solid rgba(255,255,255,0.07);">
      <tr><td style="padding:32px 32px 24px 32px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr><td style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#F2EDE4;">CAP<span style="color:#E8A020;">A</span>CITY</td></tr>
          <tr><td style="font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#5A5650;padding-top:4px;">Marketplace B2B Industrial</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px 0;font-family:'Barlow Condensed',Arial,sans-serif;font-size:24px;font-weight:800;color:#F2EDE4;text-transform:uppercase;">${escapeHtml(title)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#A89F93;">${bodyHtml}</div>
        ${cta ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:32px 0 8px 0;"><tr><td style="background-color:#E8A020;"><a href="${escapeAttr(cta.url)}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#070708;text-decoration:none;text-transform:uppercase;">${escapeHtml(cta.label)}</a></td></tr></table>` : ""}
        ${footerNote ? `<p style="margin:32px 0 0;padding-top:24px;border-top:1px solid rgba(255,255,255,0.07);font-size:12px;color:#5A5650;">${footerNote}</p>` : ""}
      </td></tr>
      <tr><td style="padding:24px 32px;background-color:#070708;border-top:1px solid rgba(255,255,255,0.07);">
        <p style="margin:0;font-size:11px;color:#5A5650;">
          <a href="${PRIVACY_URL}" style="color:#A89F93;">Privacidade</a> &middot;
          <a href="${TERMS_URL}" style="color:#A89F93;">Termos</a> &middot;
          <a href="${UNSUB_URL}" style="color:#A89F93;">Prefer&ecirc;ncias</a> &middot;
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#A89F93;">${SUPPORT_EMAIL}</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export const emailTemplates = {
  welcome: (name: string): EmailTemplate => ({
    subject: `Bem-vindo à CapaCity, ${name.split(" ")[0]}`,
    text: `Olá ${name},\n\nSua conta na CapaCity foi criada.\n\nEquipe CapaCity\n${APP_URL}`,
    html: layout({
      preheader: `Sua conta CapaCity está pronta.`,
      title: `Bem-vindo, ${name.split(" ")[0]}`,
      bodyHtml: `<p>Sua conta foi criada com sucesso.</p><p>Em poucos minutos você pode publicar demandas ou enviar propostas.</p>`,
      cta: { url: `${APP_URL}/dashboard`, label: "Ir para o dashboard" },
    }),
  }),

  emailVerify: (token: string): EmailTemplate => {
    const url = `${APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
    return {
      subject: `Confirme seu e-mail na CapaCity`,
      text: `Confirme seu e-mail acessando: ${url}\n\nLink válido por 24h.`,
      html: layout({
        preheader: `Um clique para liberar seu acesso completo.`,
        title: `Confirme seu e-mail`,
        bodyHtml: `<p>Clique no botão abaixo para confirmar que este e-mail é seu. O link expira em 24h.</p>`,
        cta: { url, label: "Confirmar e-mail" },
        footerNote: `Se você não criou uma conta na CapaCity, ignore este e-mail.`,
      }),
    };
  },

  passwordReset: (token: string, name: string): EmailTemplate => {
    const url = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;
    return {
      subject: `Redefinir sua senha — CapaCity`,
      text: `Olá ${name},\n\nAcesse para redefinir sua senha:\n${url}\n\nLink válido por 1 hora.`,
      html: layout({
        preheader: `Link de redefinição válido por 1 hora.`,
        title: `Redefinir senha`,
        bodyHtml: `<p>Olá <strong style="color:#F2EDE4;">${escapeHtml(name)}</strong>,</p><p>Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>`,
        cta: { url, label: "Criar nova senha" },
        footerNote: `Se você não pediu redefinição, ignore este e-mail.`,
      }),
    };
  },

  proposalReceived: (opts: { demandTitle: string; demandId: string; proposalCount: number; supplierName: string }): EmailTemplate => {
    const url = `${APP_URL}/demandas/${opts.demandId}/propostas`;
    return {
      subject: `Nova proposta para "${opts.demandTitle}"`,
      text: `${opts.supplierName} enviou uma proposta para sua demanda "${opts.demandTitle}".\n\nVeja em: ${url}`,
      html: layout({
        preheader: `${opts.supplierName} respondeu sua demanda.`,
        title: `Nova proposta recebida`,
        bodyHtml: `<p><strong style="color:#F2EDE4;">${escapeHtml(opts.supplierName)}</strong> enviou uma proposta para: <strong>${escapeHtml(opts.demandTitle)}</strong></p>`,
        cta: { url, label: "Ver propostas" },
      }),
    };
  },

  proposalAccepted: (opts: { demandTitle: string; proposalId: string }): EmailTemplate => {
    const url = `${APP_URL}/propostas/${opts.proposalId}`;
    return {
      subject: `Sua proposta foi aceita — ${opts.demandTitle}`,
      text: `Sua proposta foi aceita! Próximos passos: assinar contrato em ${url}`,
      html: layout({
        preheader: `Parabéns! Seu pedido foi confirmado.`,
        title: `Proposta aceita`,
        bodyHtml: `<p>Sua proposta para <strong style="color:#F2EDE4;">${escapeHtml(opts.demandTitle)}</strong> foi aceita.</p>`,
        cta: { url, label: "Ir para o pedido" },
      }),
    };
  },

  contractSigned: (opts: { contractId: string; otherParty: string }): EmailTemplate => {
    const url = `${APP_URL}/contratos/${opts.contractId}`;
    return {
      subject: `Contrato assinado por ${opts.otherParty}`,
      text: `${opts.otherParty} assinou o contrato. Veja em: ${url}`,
      html: layout({
        preheader: `Mais um passo concluído.`,
        title: `Contrato assinado`,
        bodyHtml: `<p><strong style="color:#F2EDE4;">${escapeHtml(opts.otherParty)}</strong> assinou o contrato.</p>`,
        cta: { url, label: "Ver contrato" },
      }),
    };
  },

  paymentReceived: (opts: { orderId: string; amount: string }): EmailTemplate => {
    const url = `${APP_URL}/pedidos/${opts.orderId}`;
    return {
      subject: `Pagamento recebido — ${opts.orderId}`,
      text: `Pagamento de ${opts.amount} recebido e retido em escrow.\n\nAcompanhe em: ${url}`,
      html: layout({
        preheader: `${opts.amount} retido em escrow.`,
        title: `Pagamento confirmado`,
        bodyHtml: `<p>Pagamento de <strong style="color:#22C55E;">${escapeHtml(opts.amount)}</strong> confirmado e retido em escrow até o aceite da entrega.</p>`,
        cta: { url, label: "Acompanhar pedido" },
      }),
    };
  },

  paymentReleased: (opts: { orderId: string; amount: string }): EmailTemplate => {
    const url = `${APP_URL}/financeiro`;
    return {
      subject: `Pagamento liberado — ${opts.amount}`,
      text: `Liberamos ${opts.amount} para sua conta. Pedido ${opts.orderId}.\n\nDetalhes: ${url}`,
      html: layout({
        preheader: `${opts.amount} a caminho da sua conta.`,
        title: `Pagamento liberado`,
        bodyHtml: `<p><strong style="color:#22C55E;">${escapeHtml(opts.amount)}</strong> foi liberado para sua conta bancária. O crédito aparece em até 2 dias úteis.</p>`,
        cta: { url, label: "Ver financeiro" },
      }),
    };
  },

  disputeOpened: (opts: { disputeId: string; orderId: string; type: string }): EmailTemplate => {
    const url = `${APP_URL}/disputas/${opts.disputeId}`;
    return {
      subject: `Disputa aberta — ${opts.orderId}`,
      text: `Uma disputa foi aberta no pedido ${opts.orderId}. Tipo: ${opts.type}.\n\nResponda em até 48h: ${url}`,
      html: layout({
        preheader: `Responda em até 48h para mediação rápida.`,
        title: `Disputa aberta`,
        bodyHtml: `<p>Uma disputa foi aberta no pedido <strong>${escapeHtml(opts.orderId)}</strong>. Tipo: <strong style="color:#F97316;">${escapeHtml(opts.type)}</strong></p><p>Responda com sua versão e evidências. Nossa equipe medeia em até 48h úteis.</p>`,
        cta: { url, label: "Responder disputa" },
      }),
    };
  },

  kycApproved: (opts: { companyName: string }): EmailTemplate => ({
    subject: `${opts.companyName} aprovada na CapaCity`,
    text: `Sua empresa ${opts.companyName} foi aprovada no KYC.\n\n${APP_URL}/dashboard`,
    html: layout({
      preheader: `Verificação concluída. Acesso liberado.`,
      title: `Empresa aprovada`,
      bodyHtml: `<p>A verificação de <strong style="color:#F2EDE4;">${escapeHtml(opts.companyName)}</strong> foi concluída. Vocês já podem operar plenamente.</p>`,
      cta: { url: `${APP_URL}/dashboard`, label: "Acessar dashboard" },
    }),
  }),

  kycRejected: (opts: { companyName: string; reason: string }): EmailTemplate => ({
    subject: `Verificação pendente — ${opts.companyName}`,
    text: `A verificação de ${opts.companyName} precisa de atenção:\n${opts.reason}`,
    html: layout({
      preheader: `Precisamos de mais informações.`,
      title: `Verificação pendente`,
      bodyHtml: `<p>Sua verificação de <strong>${escapeHtml(opts.companyName)}</strong> precisa de atenção.</p><p style="border-left:3px solid #E8A020;padding:12px 16px;"><strong>Motivo:</strong> ${escapeHtml(opts.reason)}</p>`,
      cta: { url: `${APP_URL}/configuracoes/empresa`, label: "Atualizar dados" },
    }),
  }),

  weeklyDigest: (opts: { name: string; newDemands: number; newProposals: number; openOrders: number }): EmailTemplate => ({
    subject: `Resumo semanal CapaCity — ${opts.newDemands} novidades`,
    text: `Olá ${opts.name},\n\nResumo da semana:\n- ${opts.newDemands} novas demandas\n- ${opts.newProposals} novas propostas\n- ${opts.openOrders} pedidos em andamento\n\n${APP_URL}/dashboard`,
    html: layout({
      preheader: `${opts.newDemands} novidades para você.`,
      title: `Resumo semanal`,
      bodyHtml: `<p>Olá <strong style="color:#F2EDE4;">${escapeHtml(opts.name)}</strong>,</p><p>Resumo dos últimos 7 dias: <strong style="color:#E8A020;">${opts.newDemands}</strong> demandas, <strong style="color:#22C55E;">${opts.newProposals}</strong> propostas, <strong style="color:#3B82F6;">${opts.openOrders}</strong> pedidos em produção.</p>`,
      cta: { url: `${APP_URL}/dashboard`, label: "Ver detalhes" },
    }),
  }),
};
