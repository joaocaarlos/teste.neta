import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { query } from "../db";
import { authenticate } from "../middleware/auth";
import { validateZod } from "../middleware/validate";
import { userCan, seedDefaultRoles } from "../lib/rbac";
import { audit } from "../lib/audit";
import { sendEmail } from "../lib/email";

const router = Router();

// GET /company/:companyId/members — listar membros
router.get("/:companyId/members", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const userId = (req as any).user?.userId;
    if (!(await userCan(userId, companyId, "members.view"))) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    const { rows } = await query(
      `SELECT cm.id, cm.status, cm.joined_at, cm.created_at,
              u.id AS user_id, u.name, u.email, u.avatar_url,
              cr.id AS role_id, cr.name AS role_name, cr.hierarchy_level
       FROM company_members cm
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN company_roles cr ON cr.id = cm.role_id
       WHERE cm.company_id = $1
       ORDER BY cr.hierarchy_level DESC NULLS LAST, u.name`,
      [companyId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /company/:companyId/my-role — papel do usuário autenticado na empresa
router.get("/:companyId/my-role", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const userId = (req as any).user?.userId;

    const { rows: roleRows } = await query<{
      role_id: string;
      role_name: string;
      hierarchy_level: number;
    }>(
      `SELECT cr.id AS role_id, cr.name AS role_name, cr.hierarchy_level
       FROM company_members cm
       JOIN company_roles cr ON cr.id = cm.role_id
       WHERE cm.user_id = $1 AND cm.company_id = $2 AND cm.status = 'active'
       LIMIT 1`,
      [userId, companyId]
    );

    if (!roleRows[0]) {
      return res.status(404).json({ error: "Usuário não é membro ativo desta empresa." });
    }

    const { role_id, role_name, hierarchy_level } = roleRows[0];

    const { rows: permRows } = await query<{ code: string }>(
      `SELECT p.code
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1 AND rp.allowed = TRUE`,
      [role_id]
    );

    res.json({
      roleId: role_id,
      roleName: role_name,
      hierarchyLevel: hierarchy_level,
      permissions: permRows.map(r => r.code),
    });
  } catch (err) { next(err); }
});

// POST /company/:companyId/members/invite — convidar membro
const inviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
});
router.post("/:companyId/members/invite", authenticate, validateZod(inviteSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;
    const userId = (req as any).user?.userId;
    const { email, roleId } = req.body;
    if (!(await userCan(userId, companyId, "members.invite"))) {
      return res.status(403).json({ error: "Sem permissão para convidar membros." });
    }
    // Verificar se role pertence à empresa
    const roleCheck = await query("SELECT id FROM company_roles WHERE id = $1 AND company_id = $2", [roleId, companyId]);
    if (!roleCheck.rowCount) return res.status(400).json({ error: "Cargo não encontrado." });

    // Verificar se já é membro
    const existingUser = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existingUser.rowCount) {
      const existingMember = await query(
        "SELECT id FROM company_members WHERE company_id = $1 AND user_id = $2",
        [companyId, existingUser.rows[0].id]
      );
      if (existingMember.rowCount) return res.status(409).json({ error: "Usuário já é membro desta empresa." });
    }

    const { rows } = await query<{ id: string; token: string }>(
      `INSERT INTO company_invitations (company_id, email, role_id, invited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING id, token`,
      [companyId, email.toLowerCase(), roleId, userId]
    );
    if (!rows[0]) return res.status(409).json({ error: "Convite já enviado para este e-mail." });

    const company = await query<{ name: string }>("SELECT name FROM companies WHERE id = $1", [companyId]);
    await sendEmail({
      to: email,
      subject: `Convite para a empresa ${company.rows[0]?.name} — CapaCity`,
      html: `<p>Você foi convidado para a empresa <b>${company.rows[0]?.name}</b> no CapaCity.</p>
             <p><a href="${process.env.APP_URL}/convite/${rows[0].token}">Aceitar convite</a></p>
             <p>O convite expira em 7 dias.</p>`,
    });

    await audit(req, `Convite enviado para ${email}`, "members");
    res.status(201).json({ message: "Convite enviado." });
  } catch (err) { next(err); }
});

