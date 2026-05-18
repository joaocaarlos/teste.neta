import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis";

export interface JwtPayload {
  userId: string;
  role: "demandante" | "fornecedor" | "admin";
  companyId: string | null;
  jti?: string;
  exp?: number;
  iat?: number;
  csrf?: string;
  totpEnabled?: boolean;
  totpVerifiedAt?: number;
  createdAt?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      authToken?: string;
      authSource?: "header" | "cookie";
    }
  }
}

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const pair = raw.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

async function ensureRedisConnected(): Promise<boolean> {
  try {
    if (redis.status === "wait" || redis.status === "end") await redis.connect();
    return true;
  } catch {
    return false;
  }
}

export function getAccessTokenFromRequest(req: Request): { token: string; source: "header" | "cookie" } | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return { token: header.slice(7), source: "header" };
  const cookieToken = getCookie(req, "access_token");
  if (cookieToken) return { token: cookieToken, source: "cookie" };
  return null;
}

export async function isAccessTokenRevoked(jti?: string): Promise<boolean> {
  if (!jti) return false;
  if (!(await ensureRedisConnected())) return false;
  const revoked = await redis.get(`jwt:revoked:${jti}`).catch(() => null);
  return revoked === "1";
}

export async function revokeAccessToken(payload: Pick<JwtPayload, "jti" | "exp">): Promise<void> {
  if (!payload.jti || !(await ensureRedisConnected())) return;
  const ttl = payload.exp ? Math.max(payload.exp - Math.floor(Date.now() / 1000), 1) : 7 * 24 * 60 * 60;
  await redis.set(`jwt:revoked:${payload.jti}`, "1", "EX", ttl).catch(() => undefined);
}

function validateCsrf(req: Request, payload: JwtPayload, source: "header" | "cookie"): boolean {
  if (source !== "cookie" || !UNSAFE_METHODS.has(req.method)) return true;
  const header = req.get("x-csrf-token");
  const cookie = getCookie(req, "csrf_token");
  return Boolean(header && cookie && header === cookie && (!payload.csrf || header === payload.csrf));
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const tokenInfo = getAccessTokenFromRequest(req);
  if (!tokenInfo) {
    return res.status(401).json({ error: "Token nao informado." });
  }

  try {
    const payload = jwt.verify(tokenInfo.token, SECRET) as JwtPayload;
    if (await isAccessTokenRevoked(payload.jti)) {
      return res.status(401).json({ error: "Token revogado." });
    }
    if (!validateCsrf(req, payload, tokenInfo.source)) {
      return res.status(403).json({ error: "CSRF token invalido." });
    }
    req.user = payload;
    req.authToken = tokenInfo.token;
    req.authSource = tokenInfo.source;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalido ou expirado." });
  }
}

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const tokenInfo = getAccessTokenFromRequest(req);
  if (!tokenInfo) return next();

  try {
    const payload = jwt.verify(tokenInfo.token, SECRET) as JwtPayload;
    if (await isAccessTokenRevoked(payload.jti)) return next();
    if (!validateCsrf(req, payload, tokenInfo.source)) return next();
    req.user = payload;
    req.authToken = tokenInfo.token;
    req.authSource = tokenInfo.source;
  } catch {
    // Public uploads still work when the browser carries an old invalid cookie.
  }
  next();
}

export function authorize(...roles: Array<"demandante" | "fornecedor" | "admin">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    next();
  };
}
