/**
 * Termos de Uso — base contratual da plataforma CapaCity.
 * IMPORTANTE: revisar com advogado antes do lançamento (especialmente cláusulas 8, 11, 12, 13).
 */
export function TermsPage() {
  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px 24px" }}
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
          Termos de <span style={{ color: "var(--amber)" }}>Uso</span>
        </h1>
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--white3)",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          Última atualização: 11 de novembro de 2026
        </p>

        <h2 style={h2}>1. Definições</h2>
        <ul style={ul}>
          <li><strong>Plataforma:</strong> o site, app e APIs da CapaCity.</li>
          <li><strong>Demandante:</strong> empresa que publica pedidos de produção.</li>
          <li><strong>Fornecedor:</strong> fábrica que envia propostas.</li>
          <li><strong>Transação:</strong> contrato fechado entre Demandante e Fornecedor.</li>
        </ul>

        <h2 style={h2}>2. Aceite</h2>
        <p>
          Ao criar uma conta você declara: (i) ter capacidade jurídica e poderes para representar
          a empresa cadastrada; (ii) ter lido e concordado com estes Termos e com a Política de
          Privacidade; (iii) que os dados informados são verdadeiros.
        </p>

        <h2 style={h2}>3. Cadastro e KYC</h2>
        <p>
          Para usar a plataforma, sua empresa precisa passar por verificação (KYC), que pode
          incluir validação de CNPJ na Receita Federal, envio de contrato social, alvará e
          comprovante de endereço. Reservamo-nos o direito de recusar cadastros sem precisar
          justificar a recusa.
        </p>

        <h2 style={h2}>4. Papel da CapaCity</h2>
        <p>
          A CapaCity é uma <strong>plataforma de intermediação</strong>. Não somos parte das
          transações entre Demandante e Fornecedor: não produzimos, não entregamos, não
          garantimos qualidade ou prazo. Atuamos como facilitadora tecnológica, mediadora de
          disputas e custodiante temporária dos pagamentos (escrow).
        </p>

        <h2 style={h2}>5. Comissões</h2>
        <ul style={ul}>
          <li><strong>Demandante:</strong> 3% sobre o valor de cada transação concluída.</li>
          <li><strong>Fornecedor:</strong> 5% sobre o valor de cada transação concluída.</li>
          <li>As comissões são deduzidas automaticamente no momento do repasse.</li>
          <li>Emitimos NF-e da comissão.</li>
          <li>Comissões pagas <strong>não são reembolsáveis</strong> exceto em caso de erro nosso.</li>
        </ul>

        <h2 style={h2}>6. Pagamento protegido (escrow)</h2>
        <ul style={ul}>
          <li>O Demandante paga via Stripe antes do início da produção.</li>
          <li>O valor fica retido pela Stripe até a entrega ser aceita.</li>
          <li>Após aceite (ou prazo de aceite tácito de 7 dias), liberamos o pagamento ao Fornecedor.</li>
          <li>Em caso de disputa, o valor permanece retido até a mediação ser concluída.</li>
        </ul>

        <h2 style={h2}>7. Contratos digitais</h2>
        <p>
          Contratos gerados pela plataforma têm força legal nos termos do Art. 10 da MP
          2.200-2/2001. Ambas as partes assinam digitalmente com IP, timestamp e hash do
          conteúdo registrado. Você pode anexar contratos próprios assinados com certificado
          ICP-Brasil para reforço probatório.
        </p>

        <h2 style={h2}>8. Disputas</h2>
        <ul style={ul}>
          <li>Disputas devem ser abertas em até 7 dias após o recebimento.</li>
          <li>Mediamos em até 48h úteis após abertura.</li>
          <li>Nossa decisão é vinculante para fins de liberação do escrow.</li>
          <li>Recurso judicial fica preservado nos termos da lei.</li>
        </ul>

        <h2 style={h2}>9. Confidencialidade e NDA</h2>
        <p>
          Documentos técnicos compartilhados em demandas com NDA marcado só são visíveis a
          Fornecedores que assinaram o NDA digital. Quebra de NDA pode resultar em suspensão
          imediata e responsabilização cível e criminal.
        </p>

        <h2 style={h2}>10. Conduta proibida</h2>
        <ul style={ul}>
          <li>Cadastrar dados falsos ou se passar por outra empresa.</li>
          <li>Tentar burlar a plataforma fechando negócios fora dela para sonegar comissão.</li>
          <li>Compartilhar credenciais de acesso.</li>
          <li>Publicar conteúdo ilegal, ofensivo ou que viole propriedade intelectual de terceiros.</li>
          <li>Tentar atacar a infraestrutura (DDoS, SQL injection, etc.).</li>
          <li>Spam ou assédio a outros usuários via mensagens.</li>
        </ul>
        <p>Violações resultam em suspensão imediata e podem ser comunicadas a autoridades.</p>

        <h2 style={h2}>11. Limitação de responsabilidade</h2>
        <p>
          A CapaCity não responde por: (i) qualidade ou prazo dos produtos entregues pelos
          Fornecedores; (ii) lucros cessantes; (iii) danos indiretos; (iv) atos de terceiros
          (Stripe, Receita, hospedagem). Nossa responsabilidade máxima em qualquer hipótese
          fica limitada ao valor das comissões pagas nos últimos 12 meses.
        </p>

        <h2 style={h2}>12. Encerramento de conta</h2>
        <p>
          Você pode encerrar sua conta a qualquer momento em <code>/configuracoes/conta</code>.
          Podemos encerrar contas que violem estes Termos com aviso prévio de 30 dias, exceto
          em casos de fraude ou risco de segurança (encerramento imediato).
        </p>

        <h2 style={h2}>13. Foro</h2>
        <p>
          Fica eleito o foro da comarca de [cidade da sede da CapaCity], com renúncia a
          qualquer outro, por mais privilegiado que seja, para dirimir questões oriundas
          destes Termos.
        </p>

        <h2 style={h2}>14. Alterações</h2>
        <p>
          Podemos atualizar estes Termos. Mudanças materiais são comunicadas por e-mail com
          30 dias de antecedência. Continuar usando a plataforma após a vigência implica
          aceite tácito.
        </p>

        <h2 style={h2}>15. Contato</h2>
        <p style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
          <strong>E-mail:</strong> juridico@capacity.com.br<br />
          <strong>Suporte:</strong> suporte@capacity.com.br
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
