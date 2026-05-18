import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { body } from "express-validator";
import { query } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { audit } from "../lib/audit";
import { makeUploader, persistUpload } from "../lib/upload";
import { validate } from "../lib/validators";

const router = Router();
const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
const avatarUpload = makeUploader("avatar");

router.get("/", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, search, limit = "50", offset = "0" } = req.query as Record<string, string>;
    const conditions: string[] = ["u.deleted_at IS NULL"];
    const params: unknown[] = [];
    let p = 1;

    if (role)      { conditions.push(`u.role = $${p}`);       params.push(role);      p++; }
    if (companyId) { conditions.push(`u.company_id = $${p}`); params.push(companyId); p++; }
    if (search) {
      conditions.push(`(u.name ILIKE $${p} OR u.email ILIKE $${p})`);
      params.push(`%${search}%`); p++;
    }

    const { rows } = await query(
      `SELECT u.id, u.email, u.role, u.name, u.cnpj, u.avatar, u.avatar_url,
              u.email_verified_at, u.last_login_at, u.created_at,
              c.name AS company, c.id AS company_id, c.status AS company_status
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY u.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, Number(limit), Number(offset)]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.role, u.name, u.cnpj, u.avatar, u.avatar_url,
              u.email_verified_at, u.last_login_at, u.created_at,
              c.name AS company, c.id AS company_id, c.status AS company_status
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [req.user!.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario nao encontrado." });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/users/me/data-export (LGPD Art. 18 portabilidade)
router.get("/me/data-export", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<{ data: unknown }>(
      `SELECT export_user_data($1::uuid) AS data`,
      [req.user!.userId]
    );
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="capacity-meus-dados-${new Date().toISOString().split("T")[0]}.json"`
    );
    res.send(JSON.stringify(rows[0]?.data || {}, null, 2));
  } catch (err) { next(err); }
});

// DELETE /api/users/me (LGPD Art. 18 eliminacao)
router.delete("/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query(`SELECT anonymize_user($1::uuid)`, [req.user!.userId]);
    res.json({
      message: "Sua conta foi anonimizada conforme LGPD. Dados retidos apenas para obrigacao fiscal.",
      retention_note: "Registros financeiros sao mantidos por 5 anos conforme Receita Federal.",
    });
  } catch (err) { next(err); }
});

router.patch("/me/avatar", authenticate, avatarUpload.single("file"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Arquivo de avatar e obrigatorio." });
    const saved = await persistUpload(req, req.file, "user_avatar", req.user!.userId, false);
    const { rows } = await query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, email, role, name, avatar, avatar_url`,
      [saved.url, req.user!.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario nao encontrado." });
    await audit(req, "Avatar atualizado", "auth");
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/me/2fa/enable", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<{ email: string }>(
      "SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL",
      [req.user!.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario nao encontrado." });

    const secret = speakeasy.generateSecret({
      name: `CapaCity (${rows[0].email})`,
      issuer: "CapaCity",
      length: 20,
    });
    await query(
      "UPDATE users SET totp_secret = $1, totp_enabled = FALSE WHERE id = $2",
      [secret.base32, req.user!.userId]
    );
    await audit(req, "2FA iniciado", "auth");
    res.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
  } catch (err) { next(err); }
});

router.post(
  "/me/2fa/confirm",
  authenticate,
  validate([body("token").isString().trim().isLength({ min: 6, max: 8 }).withMessage("Codigo 2FA invalido.")]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows } = await query<{ totp_secret: string | null }>(
        "SELECT totp_secret FROM users WHERE id = $1 AND deleted_at IS NULL",
        [req.user!.userId]
      );
      const secret = rows[0]?.totp_secret;
      if (!secret) return res.status(400).json({ error: "2FA ainda nao foi iniciado." });
      const ok = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token: String(req.body.token),
        window: 1,
      });
      if (!ok) return res.status(400).json({ error: "Codigo 2FA invalido." });

      await query("UPDATE users SET totp_enabled = TRUE WHERE id = $1", [req.user!.userId]);
      await audit(req, "2FA habilitado", "auth");
      res.json({ message: "2FA habilitado." });
    } catch (err) { next(err); }
  }
);

router.delete(
  "/me/2fa",
  authenticate,
  validate([body("token").optional().isString().trim().isLength({ min: 6, max: 8 }).withMessage("Codigo 2FA invalido.")]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows } = await query<{ totp_secret: string | null; totp_enabled: boolean }>(
        "SELECT totp_secret, totp_enabled FROM users WHERE id = $1 AND deleted_at IS NULL",
        [req.user!.userId]
      );
      const current = rows[0];
      if (!current) return res.status(404).json({ error: "Usuario nao encontrado." });

      if (current.totp_enabled) {
        const ok = speakeasy.totp.verify({
          secret: current.totp_secret || "",
          encoding: "base32",
          token: String(req.body.token || ""),
          window: 1,
        });
        if (!ok) return res.status(400).json({ error: "Codigo 2FA invalido." });
      }

      await query("UPDATE users SET totp_secret = NULL, totp_enabled = FALSE WHERE id = $1", [req.user!.userId]);
      await audit(req, "2FA desabilitado", "auth");
      res.json({ message: "2FA desabilitado." });
    } catch (err) { next(err); }
  }
);

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.userId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }

    const { rows } = await query(
      `SELECT u.id, u.email, u.role, u.name, u.cnpj, u.avatar, u.avatar_url,
              u.email_verified_at, u.last_login_at, u.created_at,
              c.name AS company, c.id AS company_id, c.status AS company_status
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario nao encontrado." });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.userId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }

    const allowed = ["name", "avatar", "avatar_url", "cnpj"];
    if (req.user!.role === "admin") allowed.push("role", "company_id", "email_verified_at");

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${i}`);
        values.push(req.body[key]);
        i++;
      }
    }
    if (!fields.length) return res.status(400).json({ error: "Nenhum campo para atualizar." });

    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE users SET ${fields.join(", ")}
       WHERE id = $${i} AND deleted_at IS NULL
       RETURNING id, email, role, name, cnpj, avatar, avatar_url, company_id`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario nao encontrado." });
    await audit(req, "Usuario atualizado", "auth", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch("/:id/password", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.userId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Nova senha deve ter ao menos 8 caracteres." });
    }

    if (req.user!.role !== "admin") {
      if (!currentPassword) return res.status(400).json({ error: "Senha atual e obrigatoria." });
      const { rows } = await query<{ password_hash: string }>(
        "SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL",
        [req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: "Usuario nao encontrado." });
      const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!valid) return res.status(401).json({ error: "Senha atual incorreta." });
    }

    const hash = await bcrypt.hash(newPassword, ROUNDS);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2 AND deleted_at IS NULL", [hash, req.params.id]);
    await query("UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL", [req.params.id]);
    await audit(req, "Senha alterada", "auth", req.params.id);
    res.json({ message: "Senha alterada com sucesso." });
  } catch (err) { next(err); }
});

router.delete("/:id", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.userId === req.params.id) {
      return res.status(400).json({ error: "Voce nao pode remover sua propria conta." });
    }

    const { rows } = await query<{ name: string }>(
      "SELECT name FROM users WHERE id = $1 AND deleted_at IS NULL",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario nao encontrado." });

    await query("UPDATE users SET deleted_at = NOW() WHERE id = $1", [req.params.id]);
    await query("UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL", [req.params.id]);
    await audit(req, `Usuario desativado: ${rows[0].name}`, "auth", req.params.id);
    res.json({ message: "Usuario desativado." });
  } catch (err) { next(err); }
});

export default router;
