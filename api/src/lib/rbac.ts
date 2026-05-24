import { query } from "../db";
import { Request } from "express";

/** Verifica se o usuário logado tem permissão em uma empresa */
export async function userCan(
  userId: string,
  companyId: string,
  permissionCode: string
): Promise<boolean> {
  const { rows } = await query<{ allowed: boolean }>(
    `SELECT rp.allowed
     FROM company_members cm
     JOIN role_permissions rp ON rp.role_id = cm.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE cm.user_id = $1
       AND cm.company_id = $2
       AND cm.status = 'active'
       AND p.code = $3
       AND rp.allowed = TRUE
     LIMIT 1`,
    [userId, companyId, permissionCode]
  );
  return rows.length > 0 && rows[0].allowed === true;
}

/** Middleware factory: requer permissão na empresa do body/params */
export function requirePermission(permCode: string, getCompanyId: (req: Request) => string) {
  return async (req: Request, res: any, next: any) => {
    const userId = (req as any).user?.userId;
    const companyId = getCompanyId(req);
    if (!userId || !companyId) return res.status(403).json({ error: "Sem permissão." });
    const ok = await userCan(userId, companyId, permCode);
    if (!ok) return res.status(403).json({ error: "Sem permissão para esta ação.", code: permCode });
    next();
  };
}

/** Cargos padrão gerados ao criar uma empresa */
export const DEFAULT_ROLES = [
  { name: "ADMIN",      hierarchy_level: 10, description: "Acesso total, auditoria e financeiro", is_system_role: true,
    permissions: ["company.view","company.edit","members.view","members.invite","members.remove","members.block",
                  "roles.create","roles.edit","roles.delete","roles.permissions.edit",
                  "demands.create","demands.view","demands.edit","demands.approve",
                  "proposals.view","proposals.create","proposals.negotiate","proposals.approve",
                  "technical.files.view","technical.files.upload","technical.status.update",
                  "quality.approve","quality.nonconformity",
                  "logistics.view","logistics.schedule","logistics.invoice.upload","logistics.delivery.confirm",
                  "machines.view","machines.create","machines.edit","capacity.update",
                  "finance.view","finance.approve_transfer",
                  "contracts.view","contracts.cancel","audit.view"] },
  { name: "GERÊNCIA",   hierarchy_level: 8, description: "Aprovar exceções e repasses", is_system_role: true,
    permissions: ["company.view","members.view","demands.view","demands.approve","proposals.view","proposals.approve",
                  "finance.view","finance.approve_transfer","contracts.view","contracts.cancel","audit.view"] },
  { name: "COMERCIAL",  hierarchy_level: 5, description: "Demandas e negociação", is_system_role: true,
    permissions: ["demands.create","demands.view","demands.edit","proposals.view","proposals.create","proposals.negotiate"] },
  { name: "ENGENHARIA", hierarchy_level: 6, description: "Status técnico e qualidade", is_system_role: true,
    permissions: ["demands.view","proposals.view","technical.files.view","technical.files.upload",
                  "technical.status.update","quality.approve","quality.nonconformity"] },
  { name: "LOGÍSTICA",  hierarchy_level: 4, description: "Coleta, transporte e NF", is_system_role: true,
    permissions: ["demands.view","logistics.view","logistics.schedule","logistics.invoice.upload","logistics.delivery.confirm"] },
  { name: "MANUTENÇÃO", hierarchy_level: 3, description: "Máquinas e capacidade", is_system_role: true,
    permissions: ["machines.view","machines.create","machines.edit","capacity.update"] },
];

/** Cria os cargos padrão para uma empresa recém-criada */
export async function seedDefaultRoles(companyId: string): Promise<void> {
  const permRows = await query<{ id: string; code: string }>("SELECT id, code FROM permissions");
  const permMap = Object.fromEntries(permRows.rows.map(p => [p.code, p.id]));

  for (const role of DEFAULT_ROLES) {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO company_roles (company_id, name, description, hierarchy_level, is_system_role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (company_id, name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [companyId, role.name, role.description, role.hierarchy_level, role.is_system_role]
    );
    const roleId = rows[0]?.id;
    if (!roleId) continue;

    for (const code of role.permissions) {
      const permId = permMap[code];
      if (!permId) continue;
      await query(
        `INSERT INTO role_permissions (role_id, permission_id, allowed) VALUES ($1, $2, TRUE)
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleId, permId]
      );
    }
  }
}
