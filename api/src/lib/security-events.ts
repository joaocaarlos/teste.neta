import crypto from "crypto";
import { Request } from "express";
import { query } from "../db";
import { logger } from "./logger";

export type SecurityEventType =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "password_reset_requested"
  | "password_reset_completed"
  | "password_changed"
  | "2fa_enabled"
  | "2fa_disabled"
  | "2fa_failed"
  | "suspicious_activity"
  | "account_locked"
  | "session_revoked"
  | "captcha_failed"
  | "ip_blocked"
  | "kyc_submitted"
  | "kyc_approved"
  | "kyc_rejected"
  | "register_success"
  | "register_failed";

export type SecuritySeverity = "info" | "warning" | "critical";

const DEFAULT_SEVERITY: Record<SecurityEventType, SecuritySeverity> = {
  login_success: "info",
  login_failed: "warning",
  login_locked: "warning",
  password_reset_requested: "info",
  password_reset_completed: "info",
  password_changed: "info",
  "2fa_enabled": "info",
  "2fa_disabled": "warning",
  "2fa_failed": "warning",
  suspicious_activity: "critical",
  account_locked: "critical",
  session_revoked: "info",
  captcha_failed: "warning",
  ip_blocked: "critical",
  kyc_submitted: "info",
  kyc_approved: "info",
  kyc_rejected: "warning",
  register_success: "info",
  register_failed: "warning",
};

function emailHash(email?: string | null): string | null {
  if (!email) return null;
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

export interface SecurityEventInput {
  type: SecurityEventType;
  severity?: SecuritySeverity;
  userId?: string | null;
  email?: string | null;
  req?: Pick<Request, "ip" | "headers">;
  metadata?: Record<string, unknown>;
}

/**
 * Registra um evento de segurança. Nunca lança — falhas são logadas
 * mas não interrompem o fluxo principal.
 *
 * @example
 *   await logSecurityEvent({ type: "login_failed", email, req });
 *   await logSecurityEvent({ type: "suspicious_activity", userId, metadata: { reason: "ip changed" } });
 */
export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    const severity = input.severity || DEFAULT_SEVERITY[input.type] || "info";
    const ip = input.req?.ip || null;
    const userAgent = input.req?.headers?.["user-agent"] || null;

    await query(
      `INSERT INTO security_events
         (event_type, severity, user_id, email_hash, ip, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5::inet, $6, $7::jsonb)`,
      [
        input.type,
        severity,
        input.userId || null,
        emailHash(input.email),
        ip,
        userAgent,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    );

    // Eventos críticos também vão pro logger
    if (severity === "critical") {
      logger.warn(
        { type: input.type, userId: input.userId, ip, metadata: input.metadata },
        "[security] critical event"
      );
    }
  } catch (err) {
    logger.error({ err, type: input.type }, "[security-events] failed to log");
  }
}

/**
 * Retorna eventos suspeitos de um IP nas últimas N horas.
 * Útil para decidir se aplica rate-limit ou bloqueio mais agressivo.
 */
export async function recentFailuresByIp(
  ip: string,
  windowHours: number = 1
): Promise<number> {
  try {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::TEXT AS count
       FROM security_events
       WHERE ip = $1::inet
         AND event_type IN ('login_failed', 'login_locked', '2fa_failed', 'captcha_failed')
         AND created_at > NOW() - ($2 || ' hours')::INTERVAL`,
      [ip, String(windowHours)]
    );
    return Number(rows[0]?.count || 0);
  } catch {
    return 0;
  }
}
