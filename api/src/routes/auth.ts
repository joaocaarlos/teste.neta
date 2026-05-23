import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import speakeasy from "speakeasy";
import { body } from "express-validator";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { query } from "../db";
import { authenticate, revokeAccessToken } from "../middleware/auth";
import { audit } from "../lib/audit";
import { emailTemplates, sendEmail } from "../lib/email";
import { redis } from "../lib/redis";
import {
  consumeToken,
  issueRefreshToken,
  issueToken,
  revokeSession,
  rotateRefreshToken,
} from "../lib/tokens";
import { validate, v } from "../lib/validators";
import { validateZod } from "../middleware/validate";
import { checkPasswordStrength } from "../lib/password-policy";
import { logSecurityEvent } from "../lib/security-events";
import { recordFailure as recordCaptchaFailure, clearFailures as clearCaptchaFailures, requireCaptchaAfterFailures } from "../middleware/captcha";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
  role: z.enum(["demandante", "fornecedor", "admin"]).optional(),
  totp: z.string().min(6).max(8).optional(),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(100),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  role: z.enum(["demandante", "fornecedor"]),
  cnpj: z.string().optional(),
  companyName: z.string().min(2).max(200),
  city: z.string().optional(),
});

const router = Router();

/** Identifier para CAPTCHA: email + IP */
const captchaIdentifier = (req: Request) =>
  `${(req.body?.email || "").toString().toLowerCase().trim()}|${req.ip || "unknown"}`;
const SECRET  = process.env.JWT_SECRET || "dev-secret-change-me";
const EXPIRES = process.env.JWT_EXPIRES_IN || "7d";
const ROUNDS  = Number(process.env.BCRYPT_ROUNDS) || 10;
const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
const LOGIN_LOCKOUT_MAX = Number(process.env.LOGIN_LOCKOUT_MAX) || 5;
const LOGIN_LOCKOUT_TTL_SECONDS = Number(process.env.LOGIN_LOCKOUT_TTL_SECONDS) || 15 * 60;

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: "demandante" | "fornecedor" | "admin";
  name: string;
  company_id: string | null;
  cnpj: string | null;
  avatar: string | null;
  avatar_url?: string | null;
  email_verified_at?: Date | null;
  totp_secret?: string | null;
  totp_enabled?: boolean;
  three_fa_enabled?: boolean;
  google_id?: string | null;
  auth_provider?: string;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Muitas tentativas de login. Aguarde 15 minutos." },
});

// Auth endpoints — limite restrito
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "unknown",
});

const forgotPasswordLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: { error: "Limite de tentativas atingido. Tente em 1 hora." },
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function createCsrfToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function signAccessToken(user: Pick<UserRow, "id" | "role" | "company_id">, csrf = createCsrfToken()): { token: string; csrf: string } {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user.id, role: user.role, companyId: user.company_id, csrf },
    SECRET,
    { expiresIn: EXPIRES, jwtid: jti } as jwt.SignOptions
  );
  return { token, csrf };
}

function setAccessCookie(res: Response, token: string): void {
  res.cookie("access_token", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function setCsrfCookie(res: Response, csrf: string): void {
  res.cookie("csrf_token", csrf, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const pair = raw.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

function setRefreshCookie(res: Response, refreshToken: string, expiresAt: Date): void {
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/api/auth",
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("csrf_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/api/auth" });
}

async function withRedis<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (redis.status === "wait" || redis.status === "end") await redis.connect();
    return await fn();
  } catch {
    return fallback;
  }
}

function loginFailureKey(email: string): string {
  return `auth:login-fail:${crypto.createHash("sha256").update(email).digest("hex")}`;
}

async function getLoginLockoutSeconds(email: string): Promise<number> {
  const key = loginFailureKey(email);
  return withRedis(async () => {
    const count = Number(await redis.get(key));
    if (count < LOGIN_LOCKOUT_MAX) return 0;
    return await redis.ttl(key);
  }, 0);
}

async function recordFailedLogin(email: string): Promise<void> {
  const key = loginFailureKey(email);
  await withRedis(async () => {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, LOGIN_LOCKOUT_TTL_SECONDS);
  }, undefined);
}

async function clearFailedLogin(email: string): Promise<void> {
  await withRedis(async () => {
    await redis.del(loginFailureKey(email));
  }, undefined);
}

async function sendVerification(userId: string, email: string, name: string): Promise<void> {
  const token = await issueToken(userId, "email_verify");
  const welcome = emailTemplates.welcome(name);
  const verify = emailTemplates.emailVerify(token.plain);
  await sendEmail({ to: email, ...welcome });
  await sendEmail({ to: email, ...verify });
}

