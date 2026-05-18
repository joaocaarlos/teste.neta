import PDFDocument from "pdfkit";
import crypto from "crypto";

const APP_URL = process.env.APP_URL || "https://capacity.com.br";

export interface ContractPDFData {
  id: string;
  pedido: string;
  scope: string;
  valor: string | number | null;
  generated_at?: Date | string | null;
  signed_demandante_at?: Date | string | null;
  signed_fornecedor_at?: Date | string | null;
  signed_demandante_name?: string | null;
  signed_fornecedor_name?: string | null;
  signed_demandante_ip?: string | null;
  signed_fornecedor_ip?: string | null;
  client_name?: string | null;
  client_cnpj?: string | null;
  supplier_name?: string | null;
  supplier_cnpj?: string | null;
}

/**
 * Gera PDF do contrato em memória e retorna como Buffer.
 * Inclui hash de integridade, IPs/datas das assinaturas, e watermark se não assinado por ambos.
 *
 * Uso típico:
 *   const buf = await generateContractPDF(data);
 *   res.setHeader("Content-Type", "application/pdf");
 *   res.setHeader("Content-Disposition", `attachment; filename="contrato-${id}.pdf"`);
 *   res.send(buf);
 */
export async function generateContractPDF(data: ContractPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 60,
      bufferPages: true,
      info: {
        Title: `Contrato ${data.id}`,
        Author: "CapaCity",
        Subject: `Contrato de Prestação de Serviço — Pedido ${data.pedido}`,
        Creator: "CapaCity Marketplace",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const bothSigned = !!data.signed_demandante_at && !!data.signed_fornecedor_at;
    const contentHash = sha256(JSON.stringify({
      id: data.id,
      pedido: data.pedido,
      scope: data.scope,
      valor: data.valor,
    }));

    // ───── Watermark se não totalmente assinado ─────
    if (!bothSigned) {
      doc.save();
      doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.fontSize(60).fillColor("#E5E5E5", 0.4)
         .text("RASCUNHO", 0, doc.page.height / 2 - 40, { width: doc.page.width, align: "center" });
      doc.restore();
    }

    // ───── Header ─────
    doc.fillColor("#070708").fillOpacity(1);
    doc.font("Helvetica-Bold").fontSize(20).text("CAP", 60, 60, { continued: true })
       .fillColor("#E8A020").text("A", { continued: true })
       .fillColor("#070708").text("CITY");
    doc.font("Helvetica").fontSize(8).fillColor("#666666")
       .text("MARKETPLACE B2B INDUSTRIAL", 60, 84);

    doc.font("Helvetica").fontSize(8).fillColor("#666666")
       .text(`Documento ${data.id}`, 0, 60, { align: "right", width: doc.page.width - 60 })
       .text(`Hash: ${contentHash.slice(0, 16)}…`, { align: "right", width: doc.page.width - 60 });

    doc.moveTo(60, 105).lineTo(doc.page.width - 60, 105)
       .lineWidth(1).strokeColor("#070708").stroke();

    // ───── Title ─────
    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#070708")
       .text("CONTRATO DE PRESTAÇÃO DE SERVIÇO", { align: "center" });
    doc.font("Helvetica").fontSize(10).fillColor("#666666")
       .text(`Pedido vinculado: ${data.pedido}`, { align: "center" });

    doc.moveDown(2);

    // ───── Partes ─────
    section(doc, "1. DAS PARTES");
    doc.font("Helvetica").fontSize(11).fillColor("#070708").lineGap(2);

    doc.font("Helvetica-Bold").text("CONTRATANTE (Demandante):", { continued: false });
    doc.font("Helvetica").text(`Razão Social: ${data.client_name || "—"}`);
    doc.text(`CNPJ: ${data.client_cnpj || "—"}`);
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").text("CONTRATADA (Fornecedor):", { continued: false });
    doc.font("Helvetica").text(`Razão Social: ${data.supplier_name || "—"}`);
    doc.text(`CNPJ: ${data.supplier_cnpj || "—"}`);
    doc.moveDown(1.5);

    // ───── Objeto ─────
    section(doc, "2. DO OBJETO");
    doc.font("Helvetica").fontSize(11).fillColor("#070708").lineGap(2);
    doc.text(data.scope || "(escopo não definido)", { align: "justify" });
    doc.moveDown(1.5);

    // ───── Valor ─────
    section(doc, "3. DO VALOR");
    doc.font("Helvetica").fontSize(11);
    const valorFmt = formatBRL(data.valor);
    doc.text(`Valor total do contrato: ${valorFmt}`);
    doc.text("O pagamento será realizado através da plataforma CapaCity, com o valor retido em escrow até o aceite formal da entrega pelo CONTRATANTE.");
    doc.moveDown(1.5);

    // ───── Comissão da plataforma ─────
    section(doc, "4. DA COMISSÃO DA PLATAFORMA");
    doc.font("Helvetica").fontSize(11);
    doc.text("As partes reconhecem que a CapaCity Marketplace cobra:");
    doc.text("  • 3% (três por cento) do valor a ser deduzido do pagamento do CONTRATANTE;", { indent: 20 });
    doc.text("  • 5% (cinco por cento) do valor a ser deduzido do recebimento da CONTRATADA.", { indent: 20 });
    doc.text("Nota fiscal eletrônica da comissão será emitida pela CapaCity Marketplace.");
    doc.moveDown(1.5);

    // ───── Confidencialidade ─────
    section(doc, "5. DA CONFIDENCIALIDADE");
    doc.font("Helvetica").fontSize(11);
    doc.text("Caso a demanda original tenha exigido NDA digital, as obrigações de sigilo previstas naquele documento permanecem em pleno vigor, mesmo após o término deste contrato.");
    doc.moveDown(1.5);

    // ───── Foro ─────
    section(doc, "6. DO FORO");
    doc.font("Helvetica").fontSize(11);
    doc.text("Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões oriündas deste contrato, salvo disposição em contrário em legislação especial.");
    doc.moveDown(1.5);

    // ───── Aceite eletrônico ─────
    section(doc, "7. DO ACEITE ELETRÔNICO");
    doc.font("Helvetica").fontSize(11);
    doc.text("Este contrato é celebrado eletronicamente nos termos do Art. 10 da MP 2.200-2/2001. As assinaturas digitais com registro de IP, data/hora e hash de integridade têm o mesmo valor jurídico de assinatura manual.");
    doc.moveDown(2);

    // ───── Assinaturas ─────
    if (doc.y > doc.page.height - 220) doc.addPage();

    section(doc, "ASSINATURAS");
    doc.moveDown(0.5);

    const sigWidth = (doc.page.width - 120 - 20) / 2;
    const sigY = doc.y;

    sigBlock(doc, 60, sigY, sigWidth, "CONTRATANTE", {
      name: data.signed_demandante_name,
      date: data.signed_demandante_at,
      ip: data.signed_demandante_ip,
    });

    sigBlock(doc, 60 + sigWidth + 20, sigY, sigWidth, "CONTRATADA", {
      name: data.signed_fornecedor_name,
      date: data.signed_fornecedor_at,
      ip: data.signed_fornecedor_ip,
    });

    // ───── Footer ─────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.height - 40;
      doc.font("Helvetica").fontSize(7).fillColor("#999999")
         .text(
           `CapaCity Marketplace · ${APP_URL} · Contrato ${data.id} · Hash ${contentHash.slice(0, 24)}`,
           60, bottom,
           { width: doc.page.width - 120, align: "center" }
         );
      doc.text(`Página ${i + 1} de ${range.count}`, 60, bottom + 10,
        { width: doc.page.width - 120, align: "center" });
    }

    doc.end();
  });
}

