export interface ScoreInput {
  demand: {
    process: string;
    location?: string | null;
    cert_required?: string | null;
    deadline?: string | null;
    budget?: string | null;
  };
  proposal: {
    process_match?: string;
    city?: string | null;
    cert?: string | null;
    days?: number | null;
    rating?: number | null;
    total_raw?: number | null;
    idle_pct?: number | null;
  };
}

export interface ScoreResult {
  total: number;
  breakdown: { criterion: string; weight: number; earned: number; reason: string }[];
}

const norm = (s?: string | null) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function getUF(loc?: string | null): string | null {
  const m = (loc || "").match(/\/([A-Z]{2})\b/);
  return m ? m[1] : null;
}

const UF_REGION: Record<string, string> = {
  AC: "N", AP: "N", AM: "N", PA: "N", RO: "N", RR: "N", TO: "N",
  AL: "NE", BA: "NE", CE: "NE", MA: "NE", PB: "NE", PE: "NE", PI: "NE", RN: "NE", SE: "NE",
  DF: "CO", GO: "CO", MT: "CO", MS: "CO",
  ES: "SE", MG: "SE", RJ: "SE", SP: "SE",
  PR: "S", RS: "S", SC: "S",
};

function sameRegion(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && UF_REGION[a] && UF_REGION[a] === UF_REGION[b]);
}

export function calcScore(inp: ScoreInput): ScoreResult {
  const { demand, proposal } = inp;
  const breakdown: ScoreResult["breakdown"] = [];
  let total = 0;

  const dProc = norm(demand.process);
  const pProc = norm(proposal.process_match || "");
  const processScore = dProc && pProc.includes(dProc) ? 25 : dProc.split(/\s+/).some((w) => w.length > 3 && pProc.includes(w)) ? 15 : 5;
  total += processScore;
  breakdown.push({ criterion: "Processo compatível", weight: 25, earned: processScore, reason: processScore === 25 ? "match exato" : processScore === 15 ? "match parcial" : "sem match claro" });

  const idle = proposal.idle_pct ?? 50;
  const capScore = Math.round((idle / 100) * 20);
  total += capScore;
  breakdown.push({ criterion: "Capacidade disponível", weight: 20, earned: capScore, reason: `${idle}% ociosidade` });

  const dUF = getUF(demand.location);
  const pUF = getUF(proposal.city);
  const locScore = !dUF || !pUF ? 7 : dUF === pUF ? 15 : sameRegion(dUF, pUF) ? 8 : 4;
  total += locScore;
  breakdown.push({ criterion: "Localização logística", weight: 15, earned: locScore, reason: dUF === pUF ? "mesma UF" : dUF && pUF ? `${pUF} → ${dUF}` : "UF não definida" });

  const dCert = norm(demand.cert_required);
  const pCert = norm(proposal.cert);
  const certScore = !dCert ? 12 : pCert.includes(dCert) ? 15 : pCert ? 6 : 0;
  total += certScore;
  breakdown.push({ criterion: "Certificação", weight: 15, earned: certScore, reason: !dCert ? "não exigida" : pCert.includes(dCert) ? "atende" : pCert ? "outras certs" : "sem cert" });

  const rating = proposal.rating ?? 3;
  const ratingScore = Math.round((rating / 5) * 10);
  total += ratingScore;
  breakdown.push({ criterion: "Avaliação histórica", weight: 10, earned: ratingScore, reason: `${rating}★` });

  const days = proposal.days ?? 30;
  const prazoScore = days <= 10 ? 10 : days <= 20 ? 7 : days <= 30 ? 4 : 1;
  total += prazoScore;
  breakdown.push({ criterion: "Prazo", weight: 10, earned: prazoScore, reason: `${days} dias` });

  const precoScore = 3;
  total += precoScore;
  breakdown.push({ criterion: "Preço médio", weight: 5, earned: precoScore, reason: "neutro (sem média de mercado)" });

  return { total: Math.min(100, Math.max(0, total)), breakdown };
}
