/**
 * session.ts — Utilitários de sessão legada
 *
 * Centraliza limpeza de dados locais antigos e normalização básica de usuário.
 * A autenticação real usa cookies httpOnly — nada sensível fica aqui.
 */

const LOCAL_KEY = "cap4_jwt";
const SESSION_KEY = "cap4_session";

/** Remove todos os dados de sessão legados do localStorage. */
export function clearLegacySession(): void {
  localStorage.removeItem(LOCAL_KEY);
  localStorage.removeItem(SESSION_KEY);
  // Limpa outras chaves cap4_ residuais
  Object.keys(localStorage)
    .filter((k) => k.startsWith("cap4_"))
    .forEach((k) => localStorage.removeItem(k));
}

/** Lê um cookie pelo nome. */
export function getCookie(name: string): string {
  return (
    document.cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith(`${name}=`))
      ?.slice(name.length + 1) || ""
  );
}

/** Normaliza o objeto de usuário retornado pela API para o shape usado no frontend. */
export function normalizeSessionUser(user: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!user) return null;
  return {
    ...user,
    companyStatus: user.companyStatus ?? user.company_status,
    company_id:    user.company_id    ?? user.companyId,
    loginAt:       user.loginAt       ?? new Date().toISOString(),
  };
}