router.get("/csrf", (_req: Request, res: Response) => {
  const csrf = createCsrfToken();
  setCsrfCookie(res, csrf);
  res.json({ csrfToken: csrf });
});

router.post(
  "/login",
  authRateLimit,
  loginLimiter,
  requireCaptchaAfterFailures(captchaIdentifier),
  validateZod(loginSchema),
  validate([
    v.email("email"),
    body("password").isString().isLength({ min: 6 }).withMessage("Senha invalida."),
    body("role").optional().isIn(["demandante", "fornecedor", "admin"]),
    body("totp").optional().isString().trim().isLength({ min: 6, max: 8 }).withMessage("Codigo 2FA invalido."),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, role, totp } = req.body as {
        email: string; password: string; role?: string; totp?: string;
      };
      const normalizedEmail = email.toLowerCase().trim();
      const lockoutSeconds = await getLoginLockoutSeconds(normalizedEmail);
      if (lockoutSeconds > 0) {
        return res.status(429).json({
          error: `Muitas falhas de login. Tente novamente em ${Math.ceil(lockoutSeconds / 60)} minuto(s).`,
          code: "login_locked",
          retryAfterSeconds: lockoutSeconds,
        });
      }

      const { rows } = await query<UserRow>(
        `SELECT id, email, password_hash, role, name, company_id, cnpj, avatar, avatar_url,
                email_verified_at, totp_secret, totp_enabled, three_fa_enabled
         FROM users
         WHERE email = $1 AND deleted_at IS NULL`,
        [normalizedEmail]
      );
      const user = rows[0];
      const emailHash = normalizedEmail.replace(/(.{2}).+(@.+)/, "$1***$2");

      if (!user || (role && user.role !== role)) {
        await recordFailedLogin(normalizedEmail);
        await audit({ ip: req.ip, user: undefined } as unknown as Request, `Login falhou: ${emailHash}`, "auth_fail");
        return res.status(401).json({ error: "E-mail, senha ou perfil incorretos." });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        await recordFailedLogin(normalizedEmail);
        await audit({ ip: req.ip, user: undefined } as unknown as Request, `Login falhou (senha): ${emailHash}`, "auth_fail");
        return res.status(401).json({ error: "E-mail, senha ou perfil incorretos." });
      }

      if (user.totp_enabled) {
        if (!totp) {
          return res.status(401).json({ error: "Codigo 2FA obrigatorio.", code: "totp_required" });
        }
        const ok = speakeasy.totp.verify({
          secret: user.totp_secret || "",
          encoding: "base32",
          token: totp,
          window: 1,
        });
        if (!ok) {
          await recordFailedLogin(normalizedEmail);
          return res.status(401).json({ error: "Codigo 2FA invalido.", code: "totp_invalid" });
        }
      }

      // Após verificação de TOTP bem-sucedida, verificar 3FA
      if (user.three_fa_enabled) {
        await send3faCode(user.id, user.email, req);
        return res.status(200).json({ code: "3fa_required", userId: user.id });
      }

      if (
        REQUIRE_EMAIL_VERIFICATION &&
        user.role !== "admin" &&
        !user.email_verified_at
      ) {
        return res.status(403).json({
          error: "Confirme seu e-mail antes de acessar a plataforma.",
          code: "email_not_verified",
        });
      }

      let company = "";
      let companyStatus = "";
      if (user.company_id) {
        const comp = await query<{ name: string; status: string }>(
          "SELECT name, status FROM companies WHERE id = $1",
          [user.company_id]
        );
        company = comp.rows[0]?.name || "";
        companyStatus = comp.rows[0]?.status || "";
      }

      if (companyStatus === "Suspenso" || companyStatus === "Reprovado") {
        return res.status(403).json({
          error: `Empresa ${companyStatus.toLowerCase()}. Contate o administrador.`,
        });
      }

      await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
      await clearFailedLogin(normalizedEmail);

      const reqWithUser = Object.assign(Object.create(Object.getPrototypeOf(req)), req, {
        user: { userId: user.id, role: user.role, companyId: user.company_id },
      });
      await audit(reqWithUser, "Login realizado", "auth");

      const access = signAccessToken(user);
      const refresh = await issueRefreshToken(user.id, req.get("user-agent"), req.ip);
      setRefreshCookie(res, refresh.refreshToken, refresh.expiresAt);
      setAccessCookie(res, access.token);
      setCsrfCookie(res, access.csrf);

      res.json({
        token: access.token,
        csrfToken: access.csrf,
        refreshToken: refresh.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          company_id: user.company_id,
          company,
          cnpj: user.cnpj,
          avatar: user.avatar,
          avatar_url: user.avatar_url,
          emailVerified: Boolean(user.email_verified_at),
          companyStatus,
        },
      });
    } catch (err) { next(err); }
  }
);

