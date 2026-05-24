import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { query } from "../db";
import { authenticate } from "../middleware/auth";
import { validateZod } from "../middleware/validate";
import { userCan } from "../lib/rbac";
import { audit } from "../lib/audit";

const router = Router();

// GET /company/:companyId/roles — listar cargos
router.get("/:companyId/roles", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const userId = (req as any).user?.userId;
    if (!(await userCan(userId, companyId, "members.view"))) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    const { rows } = await query(
      `SELECT cr.id, cr.name, cr.description, cr.hierarchy_level, cr.is_system_role, cr.created_at,
              COUNT(cm.id) AS member_count
       FROM company_roles cr
       LEFT JOIN company_members cm ON cm.role_id = cr.id AND cm.status = 'active'
       WHERE cr.company_id = $1
       GROUP BY cr.id
       ORDER BY cr.hierarchy_level DESC`,
      [companyId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /company/:companyId/roles/:roleId/permissions
router.get("/:companyId/roles/:roleId/permissions", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, roleId } = req.params;
    const userId = (req as any).user?.userId;
    if (!(await userCan(userId, companyId, "members.view"))) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    const { rows: allPerms } = await query("SELECT id, code, module, description FROM permissions ORDER BY module, code");
    const { rows: rolePerms } = await query(
      "SELECT permission_id, allowed FROM role_permissions WHERE role_id = $1", [roleId]
    );
    const grantedSet = new Set(rolePerms.filter(r => r.allowed).map(r => r.permission_id));
    const result = allPerms.map(p => ({ ...p, granted: grantedSet.has(p.id) }));
    res.json(result);
  } catch (err) { next(err); }
});

// GET /company/:companyId/permissions-catalog — catálogo completo
router.get("/:companyId/permissions-catalog", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const userId = (req as any).user?.userId;
    if (!(await userCan(userId, companyId, "roles.permissions.edit"))) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    const { rows } = await query("SELECT id, code, module, description FROM permissions ORDER BY module, code");
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /company/:companyId/roles — criar cargo
const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  hierarchy_level: z.number().int().min(0).max(10).default(0),
});
router.post("/:companyId/roles", authenticate, validateZod(createRoleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const userId = (req as any).user?.userId;
    const { name, description, hierarchy_level } = req.body;
    if (!(await userCan(userId, companyId, "roles.create"))) {
      return res.status(403).json({ error: "Sem permissão para criar cargos." });
    }
    const { rows } = await query<{ id: string }>(
      `INSERT INTO company_roles (company_id, name, description, hierarchy_level)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [companyId, name.toUpperCase(), description || null, hierarchy_level]
    );
    await audit(req, `Cargo "${name}" criado`, "roles");
    res.status(201).json({ id: rows[0].id, message: "Cargo criado." });
  } catch (err) { next(err); }
});

// PATCH /company/:companyId/roles/:roleId — editar cargo
const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(200).optional(),
  hierarchy_level: z.number().int().min(0).max(10).optional(),
});
router.patch("/:companyId/roles/:roleId", authenticate, validateZod(updateRoleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, roleId } = req.params;
    const userId = (req as any).user?.userId;
    if (!(await userCan(userId, companyId, "roles.edit"))) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    const { name, description, hierarchy_level } = req.body;
    await query(
      `UPDATE company_roles SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         hierarchy_level = COALESCE($3, hierarchy_level)
       WHERE id = $4 AND company_id = $5 AND is_system_role = FALSE`,
      [name?.toUpperCase() || null, description || null, hierarchy_level ?? null, roleId, companyId]
    );
    await audit(req, `Cargo ${roleId} atualizado`, "roles");
    res.json({ message: "Cargo atualizado." });
  } catch (err) { next(err); }
});

// PUT /company/:companyId/roles/:roleId/permissions — salvar matriz de permissões
const savePermsSchema = z.object({
  permissions: z.array(z.object({ code: z.string(), granted: z.boolean() })),
});
router.put("/:companyId/roles/:roleId/permissions", authenticate, validateZod(savePermsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, roleId } = req.params;
    const userId = (req as any).user?.userId;
    const { permissions } = req.body;
    if (!(await userCan(userId, companyId, "roles.permissions.edit"))) {
      return res.status(403).json({ error: "Sem permissão para editar permissões." });
    }
    // Verify role belongs to company
    const roleCheck = await query("SELECT id FROM company_roles WHERE id = $1 AND company_id = $2", [roleId, companyId]);
    if (!roleCheck.rowCount) return res.status(404).json({ error: "Cargo não encontrado." });

    const permRows = await query<{ id: string; code: string }>("SELECT id, code FROM permissions");
    const permMap = Object.fromEntries(permRows.rows.map(p => [p.code, p.id]));

    for (const { code, granted } of permissions) {
      const permId = permMap[code];
      if (!permId) continue;
      await query(
        `INSERT INTO role_permissions (role_id, permission_id, allowed) VALUES ($1, $2, $3)
         ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = EXCLUDED.allowed`,
        [roleId, permId, granted]
      );
    }
    await audit(req, `Permissões do cargo ${roleId} atualizadas`, "roles");
    res.json({ message: "Permissões salvas." });
  } catch (err) { next(err); }
});

// DELETE /company/:companyId/roles/:roleId — excluir cargo (não pode excluir system roles)
router.delete("/:companyId/roles/:roleId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, roleId } = req.params;
    const userId = (req as any).user?.userId;
    if (!(await userCan(userId, companyId, "roles.delete"))) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    const { rowCount } = await query(
      "DELETE FROM company_roles WHERE id = $1 AND company_id = $2 AND is_system_role = FALSE",
      [roleId, companyId]
    );
    if (!rowCount) return res.status(400).json({ error: "Cargo não encontrado ou é cargo padrão do sistema." });
    await audit(req, `Cargo ${roleId} excluído`, "roles");
    res.json({ message: "Cargo excluído." });
  } catch (err) { next(err); }
});

// GET /company/my-companies — empresas do usuário logado
router.get("/my-companies", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { rows } = await query(
      `SELECT c.id, c.name, c.cnpj, c.type, c.status,
              cm.status AS member_status, cm.joined_at,
              cr.name AS role_name, cr.hierarchy_level
       FROM company_members cm
       JOIN companies c ON c.id = cm.company_id
       LEFT JOIN company_roles cr ON cr.id = cm.role_id
       WHERE cm.user_id = $1 AND cm.status = 'active'
       ORDER BY c.name`,
      [userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /company/:companyId/my-permissions — permissões do usuário na empresa
router.get("/:companyId/my-permissions", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const userId = (req as any).user?.userId;
    const { rows } = await query(
      `SELECT p.code
       FROM company_members cm
       JOIN role_permissions rp ON rp.role_id = cm.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE cm.user_id = $1 AND cm.company_id = $2
         AND cm.status = 'active' AND rp.allowed = TRUE`,
      [userId, companyId]
    );
    res.json({ permissions: rows.map(r => r.code) });
  } catch (err) { next(err); }
});

export default router;
