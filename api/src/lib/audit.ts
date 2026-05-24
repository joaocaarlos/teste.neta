import { Request } from "express";
import { query } from "../db";
import { logger } from "./logger";

export async function audit(
  req: Request,
  evento: string,
  tipo: string,
  ref?: string | null,
  override?: { usuario?: string; empresa?: string; [key: string]: unknown }
): Promise<void> {
  try {
    let usuario = override?.usuario || "Sistema";
    let empresa = override?.empresa || "—";

    if (req.user?.userId && !override?.usuario) {
      const { rows } = await query(
        `SELECT u.name, c.name AS company
         FROM users u LEFT JOIN companies c ON c.id = u.company_id
         WHERE u.id = $1`,
        [req.user.userId]
      );
      if (rows[0]) {
        usuario = (rows[0] as { name: string }).name;
        empresa = (rows[0] as { company: string | null }).company || "—";
      }
    }

    await query(
      "INSERT INTO audit_logs (evento,usuario,empresa,ip,data,tipo,ref,user_id,request_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        evento,
        usuario,
        empresa,
        req.ip || "—",
        new Date().toLocaleString("pt-BR"),
        tipo,
        ref || null,
        req.user?.userId || null,
        req.id || null,
      ]
    );
  } catch (err) {
    logger.warn({ err }, "[audit] failed");
  }
}