router.post(
  "/register",
  authRateLimit,
  validateZod(registerSchema),
  validate([
    v.email("email"),
    v.password("password"),
    body("role").isIn(["demandante", "fornecedor"]).withMessage("role deve ser demandante ou fornecedor."),
    v.notEmptyString("name", 200),
    v.notEmptyString("companyName", 200),
    body("cnpj").isString().trim().isLength({ min: 14, max: 20 }).withMessage("CNPJ invalido."),
    v.optionalString("city", 100),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, role, name, cnpj, companyName, city } = req.body as {
        email: string; password: string; role: "demandante" | "fornecedor";
        name: string; cnpj: string; companyName: string; city?: string;
      };
      const normalizedEmail = email.toLowerCase().trim();

      const pwdCheck = checkPasswordStrength(password, { email: normalizedEmail, name, cnpj });
      if (!pwdCheck.ok) {
        await logSecurityEvent({
          type: "register_failed",
          email: normalizedEmail,
          req,
          metadata: { reason: "weak_password", errors: pwdCheck.errors },
        });
        return res.status(400).json({
          error: "Senha não atende à política.",
          details: pwdCheck.errors,
          strength: pwdCheck.strength,
        });
      }

      const existing = await query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
      if (existing.rowCount) return res.status(409).json({ error: "E-mail ja cadastrado." });

      const hash = await bcrypt.hash(password, ROUNDS);
      const compRes = await query<{ id: string }>(
        `INSERT INTO companies (name, cnpj, type, status, city)
         VALUES ($1, $2, $3, 'Pendente', $4) RETURNING id`,
        [companyName, cnpj, role === "fornecedor" ? "Fornecedor" : "Demandante", city || null]
      );
      const companyId = compRes.rows[0].id;

      const userRes = await query<{ id: string }>(
        `INSERT INTO users (email, password_hash, role, name, company_id, cnpj, avatar)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          normalizedEmail,
          hash,
          role,
          name,
          companyId,
          cnpj,
          name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase(),
        ]
      );
      const userId = userRes.rows[0].id;

      const reqWithUser = Object.assign(Object.create(Object.getPrototypeOf(req)), req, {
        user: { userId, role, companyId },
      });
      await audit(reqWithUser, "Cadastro realizado", "auth", null, { usuario: name, empresa: companyName });
      await sendVerification(userId, normalizedEmail, name);

      res.status(201).json({
        message: "Cadastro recebido. Verifique seu e-mail para ativar o acesso.",
        requiresEmailVerification: true,
        user: { id: userId, email: normalizedEmail, role, name, company_id: companyId, company: companyName, cnpj, companyStatus: "Pendente" },
      });
    } catch (err) { next(err); }
  }
);

router.post(
  "/forgot-password",
  forgotPasswordLimit,
  requireCaptchaAfterFailures(captchaIdentifier),
  validate([v.email("email")]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email: string };
      const { rows } = await query<{ id: string; email: string; name: string }>(
        "SELECT id, email, name FROM users WHERE email = $1 AND deleted_at IS NULL",
        [email.toLowerCase().trim()]
      );
      const user = rows[0];
      if (user) {
        const token = await issueToken(user.id, "password_reset");
        const tpl = emailTemplates.passwordReset(token.plain, user.name);
        await sendEmail({ to: user.email, ...tpl });
        await audit({ ip: req.ip, user: { userId: user.id, role: "demandante", companyId: null } } as unknown as Request, "Reset de senha solicitado", "auth");
      }
      res.json({ message: "Se o e-mail existir, enviaremos instrucoes de redefinicao." });
    } catch (err) { next(err); }
  }
);

router.post(
  "/reset-password",
  validate([v.notEmptyString("token", 200), v.password("password")]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body as { token: string; password: string };

      const pwdCheck = checkPasswordStrength(password);
      if (!pwdCheck.ok) {
        return res.status(400).json({
          error: "Senha não atende à política.",
          details: pwdCheck.errors,
          strength: pwdCheck.strength,
        });
      }

      const consumed = await consumeToken(token, "password_reset");
      if (!consumed.valid || !consumed.userId) return res.status(400).json({ error: "Token invalido ou expirado." });

      const hash = await bcrypt.hash(password, ROUNDS);
      await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, consumed.userId]);
      await query("UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL", [consumed.userId]);

      await logSecurityEvent({
        type: "password_reset_completed",
        userId: consumed.userId,
        req,
      });

      res.json({ message: "Senha redefinida com sucesso." });
    } catch (err) { next(err); }
  }
);

async function verifyEmailToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.body?.token || req.query.token) as string | undefined;
    if (!token) return res.status(400).json({ error: "Token e obrigatorio." });
    const consumed = await consumeToken(token, "email_verify");
    if (!consumed.valid || !consumed.userId) return res.status(400).json({ error: "Token invalido ou expirado." });
    await query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = $1", [consumed.userId]);
    res.json({ message: "E-mail confirmado com sucesso." });
  } catch (err) { next(err); }
}

router.get("/verify-email", verifyEmailToken);
router.post("/verify-email", verifyEmailToken);

router.post("/resend-verification", forgotPasswordLimit, authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<{ id: string; email: string; name: string; email_verified_at: Date | null }>(
      "SELECT id, email, name, email_verified_at FROM users WHERE id = $1",
      [req.user!.userId]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "Usuario nao encontrado." });
    if (user.email_verified_at) return res.json({ message: "E-mail ja confirmado." });
    await sendVerification(user.id, user.email, user.name);
    res.json({ message: "Novo e-mail de confirmacao enviado." });
  } catch (err) { next(err); }
});

router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = (req.body?.refreshToken as string | undefined) || getCookie(req, "refresh_token");
    if (!refreshToken) return res.status(401).json({ error: "Refresh token nao informado." });
    const rotated = await rotateRefreshToken(refreshToken);
    if (!rotated) return res.status(401).json({ error: "Refresh token invalido ou expirado." });

    const session = await query<{ user_id: string }>("SELECT user_id FROM sessions WHERE id = $1", [rotated.sessionId]);
    const userRows = await query<UserRow>(
      `SELECT id, role, company_id, email, name, cnpj, avatar, avatar_url, email_verified_at, password_hash
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [session.rows[0]?.user_id]
    );
    const user = userRows.rows[0];
    if (!user) return res.status(401).json({ error: "Sessao invalida." });

    const access = signAccessToken(user);
    setRefreshCookie(res, rotated.refreshToken, rotated.expiresAt);
    setAccessCookie(res, access.token);
    setCsrfCookie(res, access.csrf);
    res.json({ token: access.token, csrfToken: access.csrf, refreshToken: rotated.refreshToken });
  } catch (err) { next(err); }
});

