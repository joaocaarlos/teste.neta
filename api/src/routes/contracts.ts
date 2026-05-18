import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { query } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { audit } from "../lib/audit";
import { sseEmit } from "../lib/sse";
import { emailTemplates, sendEmail } from "../lib/email";
import { generateContractPDF } from "../lib/pdf";

const router = Router();

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, status } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (req.user!.role !== "admin" && req.user!.companyId) {
      conditions.push(`(demandante_id = $${p} OR fornecedor_id = $${p})`);
      params.push(req.user!.companyId); p++;
    }
    if (orderId) { conditions.push(`order_id = $${p}`); params.push(orderId); p++; }
    if (status)  { conditions.push(`status = $${p}`);   params.push(status);  p++; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT * FROM contracts ${where} ORDER BY generated_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query("SELECT * FROM contracts WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Contrato não encontrado." });

    const c = rows[0] as { demandante_id: string; fornecedor_id: string };
    if (
      req.user!.role !== "admin" &&
      c.demandante_id !== req.user!.companyId &&
      c.fornecedor_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/:id/pdf", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              c1.name AS client_name, c1.cnpj AS client_cnpj,
              c2.name AS supplier_name, c2.cnpj AS supplier_cnpj
       FROM contracts c
       LEFT JOIN companies c1 ON c1.id = c.demandante_id
       LEFT JOIN companies c2 ON c2.id = c.fornecedor_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Contrato nao encontrado." });

    const c = rows[0] as Record<string, unknown> & {
      id: string; order_id: string | null;
      demandante_id: string | null; fornecedor_id: string | null;
      scope: string | null; valor: string | null; valor_raw: string | null;
      client_name: string | null; client_cnpj: string | null;
      supplier_name: string | null; supplier_cnpj: string | null;
      signed_demandante_at: Date | string | null;
      signed_fornecedor_at: Date | string | null;
      signed_demandante_name: string | null;
      signed_fornecedor_name: string | null;
      signed_demandante_ip: string | null;
      signed_fornecedor_ip: string | null;
    };

    if (
      req.user!.role !== "admin" &&
      c.demandante_id !== req.user!.companyId &&
      c.fornecedor_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }

    const pdfBuffer = await generateContractPDF({
      id: c.id,
      pedido: c.order_id || "—",
      scope: c.scope || "",
      valor: c.valor || c.valor_raw,
      generated_at: c.generated_at as Date | null,
      signed_demandante_at: c.signed_demandante_at,
      signed_fornecedor_at: c.signed_fornecedor_at,
      signed_demandante_name: c.signed_demandante_name,
      signed_fornecedor_name: c.signed_fornecedor_name,
      signed_demandante_ip: c.signed_demandante_ip,
      signed_fornecedor_ip: c.signed_fornecedor_ip,
      client_name: c.client_name,
      client_cnpj: c.client_cnpj,
      supplier_name: c.supplier_name,
      supplier_cnpj: c.supplier_cnpj,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="contrato-${c.id}.pdf"`);
    res.setHeader("Content-Length", String(pdfBuffer.length));
    res.send(pdfBuffer);

    await audit(req, "PDF de contrato baixado", "contrato", req.params.id);
  } catch (err) { next(err); }
});

router.post("/:id/sign", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows: cur } = await query("SELECT * FROM contracts WHERE id = $1", [req.params.id]);
    if (!cur[0]) return res.status(404).json({ error: "Contrato não encontrado." });

    const c = cur[0] as {
      status: string; scope: string;
      demandante_id: string; fornecedor_id: string;
      content_hash: string | null;
      signed_demandante_at: string | null;
      signed_fornecedor_at: string | null;
    };

    if (c.status === "Cancelado") {
      return res.status(409).json({ error: "Contrato cancelado não pode ser assinado." });
    }

    const isDemandante = c.demandante_id === req.user!.companyId;
    const isFornecedor = c.fornecedor_id === req.user!.companyId;
    if (!isDemandante && !isFornecedor && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Você não é parte deste contrato." });
    }

    const computedHash = sha256(c.scope || "");
    if (c.content_hash && c.content_hash !== computedHash) {
      return res.status(409).json({ error: "Conteúdo do contrato foi alterado desde a geração. Refaça." });
    }
    if (!c.content_hash) {
      await query("UPDATE contracts SET content_hash = $1 WHERE id = $2", [computedHash, req.params.id]);
    }

    const ip = req.ip || "—";
    const now = new Date().toLocaleDateString("pt-BR");

    let alreadyOther = false;
    if (isDemandante) {
      if (c.signed_demandante_at) {
        return res.status(409).json({ error: "Demandante já assinou este contrato." });
      }
      await query(
        `UPDATE contracts
         SET signed_demandante_at = NOW(),
             signed_demandante_by = $1,
             signed_demandante_ip = $2
         WHERE id = $3`,
        [req.user!.userId, ip, req.params.id]
      );
      alreadyOther = !!c.signed_fornecedor_at;
    } else if (isFornecedor) {
      if (c.signed_fornecedor_at) {
        return res.status(409).json({ error: "Fornecedor já assinou este contrato." });
      }
      await query(
        `UPDATE contracts
         SET signed_fornecedor_at = NOW(),
             signed_fornecedor_by = $1,
             signed_fornecedor_ip = $2
         WHERE id = $3`,
        [req.user!.userId, ip, req.params.id]
      );
      alreadyOther = !!c.signed_demandante_at;
    } else {
      await audit(req, "Contrato visualizado por admin", "contrato", req.params.id);
      const { rows } = await query("SELECT * FROM contracts WHERE id = $1", [req.params.id]);
      return res.json(rows[0]);
    }

    if (alreadyOther) {
      await query(
        `UPDATE contracts SET status = 'Assinado', signed_at = $1, signed_ip = $2 WHERE id = $3`,
        [now, ip, req.params.id]
      );
    } else {
      await query(
        `UPDATE contracts SET status = 'Aguardando assinatura' WHERE id = $1 AND status = 'Gerado'`,
        [req.params.id]
      );
    }

    const final = await query("SELECT * FROM contracts WHERE id = $1", [req.params.id]);
    const finalContract = final.rows[0] as { status: string; demandante_id: string; fornecedor_id: string };

    const otherCompanyId = isDemandante ? c.fornecedor_id : c.demandante_id;
    sseEmit(`company:${otherCompanyId}`, {
      type: "contract.signed",
      payload: { contractId: req.params.id, status: finalContract.status, by: isDemandante ? "demandante" : "fornecedor" },
    });
    const otherUser = await query<{ email: string }>(
      "SELECT email FROM users WHERE company_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1",
      [otherCompanyId]
    );
    if (otherUser.rows[0]?.email) {
      const tpl = emailTemplates.contractSigned({
        contractId: req.params.id,
        signedBy: isDemandante ? "demandante" : "fornecedor",
        bothSigned: finalContract.status === "Assinado",
      });
      void sendEmail({ to: otherUser.rows[0].email, ...tpl });
    }

    await audit(req, finalContract.status === "Assinado" ? "Contrato finalizado (ambas as partes)" : "Contrato assinado parcialmente", "contrato", req.params.id);

    res.json(finalContract);
  } catch (err) { next(err); }
});

router.post("/:id/cancel", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ status: string; demandante_id: string; fornecedor_id: string }>(
      "SELECT status, demandante_id, fornecedor_id FROM contracts WHERE id = $1",
      [req.params.id]
    );
    if (!cur.rows[0]) return res.status(404).json({ error: "Contrato não encontrado." });

    if (
      req.user!.role !== "admin" &&
      cur.rows[0].demandante_id !== req.user!.companyId &&
      cur.rows[0].fornecedor_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }
    if (cur.rows[0].status === "Assinado") {
      return res.status(409).json({ error: "Contrato assinado não pode ser cancelado (encerre via disputa)." });
    }

    const { rows } = await query(
      "UPDATE contracts SET status = 'Cancelado' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    await audit(req, "Contrato cancelado", "contrato", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