// POST /company/accept-invite/:token — aceitar convite
router.post("/accept-invite/:token", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const userId = (req as any).user?.userId;

    const { rows } = await query<{ id: string; company_id: string; role_id: string; email: string }>(
      `SELECT id, company_id, role_id, email FROM company_invitations
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [token]
    );
    if (!rows[0]) return res.status(400).json({ error: "Convite inválido ou expirado." });

    const invite = rows[0];
    // Verificar e-mail do usuário logado
    const { rows: userRows } = await query<{ email: string }>("SELECT email FROM users WHERE id = $1", [userId]);
    if (userRows[0]?.email?.toLowerCase() !== invite.email) {
      return res.status(403).json({ error: "Este convite é para outro e-mail." });
    }

    await query(
      `INSERT INTO company_members (company_id, user_id, role_id, status, invited_by, joined_at)
       VALUES ($1, $2, $3, 'active', (SELECT invited_by FROM company_invitations WHERE id = $4), NOW())
       ON CONFLICT (company_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', joined_at = NOW()`,
      [invite.company_id, userId, invite.role_id, invite.id]
    );
    await query("UPDATE company_invitations SET accepted_at = NOW() WHERE id = $1", [invite.id]);
    await audit(req, "Convite aceito", "members");
    res.json({ message: "Bem-vindo à empresa!", companyId: invite.company_id });
  } catch (err) { next(err); }
});