router.get("/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.role, u.name, u.cnpj, u.avatar, u.avatar_url,
              u.email_verified_at, u.last_login_at,
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

router.get("/sessions", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT id, user_agent, ip, expires_at, revoked_at, last_used_at, created_at
       FROM sessions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.delete("/sessions/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await revokeSession(req.params.id, req.user!.userId);
    if (!ok) return res.status(404).json({ error: "Sessao nao encontrada." });
    res.json({ message: "Sessao encerrada." });
  } catch (err) { next(err); }
});

router.post("/logout", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await revokeAccessToken({ jti: req.user?.jti, exp: req.user?.exp });
    const refreshToken = getCookie(req, "refresh_token");
    if (refreshToken) {
      await query(
        "UPDATE sessions SET revoked_at = NOW() WHERE refresh_hash = encode(digest($1, 'sha256'), 'hex') AND user_id = $2",
        [refreshToken, req.user!.userId]
      ).catch(() => undefined);
    }
    clearAuthCookies(res);
    await audit(req, "Logout", "auth");
    res.json({ message: "Logout registrado." });
  } catch (err) { next(err); }
});

// ─── Helpers 3FA ────────────────────────────────────────────────────────────

async function send3faCode(userId: string, email: string, req: Request): Promise<void> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await query(
    `INSERT INTO three_fa_codes (user_id, code, expires_at, ip) VALUES ($1, $2, $3, $4)`,
    [userId, code, expiresAt, req.ip]
  );

  await sendEmail({
    to: email,
    subject: "Seu código de verificação — CapaCity",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#D97706">🔐 Verificação em 3 fatores</h2>
        <p>Seu código de acesso é:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111;background:#f5f5f5;padding:16px;text-align:center;border-radius:4px">
          ${code}
        </div>
        <p style="color:#666;font-size:12px">Expira em 10 minutos. Não compartilhe este código.</p>
      </div>
    `,
  });
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

router.post("/google", authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) return res.status(400).json({ error: "idToken obrigatório." });

    // Verificar token com Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ error: "Token inválido." });

    const { email, name, sub: googleId, picture } = payload;

    // Buscar ou criar usuário
    let { rows } = await query<UserRow>(
      `SELECT id, email, role, name, company_id, totp_enabled, totp_secret, three_fa_enabled, avatar_url
       FROM users WHERE email = $1 OR google_id = $2 LIMIT 1`,
      [email.toLowerCase(), googleId]
    );

    let user = rows[0];

    if (!user) {
      // Cadastro automático via Google (demandante por padrão)
      const newUser = await query<UserRow>(
        `INSERT INTO users (name, email, role, auth_provider, google_id, email_verified_at, avatar_url, password_hash)
         VALUES ($1, $2, 'demandante', 'google', $3, NOW(), $4, '')
         RETURNING id, email, role, name, company_id, totp_enabled, totp_secret, three_fa_enabled, avatar_url`,
        [name || email.split("@")[0], email.toLowerCase(), googleId, picture || null]
      );
      user = newUser.rows[0];
      await audit(req, "Cadastro via Google OAuth", "auth");
    } else if (!user.google_id) {
      // Vincular conta existente ao Google
      await query(
        `UPDATE users SET google_id = $1, auth_provider = 'google', avatar_url = COALESCE(avatar_url, $2) WHERE id = $3`,
        [googleId, picture || null, user.id]
      );
      await audit(req, "Conta vinculada ao Google OAuth", "auth");
    }

    // Se 3FA habilitado, não pode pular mesmo com Google
    if (user.three_fa_enabled) {
      await send3faCode(user.id, email.toLowerCase(), req);
      return res.status(200).json({ code: "3fa_required", userId: user.id });
    }

    const { token, csrf } = signAccessToken(user);
    const refresh = await issueRefreshToken(user.id, req.get("user-agent"), req.ip);
    setRefreshCookie(res, refresh.refreshToken, refresh.expiresAt);
    setAccessCookie(res, token);
    setCsrfCookie(res, csrf);

    res.json({
      token,
      csrfToken: csrf,
      refreshToken: refresh.refreshToken,
      user,
    });
  } catch (err) {
    next(err);
  }
});

// ─── 3FA: enviar código por e-mail ──────────────────────────────────────────

router.post("/3fa/send", authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ error: "userId obrigatório." });

    const { rows } = await query<{ email: string; three_fa_enabled: boolean }>(
      `SELECT email, three_fa_enabled FROM users WHERE id = $1`,
      [userId]
    );
    const user = rows[0];
    if (!user || !user.three_fa_enabled) return res.status(400).json({ error: "3FA não habilitado." });

    await send3faCode(userId, user.email, req);
    res.json({ message: "Código enviado por e-mail." });
  } catch (err) {
    next(err);
  }
});

// ─── 3FA: verificar código e finalizar login ─────────────────────────────────

router.post("/3fa/verify", authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, code } = req.body as { userId?: string; code?: string };
    if (!userId || !code) return res.status(400).json({ error: "userId e code são obrigatórios." });

    // Buscar código válido mais recente
    const { rows: codeRows } = await query<{ id: string; code: string }>(
      `SELECT id, code FROM three_fa_codes
       WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (!codeRows.length || codeRows[0].code !== code) {
      return res.status(401).json({ error: "Código inválido ou expirado.", code: "3fa_invalid" });
    }

    // Marcar código como usado
    await query(`UPDATE three_fa_codes SET used = TRUE WHERE id = $1`, [codeRows[0].id]);

    // Buscar usuário e emitir tokens
    const { rows } = await query<UserRow>(
      `SELECT id, email, role, name, company_id, avatar_url FROM users WHERE id = $1`,
      [userId]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const { token, csrf } = signAccessToken(user);
    const refresh = await issueRefreshToken(user.id, req.get("user-agent"), req.ip);
    setRefreshCookie(res, refresh.refreshToken, refresh.expiresAt);
    setAccessCookie(res, token);
    setCsrfCookie(res, csrf);

    await audit(req, "Login 3FA verificado", "auth");

    res.json({
      token,
      csrfToken: csrf,
      refreshToken: refresh.refreshToken,
      user,
    });
  } catch (err) {
    next(err);
  }
});

// ─── 3FA: ativar/desativar ───────────────────────────────────────────────────

router.patch("/3fa/toggle", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { enabled } = req.body as { enabled: boolean };
    await query(`UPDATE users SET three_fa_enabled = $1 WHERE id = $2`, [!!enabled, userId]);
    await audit(req, `3FA ${enabled ? "ativado" : "desativado"}`, "auth");
    res.json({ three_fa_enabled: !!enabled });
  } catch (err) {
    next(err);
  }
});

export default router;
