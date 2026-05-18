/**
 * Política de Privacidade — texto base conforme LGPD (Lei 13.709/2018).
 * IMPORTANTE: revisar com advogado antes do lançamento.
 */
export function PrivacyPage() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "60px 24px",
      }}
    >
      <article
        style={{
          maxWidth: 760,
          margin: "0 auto",
          fontFamily: "var(--body)",
          color: "var(--white)",
          lineHeight: 1.7,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--cond)",
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: ".04em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Política de <span style={{ color: "var(--amber)" }}>Privacidade</span>
        </h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--white3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 40 }}>
          Última atualização: 11 de novembro de 2026
        </p>

        <section style={{ marginBottom: 32 }}>
          <p>
            A CapaCity (CNPJ XX.XXX.XXX/0001-XX) trata dados pessoais em conformidade
            com a <strong>Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD)</strong>.
            Esta política explica quais dados coletamos, como usamos e quais são seus direitos.
          </p>
        </section>

        <h2 style={h2}>1. Dados que coletamos</h2>
        <ul style={ul}>
          <li><strong>Cadastrais:</strong> nome, e-mail, CNPJ, razão social, cidade, telefone.</li>
          <li><strong>Autenticação:</strong> hash de senha (nunca a senha em texto), 2FA opcional, IP de acesso.</li>
          <li><strong>Negócio:</strong> demandas, propostas, contratos, mensagens trocadas, transações.</li>
          <li><strong>Documentos:</strong> CNPJ comprovante, contrato social, alvará — para KYC.</li>
          <li><strong>Pagamento:</strong> processado pela Stripe; <strong>não armazenamos cartões de crédito</strong>.</li>
          <li><strong>Uso:</strong> logs de acesso, cookies essenciais, métricas anônimas (com consentimento).</li>
        </ul>

        <h2 style={h2}>2. Finalidade do tratamento</h2>
        <ul style={ul}>
          <li>Operação da plataforma (execução de contrato).</li>
          <li>Verificação de identidade (KYC — obrigação legal anti-fraude).</li>
          <li>Comunicação transacional (e-mails sobre seus pedidos, contratos, pagamentos).</li>
          <li>Mediação de disputas (legítimo interesse).</li>
          <li>Conformidade fiscal — emissão de NF-e.</li>
          <li>Melhoria do produto (somente com seu consentimento, via analytics anônimos).</li>
        </ul>

        <h2 style={h2}>3. Compartilhamento</h2>
        <p>Compartilhamos dados apenas com:</p>
        <ul style={ul}>
          <li><strong>Stripe</strong> — processamento de pagamentos.</li>
          <li><strong>Receita Federal</strong> — validação de CNPJ no KYC.</li>
          <li><strong>Resend / provedor de e-mail</strong> — envio transacional.</li>
          <li><strong>AWS / hospedagem</strong> — armazenamento criptografado.</li>
          <li><strong>Autoridades públicas</strong> — apenas mediante ordem judicial.</li>
        </ul>
        <p>
          <strong>Não vendemos seus dados.</strong> Não compartilhamos com anunciantes
          nem usamos para perfilamento publicitário.
        </p>

        <h2 style={h2}>4. Tempo de retenção</h2>
        <ul style={ul}>
          <li>Cadastros ativos: enquanto a conta existir.</li>
          <li>Após exclusão: 5 anos para registros fiscais (obrigação legal).</li>
          <li>Logs de acesso: 6 meses.</li>
          <li>Trilha de auditoria: 5 anos.</li>
        </ul>

        <h2 style={h2}>5. Seus direitos (Art. 18 da LGPD)</h2>
        <ul style={ul}>
          <li><strong>Confirmação</strong> da existência de tratamento.</li>
          <li><strong>Acesso</strong> aos seus dados — exporte em <code>/configuracoes/dados</code>.</li>
          <li><strong>Correção</strong> de dados incompletos ou imprecisos.</li>
          <li><strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários.</li>
          <li><strong>Portabilidade</strong> a outro fornecedor de serviço.</li>
          <li><strong>Eliminação</strong> dos dados tratados com consentimento.</li>
          <li><strong>Revogação do consentimento</strong> a qualquer momento.</li>
        </ul>

        <h2 style={h2}>6. Segurança</h2>
        <ul style={ul}>
          <li>Senhas armazenadas com bcrypt (custo 10+).</li>
          <li>Transmissão sempre via HTTPS/TLS 1.3.</li>
          <li>Banco de dados criptografado em repouso (AES-256).</li>
          <li>2FA disponível para todas as contas.</li>
          <li>Logs de acesso preservados.</li>
          <li>Backups diários criptografados.</li>
        </ul>

        <h2 style={h2}>7. Cookies</h2>
        <p>Usamos três categorias de cookies:</p>
        <ul style={ul}>
          <li><strong>Essenciais</strong> (sempre ativos): autenticação, segurança CSRF, preferências de idioma.</li>
          <li><strong>Analíticos</strong> (opcionais): PostHog/Plausible para entender uso agregado e anônimo.</li>
          <li><strong>Funcionais</strong> (opcionais): preferências de tema, lembrar e-mail no login.</li>
        </ul>

        <h2 style={h2}>8. Encarregado de Proteção de Dados (DPO)</h2>
        <p>
          Para exercer qualquer direito ou tirar dúvidas, contate nosso DPO:
        </p>
        <p style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
          <strong>E-mail:</strong> dpo@capacity.com.br<br />
          <strong>Endereço:</strong> [a definir]<br />
          <strong>Prazo de resposta:</strong> 15 dias úteis
        </p>

        <h2 style={h2}>9. Autoridade Nacional</h2>
        <p>
          Se sua solicitação não for atendida, você pode acionar a Autoridade
          Nacional de Proteção de Dados (ANPD): <a href="https://www.gov.br/anpd" style={link}>gov.br/anpd</a>.
        </p>

        <h2 style={h2}>10. Alterações</h2>
        <p>
          Atualizamos esta política conforme a legislação evolui. Mudanças
          materiais serão comunicadas por e-mail com ao menos 30 dias de antecedência.
        </p>
      </article>
    </main>
  );
}

const h2 = {
  fontFamily: "var(--cond)",
  fontSize: 22,
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: ".04em",
  marginTop: 32,
  marginBottom: 16,
  color: "var(--white)",
};

const ul = {
  paddingLeft: 24,
  margin: "0 0 16px",
};

const link = {
  color: "var(--amber)",
  textDecoration: "underline",
};
