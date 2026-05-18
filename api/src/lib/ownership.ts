import { Request, Response, NextFunction } from "express";
import { query } from "../db";

export interface OwnershipOpts {
  table: string;
  idField?: string;
  paramName?: string;
  ownerFields?: string[];
  userFields?: string[];
  allowAdmin?: boolean;
}

export function requireOwnership(opts: OwnershipOpts) {
  const {
    table,
    idField = "id",
    paramName = "id",
    ownerFields = [],
    userFields = [],
    allowAdmin = true,
  } = opts;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Não autenticado." });
    if (allowAdmin && req.user.role === "admin") return next();

    const id = req.params[paramName];
    if (!id) return res.status(400).json({ error: "ID não informado." });

    const cols = [...ownerFields, ...userFields];
    if (!cols.length) return next();

    try {
      const { rows } = await query(
        `SELECT ${cols.join(", ")} FROM ${table} WHERE ${idField} = $1`,
        [id]
      );
      if (!rows[0]) return res.status(404).json({ error: "Recurso não encontrado." });

      const row = rows[0] as Record<string, string | null>;
      const ownsByCompany = ownerFields.some((f) => row[f] && row[f] === req.user!.companyId);
      const ownsByUser = userFields.some((f) => row[f] && row[f] === req.user!.userId);

      if (ownsByCompany || ownsByUser) return next();
      return res.status(403).json({ error: "Permissão insuficiente para este recurso." });
    } catch (err) {
      next(err);
    }
  };
}
