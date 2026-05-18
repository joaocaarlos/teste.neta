import { Request, Response, NextFunction } from "express";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";
import crypto from "crypto";

/**
 * CAPTCHA opcional via hCaptcha (recomendado) ou reCAPTCHA.
 *
 * Estratégia: só exige CAPTCHA depois de 3 falhas no mesmo IP/email
 * em 15 minutos. Antes disso, passa direto — não atrapalha UX de
 * usuários legítimos.
 *
 * Configuração (env):
 *   HCAPTCHA_SECRET   — secret do hCaptcha (preferido)
 *   RECAPTCHA_SECRET  — fallback para reCAPTCHA v3
 *   CAPTCHA_THRESHOLD — número de falhas antes de exigir (default 3)
 *
 * Cliente envia o token no header `x-captcha-token`.
 */

const CAPTCHA_THRESHOLD = Number(process.env.CAPTCHA_THRESHOLD) || 3;
const WINDOW_SECONDS = 15 * 60;

function failKey(identifier: string): string {
  return `captcha:fail:${crypto.createHash("sha256").update(identifier).digest("hex").slice(0, 16)}`;
}

export async function recordFailure(identifier: string): Promise<number> {
  try {
    const key = failKey(identifier);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    return count;
  } catch {
    return 0;
  }
}

export async function clearFailures(identifier: string): Promise<void> {
  try {
    await redis.del(failKey(identifier));
  } catch { /* silently */ }
}

async function verifyHCaptcha(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) return true; // sem secret configurado → passa (dev)

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.append("remoteip", ip);

    const res = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      logger.warn({ errors: data["error-codes"] }, "[captcha] hCaptcha verify failed");
    }
    return Boolean(data.success);
  } catch (err) {
    logger.error({ err }, "[captcha] hCaptcha request error");
    return false;
  }
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return true;

  try {
    const body = new URLSearchParams({ secret, response: token });
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean; score?: number };
    // reCAPTCHA v3: aceita score >= 0.5 (filtra bots)
    return Boolean(data.success && (data.score == null || data.score >= 0.5));
  } catch (err) {
    logger.error({ err }, "[captcha] reCAPTCHA request error");
    return false;
  }
}

/**
 * Middleware: exige CAPTCHA quando o identifier acumulou N falhas.
 * Usar em /auth/login, /auth/register, /auth/forgot-password.
 *
 * @param identifierFn como extrair identificador (email + IP, etc)
 */
export function requireCaptchaAfterFailures(
  identifierFn: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip se hCaptcha/recaptcha não configurados (dev)
    if (!process.env.HCAPTCHA_SECRET && !process.env.RECAPTCHA_SECRET) {
      return next();
    }

    try {
      const identifier = identifierFn(req);
      const key = failKey(identifier);
      const count = Number((await redis.get(key).catch(() => null)) || 0);

      if (count < CAPTCHA_THRESHOLD) return next();

      const token = (req.headers["x-captcha-token"] as string) || req.body?.captcha;
      if (!token) {
        return res.status(428).json({
          error: "CAPTCHA obrigatório após múltiplas tentativas.",
          code: "captcha_required",
          provider: process.env.HCAPTCHA_SECRET ? "hcaptcha" : "recaptcha",
        });
      }

      const valid = process.env.HCAPTCHA_SECRET
        ? await verifyHCaptcha(token, req.ip)
        : await verifyRecaptcha(token);

      if (!valid) {
        return res.status(401).json({
          error: "CAPTCHA inválido. Tente novamente.",
          code: "captcha_invalid",
        });
      }

      next();
    } catch (err) {
      logger.error({ err }, "[captcha] middleware error — passing through");
      next();
    }
  };
}
