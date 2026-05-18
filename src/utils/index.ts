/**
 * Utility functions for localStorage persistence
 */
export const DB = {
  _k: (k: string) => `cap4_${k}`,
  get<T>(k: string): T | null {
    try {
      const json = localStorage.getItem(this._k(k));
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  },
  set<T>(k: string, v: T): void {
    localStorage.setItem(this._k(k), JSON.stringify(v));
  },
  del(k: string): void {
    localStorage.removeItem(this._k(k));
  },
};

/**
 * Get cookie value by name
 */
export function getCookie(name: string): string {
  return (
    document.cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith(`${name}=`))
      ?.slice(name.length + 1) || ""
  );
}

/**
 * Format date to Brazilian locale
 */
export const fmtDate = (v: string | Date | null | undefined): string | null => {
  if (!v) return null;
  return new Date(v).toLocaleDateString("pt-BR");
};

/**
 * Format currency to BRL
 */
export const fmtBRL = (v: number): string => {
  if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$${Math.round(v / 1000)}k`;
  return `R$${v}`;
};

/**
 * Clear legacy session data
 */
export function clearLegacySession(): void {
  localStorage.removeItem("cap4_jwt");
  DB.del("session");
}

/**
 * Normalize user data from API response
 */
export function normalizeSessionUser(user: any): any {
  if (!user) return null;
  return {
    ...user,
    companyStatus: user.companyStatus || user.company_status,
    company_id: user.company_id || user.companyId,
    loginAt: user.loginAt || new Date().toISOString(),
  };
}

/**
 * Normalizers: map API fields to component shapes
 */
export const normDemand = (d: any) => ({
  ...d,
  proposals: d.proposals_count || d.proposals || 0,
  nda: d.nda_required ?? d.nda,
  cert: d.cert_required ?? d.cert,
  created: d.created_at ? fmtDate(d.created_at) : d.created,
});

export const normOrder = (o: any) => ({
  ...o,
  supplier: o.supplier_company_name || o.supplier || "—",
  value:
    o.value ||
    (o.value_raw
      ? `R$ ${Number(o.value_raw).toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
        })}`
      : "—"),
  gross: Number(o.value_raw) || o.gross || 0,
});

export const normProposal = (p: any) => ({
  ...p,
  supplier: p.supplier_name || p.supplier,
  unit: p.unit_price || p.unit,
  start: p.start_date || p.start,
  riskFactors: p.risk_factors || p.riskFactors || [],
});

export const normTxn = (t: any) => ({
  ...t,
  order: t.order_id || t.order,
  gross: Number(t.gross) || 0,
  commission: Number(t.commission) || 0,
});

export const normContract = (c: any) => ({
  ...c,
  pedido: c.order_id || c.pedido,
  gerado: c.generated_at ? fmtDate(c.generated_at) : c.gerado,
  assinado: c.signed_at ? fmtDate(c.signed_at) : c.assinado,
  escopo: c.scope || c.escopo,
  valor: c.valor || c.value,
});

export const normDispute = (d: any) => ({
  ...d,
  order: d.order_id || d.order,
  desc: d.description || d.desc,
});

export const normReview = (r: any) => ({
  ...r,
  order: r.order_id || r.order,
  from: r.from_company || r.from,
});

export const normNotif = (n: any) => ({
  ...n,
  desc: n.descricao || n.desc,
  lida: n.read !== undefined ? n.read : n.lida,
});

export const normNDA = (n: any) => ({
  ...n,
  demanda: n.demand_id || n.demanda,
  assinado: n.signed_at
    ? n.signed_at.includes && n.signed_at.includes("/")
      ? n.signed_at
      : fmtDate(n.signed_at)
    : n.assinado,
});