// ──────────────────────────────────────────────────────────────────────────────

function section(doc: PDFKit.PDFDocument, title: string): void {
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#070708").text(title);
  doc.moveDown(0.4);
}

function sigBlock(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  sig: { name?: string | null; date?: Date | string | null; ip?: string | null }
): void {
  const signed = !!sig.date;
  const dateStr = sig.date ? new Date(sig.date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666")
     .text(label, x, y, { width });

  // Caixa
  doc.rect(x, y + 14, width, 80).strokeColor(signed ? "#22C55E" : "#CCCCCC").lineWidth(1).stroke();

  if (signed) {
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#22C55E")
       .text(sig.name || "Assinado", x + 10, y + 26, { width: width - 20 });
    doc.font("Helvetica").fontSize(8).fillColor("#666666")
       .text(`Assinado em: ${dateStr}`, x + 10, y + 50, { width: width - 20 });
    doc.text(`IP: ${sig.ip || "—"}`, x + 10, y + 64, { width: width - 20 });
  } else {
    doc.font("Helvetica").fontSize(10).fillColor("#999999")
       .text("Aguardando assinatura digital", x + 10, y + 50, { width: width - 20, align: "center" });
  }
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function formatBRL(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "string" ? Number(v.replace(/[^0-9.,]/g, "").replace(",", ".")) : v;
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}
