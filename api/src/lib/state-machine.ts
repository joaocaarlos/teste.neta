/**
 * State machines para validar transições de status.
 * Evita pular etapas (ex: Contratado → Entregue direto).
 *
 * Uso:
 *   if (!canTransition(orderTransitions, currentStatus, newStatus)) {
 *     return res.status(400).json({ error: "Transição inválida." });
 *   }
 */

export type Transitions = Readonly<Record<string, readonly string[]>>;

/** Order status: progressão linear da produção. */
export const orderTransitions: Transitions = {
  Publicado:           ["Em cotação", "Cancelado"],
  "Em cotação":        ["Contratado", "Cancelado"],
  Contratado:          ["Em setup", "Cancelado"],
  "Em setup":          ["Em produção", "Cancelado"],
  "Em produção":       ["Em inspeção", "Cancelado"],
  "Em inspeção":       ["Aguardando coleta", "Em produção"], // pode voltar p/ produção
  "Aguardando coleta": ["Em transporte"],
  "Em transporte":     ["Entregue"],
  Entregue:            ["Finalizado"],
  Finalizado:          [],
  Cancelado:           [],
};

/** Demand status. */
export const demandTransitions: Transitions = {
  Publicado:        ["Em cotação", "Cancelado"],
  "Em cotação":     ["Em negociação", "Contratado", "Cancelado"],
  "Em negociação":  ["Contratado", "Em cotação", "Cancelado"],
  Contratado:       ["Finalizado", "Cancelado"],
  Finalizado:       [],
  Cancelado:        [],
};

/** Contract status. */
export const contractTransitions: Transitions = {
  Gerado:                  ["Aguardando assinatura", "Cancelado"],
  "Aguardando assinatura": ["Assinado", "Cancelado"],
  Assinado:                ["Cancelado"],
  Cancelado:               [],
};

/** NDA status. */
export const ndaTransitions: Transitions = {
  Pendente:  ["Ativo", "Cancelado"],
  Ativo:     ["Expirado", "Cancelado"],
  Expirado:  [],
  Cancelado: [],
};

/** Dispute status. */
export const disputeTransitions: Transitions = {
  Aberta:       ["Em análise", "Resolvida", "Encerrada"],
  "Em análise": ["Resolvida", "Encerrada"],
  Resolvida:    ["Encerrada"],
  Encerrada:    [],
};

/** Verifica se a transição é permitida. */
export function canTransition(
  machine: Transitions,
  from: string,
  to: string
): boolean {
  if (from === to) return true; // idempotente
  return (machine[from] || []).includes(to);
}

/** Lança Error com 400 se inválido. */
export function assertTransition(
  machine: Transitions,
  from: string,
  to: string,
  label = "status"
): void {
  if (!canTransition(machine, from, to)) {
    const next = machine[from] || [];
    const msg = next.length
      ? `Transição de ${label} inválida: '${from}' → '${to}'. Permitido: ${next.join(", ")}`
      : `Não é possível alterar ${label}: '${from}' é estado final.`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = 400;
    throw err;
  }
}
