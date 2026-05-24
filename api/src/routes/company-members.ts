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
