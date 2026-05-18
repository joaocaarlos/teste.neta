/**
 * Middleware para validar 2FA obrigatória para ADMIN
 * Implementação de security hardening
 */

import { Request, Response, NextFunction } from "express";
import { AuthenticationError } from "../lib/errors";
import { logger } from "../lib/logger";

/**
 * Verificar se usuário admin ativou 2FA
 * Se não, bloquear acesso a operações críticas
 */
export async function require2FAForAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.userId) {
    return next(new AuthenticationError("Não autenticado"));
  }

  // Só aplicar para admin
  if (req.user.role !== "admin") {
    return next();
  }

  // Verificar se admin ativou 2FA
  const hasTOTP = req.user.totpEnabled ?? false;

  if (!hasTOTP) {
    logger.warn(
      { userId: req.user.userId, method: req.method, path: req.path },
      "[2fa] Admin sem 2FA tentou acessar endpoint crítico"
    );

    return res.status(403).json({
      error: "2FA obrigatória para admins",
      code: "2FA_REQUIRED",
      detail: {
        message: "Ative autenticação 2FA em Segurança → Autenticação de Dois Fatores",
        setupUrl: "/settings/security/2fa",
      },
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

/**
 * Validar que token 2FA é recente (< 1 minuto)
 * Para operações super-críticas (reset de empresa, pagar via transferência)
 */
export async function validateRecentTOTP(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const totp_verified_at = req.user?.totpVerifiedAt;
  if (!totp_verified_at) {
    return next(new AuthenticationError("2FA não verificado nesta sessão"));
  }

  const ageSeconds = (Date.now() - totp_verified_at) / 1000;
  const MAX_AGE = 60; // 1 minuto

  if (ageSeconds > MAX_AGE) {
    logger.warn(
      { userId: req.user?.userId, ageSeconds },
      "[2fa] 2FA token expirou"
    );

    return res.status(401).json({
      error: "Verifique 2FA novamente para esta operação",
      code: "2FA_EXPIRED",
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

/**
 * Grace period para admins ativar 2FA
 * Após este período, bloqueia login
 */
export const TWO_FA_GRACE_PERIOD_DAYS = 7; // Admins tem 7 dias

export async function checkAdminTwoFAEnforcement(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.userId || req.user.role !== "admin") {
    return next();
  }

  const createdAt = new Date(req.user.createdAt ?? Date.now());
  const daysSinceCreation =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  const hasTOTP = req.user.totpEnabled ?? false;

  if (daysSinceCreation > TWO_FA_GRACE_PERIOD_DAYS && !hasTOTP) {
    logger.warn(
      { userId: req.user.userId, daysSinceCreation },
      "[2fa] Admin not enforcing 2FA after grace period"
    );

    return res.status(403).json({
      error: "2FA obrigatória para admins após período de transição",
      code: "2FA_ENFORCEMENT",
      timestamp: new Date().toISOString(),
    });
  }

  next();
}
