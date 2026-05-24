import crypto from "crypto";
import { query } from "../db";

export type TokenPurpose = "password_reset" | "email_verify";

export interface TokenIssue {
  plain: string;
  id: string;
  expiresAt: Date;
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

const TTL_HOURS: Record<TokenPurpose, number> = {
  password_reset: 1,
  email_verify: 24,
};

export async function issueToken(userId: string, purpose: TokenPurpose): Promise<TokenIssue> {
  const plain = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(plain);
  const expires = new Date(Date.now() + TTL_HOURS[purpose] * 3600 * 1000);

  await query(
    `UPDATE auth_tokens SET used_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose]
  );

  const { rows } = await query<{ id: string }>(
    `INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, tokenHash, purpose, expires]
  );
  return { plain, id: rows[0].id, expiresAt: expires };
}

export async function consumeToken(plain: string, purpose: TokenPurpose): Promise<{ valid: boolean; userId?: string }> {
  const tokenHash = sha256(plain);
  const { rows } = await query<{ id: string; user_id: string; expires_at: Date; used_at: Date | null }>(
    `SELECT id, user_id, expires_at, used_at FROM auth_tokens
     WHERE token_hash = $1 AND purpose = $2`,
    [tokenHash, purpose]
  );
  const tok = rows[0];
  if (!tok) return { valid: false };
  if (tok.used_at) return { valid: false };
  if (new Date(tok.expires_at) < new Date()) return { valid: false };

  await query("UPDATE auth_tokens SET used_at = NOW() WHERE id = $1", [tok.id]);
  return { valid: true, userId: tok.user_id };
}

export async function cleanupExpiredTokens(): Promise<number> {
  const { rowCount } = await query(
    `DELETE FROM auth_tokens WHERE expires_at < NOW() OR used_at < NOW() - INTERVAL '7 days'`
  );
  return rowCount || 0;
}

export interface SessionIssue {
  refreshToken: string;
  sessionId: string;
  expiresAt: Date;
}

export async function issueRefreshToken(
  userId: string,
  userAgent?: string,
  ip?: string
): Promise<SessionIssue> {
  const plain = crypto.randomBytes(32).toString("hex");
  const refreshHash = sha256(plain);
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO sessions (user_id, refresh_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, refreshHash, userAgent || null, ip || null, expires]
  );
  return { refreshToken: plain, sessionId: rows[0].id, expiresAt: expires };
}

export async function rotateRefreshToken(plain: string): Promise<SessionIssue | null> {
  const refreshHash = sha256(plain);
  const { rows } = await query<{ id: string; user_id: string; expires_at: Date; revoked_at: Date | null }>(
    `SELECT id, user_id, expires_at, revoked_at FROM sessions WHERE refresh_hash = $1`,
    [refreshHash]
  );
  const sess = rows[0];
  if (!sess || sess.revoked_at) return null;
  if (new Date(sess.expires_at) < new Date()) return null;

  await query("UPDATE sessions SET revoked_at = NOW() WHERE id = $1", [sess.id]);
  return issueRefreshToken(sess.user_id);
}

export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [sessionId, userId]
  );
  return (rowCount || 0) > 0;
}