// PATCH /company/:companyId/members/:memberId/role — alterar cargo
const changeRoleSchema = z.object({ roleId: z.string().uuid() });
router.patch("/:companyId/members/:memberId/role", authenticate, validateZod(changeRoleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, memberId } = req.params;
    const userId = (req as any).user?.userId;
    const { roleId } = req.body;

    if (!(await userCan(userId, companyId, "roles.edit"))) {
      return res.status(403).json({ error: "Sem permissão para alterar cargos." });
    }

    // 1. Obter hierarchy_level do solicitante
    const { rows: requesterRows } = await query<{ hierarchy_level: number }>(
      `SELECT cr.hierarchy_level
       FROM company_members cm
       JOIN company_roles cr ON cm.role_id = cr.id
       WHERE cm.user_id = $1 AND cm.company_id = $2 AND cm.status = 'active'`,
      [userId, companyId]
    );
    if (!requesterRows[0]) {
      return res.status(403).json({ error: "Você não é membro ativo desta empresa." });
    }
    const requesterLevel = requesterRows[0].hierarchy_level;

    // 2. Obter hierarchy_level do cargo alvo
    const { rows: targetRoleRows } = await query<{ hierarchy_level: number }>(
      `SELECT hierarchy_level FROM company_roles WHERE id = $1 AND company_id = $2`,
      [roleId, companyId]
    );
    if (!targetRoleRows[0]) {
      return res.status(400).json({ error: "Cargo não encontrado." });
    }
    const targetRoleLevel = targetRoleRows[0].hierarchy_level;

    // 3. Obter membro alvo e seu hierarchy_level atual
    const { rows: targetMemberRows } = await query<{ user_id: string; hierarchy_level: number | null }>(
      `SELECT cm.user_id, cr.hierarchy_level
       FROM company_members cm
       LEFT JOIN company_roles cr ON cm.role_id = cr.id
       WHERE cm.id = $1 AND cm.company_id = $2`,
      [memberId, companyId]
    );
    if (!targetMemberRows[0]) {
      return res.status(404).json({ error: "Membro não encontrado." });
    }
    const targetMemberLevel = targetMemberRows[0].hierarchy_level ?? 0;

    // 4. Verificar escalonamento de privilégio: não pode atribuir cargo acima do próprio nível
    if (targetRoleLevel > requesterLevel) {
      return res.status(403).json({ error: "Você não pode atribuir um cargo com nível hierárquico superior ao seu." });
    }

    // 5. Não pode modificar membro no mesmo nível ou acima
    if (targetMemberLevel >= requesterLevel) {
      return res.status(403).json({ error: "Você não pode alterar o cargo de um membro com nível hierárquico igual ou superior ao seu." });
    }

    // 6. Verificar se a mudança removeria o último administrador (membro com nível máximo)
    const { rows: adminCountRows } = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM company_members cm
       JOIN company_roles cr ON cm.role_id = cr.id
       WHERE cm.company_id = $1 AND cr.hierarchy_level = (
         SELECT MAX(hierarchy_level) FROM company_roles WHERE company_id = $1
       ) AND cm.status = 'ativo'`,
      [companyId]
    );
    const adminCount = parseInt(adminCountRows[0]?.count ?? "0", 10);
    // Se o membro alvo tem o nível máximo e há só 1, impedir rebaixamento
    const maxLevelResult = await query<{ max_level: number }>(
      `SELECT MAX(hierarchy_level) AS max_level FROM company_roles WHERE company_id = $1`,
      [companyId]
    );
    const maxLevel = maxLevelResult.rows[0]?.max_level ?? 0;
    if (targetMemberLevel === maxLevel && targetRoleLevel < maxLevel && adminCount <= 1) {
      return res.status(400).json({ error: "Não é possível remover o último administrador da empresa." });
    }

    const { rowCount } = await query(
      "UPDATE company_members SET role_id = $1 WHERE id = $2 AND company_id = $3",
      [roleId, memberId, companyId]
    );
    if (!rowCount) return res.status(404).json({ error: "Membro não encontrado." });
    await audit(req, `Cargo de membro ${memberId} alterado`, "members");
    res.json({ message: "Cargo atualizado." });
  } catch (err) { next(err); }
});

// PATCH /company/:companyId/members/:memberId/block — bloquear/desbloquear
const blockSchema = z.object({ blocked: z.boolean() });
router.patch("/:companyId/members/:memberId/block", authenticate, validateZod(blockSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, memberId } = req.params;
    const userId = (req as any).user?.userId;
    const { blocked } = req.body;
    if (!(await userCan(userId, companyId, "members.block"))) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    await query(
      "UPDATE company_members SET status = $1 WHERE id = $2 AND company_id = $3",
      [blocked ? "blocked" : "active", memberId, companyId]
    );
    await audit(req, `Membro ${memberId} ${blocked ? "bloqueado" : "desbloqueado"}`, "members");
    res.json({ message: blocked ? "Membro bloqueado." : "Acesso restaurado." });
  } catch (err) { next(err); }
});

// DELETE /company/:companyId/members/:memberId — remover membro
router.delete("/:companyId/members/:memberId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId, memberId } = req.params;
    const userId = (req as any).user?.userId;
    if (!(await userCan(userId, companyId, "members.remove"))) {
      return res.status(403).json({ error: "Sem permissão." });
    }

    // Verificar se é o último administrador
    const memberRoleResult = await query<{ hierarchy_level: number | null }>(
      `SELECT cr.hierarchy_level
       FROM company_members cm
       LEFT JOIN company_roles cr ON cm.role_id = cr.id
       WHERE cm.id = $1 AND cm.company_id = $2`,
      [memberId, companyId]
    );
    if (memberRoleResult.rows[0]) {
      const memberLevel = memberRoleResult.rows[0].hierarchy_level ?? 0;
      const maxLevelResult = await query<{ max_level: number }>(
        `SELECT MAX(hierarchy_level) AS max_level FROM company_roles WHERE company_id = $1`,
        [companyId]
      );
      const maxLevel = maxLevelResult.rows[0]?.max_level ?? 0;
      if (memberLevel === maxLevel) {
        const { rows: adminCountRows } = await query<{ count: string }>(
          `SELECT COUNT(*) AS count FROM company_members cm
           JOIN company_roles cr ON cm.role_id = cr.id
           WHERE cm.company_id = $1 AND cr.hierarchy_level = $2 AND cm.status = 'ativo'`,
          [companyId, maxLevel]
        );
        const adminCount = parseInt(adminCountRows[0]?.count ?? "0", 10);
        if (adminCount <= 1) {
          return res.status(400).json({ error: "Não é possível remover o último administrador da empresa." });
        }
      }
    }

    const { rowCount } = await query(
      "DELETE FROM company_members WHERE id = $1 AND company_id = $2",
      [memberId, companyId]
    );
    if (!rowCount) return res.status(404).json({ error: "Membro não encontrado." });
    await audit(req, `Membro ${memberId} removido`, "members");
    res.json({ message: "Membro removido." });
  } catch (err) { next(err); }
});

export default router;
