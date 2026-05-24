/**
 * Métricas de negócio — rastrear KPIs do marketplace
 * Integra com Prometheus via prom-client
 */

import { Counter, Gauge, Histogram } from "prom-client";

// ─── CONTADORES DE NEGÓCIO ─────────────────────────────────────────────

export const demandsCreatedTotal = new Counter({
  name: "capacity_demands_created_total",
  help: "Total de demandas criadas",
  labelNames: ["urgency", "requires_nda"],
});

export const demandsCompletedTotal = new Counter({
  name: "capacity_demands_completed_total",
  help: "Total de demandas finalizadas",
  labelNames: ["completion_status"], // "completed", "cancelled"
});

export const proposalsSubmittedTotal = new Counter({
  name: "capacity_proposals_submitted_total",
  help: "Total de propostas submetidas",
  labelNames: ["proposal_status"], // "pending", "accepted", "rejected"
});

export const proposalsAcceptedTotal = new Counter({
  name: "capacity_proposals_accepted_total",
  help: "Total de propostas aceitas (conversão demanda → pedido)",
  labelNames: ["supplier_type"], // "new", "returning"
});

export const ordersCreatedTotal = new Counter({
  name: "capacity_orders_created_total",
  help: "Total de pedidos criados",
  labelNames: ["client_type", "supplier_type"],
});

export const ordersCompletedTotal = new Counter({
  name: "capacity_orders_completed_total",
  help: "Total de pedidos finalizados",
  labelNames: ["completion_status"], // "delivered", "cancelled"
});

export const transactionsCreatedTotal = new Counter({
  name: "capacity_transactions_created_total",
  help: "Total de transações de pagamento",
  labelNames: ["payment_method"],
});

export const transactionsReleasedTotal = new Counter({
  name: "capacity_transactions_released_total",
  help: "Total de pagamentos liberados para fornecedor",
  labelNames: ["payment_method"],
});

export const disputesOpenedTotal = new Counter({
  name: "capacity_disputes_opened_total",
  help: "Total de disputas abertas",
  labelNames: ["dispute_type"],
});

export const disputesResolvedTotal = new Counter({
  name: "capacity_disputes_resolved_total",
  help: "Total de disputas resolvidas",
  labelNames: ["resolution_type"], // "settled", "refunded", "cancelled"
});

export const usersRegisteredTotal = new Counter({
  name: "capacity_users_registered_total",
  help: "Total de usuários registrados",
  labelNames: ["role", "company_status"], // role: demandante/fornecedor, status: approved/pending
});

export const companiesOnboardedTotal = new Counter({
  name: "capacity_companies_onboarded_total",
  help: "Total de empresas onboardadas",
  labelNames: ["type", "status"], // type: demandante/fornecedor, status: approved/pending
});

// ─── GAUGES (SNAPSHOT) ───────────────────────────────────────────────

export const activeDemandsGauge = new Gauge({
  name: "capacity_active_demands",
  help: "Demandas ativas no marketplace",
});

export const activeOrdersGauge = new Gauge({
  name: "capacity_active_orders",
  help: "Pedidos em andamento",
  labelNames: ["status"],
});

export const pendingTransactionsGauge = new Gauge({
  name: "capacity_pending_transactions",
  help: "Transações aguardando ação",
  labelNames: ["status"],
});

export const activeUsersGauge = new Gauge({
  name: "capacity_active_users",
  help: "Usuários ativos (login últimas 24h)",
  labelNames: ["role"],
});

export const activeCompaniesGauge = new Gauge({
  name: "capacity_active_companies",
  help: "Empresas ativas no marketplace",
  labelNames: ["type", "status"],
});

// ─── HISTOGRAMAS (DURAÇÃO / VALORES) ───────────────────────────────────────

export const proposalToAcceptanceDurationSeconds = new Histogram({
  name: "capacity_proposal_to_acceptance_duration_seconds",
  help: "Tempo entre proposta submetida e aceita (demanda)",
  buckets: [3600, 86400, 259200, 604800, 2592000], // 1h, 1d, 3d, 7d, 30d
});

export const orderDeliveryDurationSeconds = new Histogram({
  name: "capacity_order_delivery_duration_seconds",
  help: "Tempo entre ordem criada e entregue",
  buckets: [86400, 259200, 604800, 2592000, 7776000], // 1d, 3d, 7d, 30d, 90d
});

export const transactionValueHistogram = new Histogram({
  name: "capacity_transaction_value_reais",
  help: "Valor das transações em reais",
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
});

export const disputeResolutionDurationSeconds = new Histogram({
  name: "capacity_dispute_resolution_duration_seconds",
  help: "Tempo entre disputa aberta e resolvida",
  buckets: [3600, 86400, 259200, 604800], // 1h, 1d, 3d, 7d
});

// ─── HELPERS PARA REGISTRAR EVENTOS ──────────────────────────────────────────

export const businessMetrics = {
  recordDemandCreated: (urgency: string, requiresNDA: boolean) => {
    demandsCreatedTotal.labels(urgency, requiresNDA ? "true" : "false").inc();
  },

  recordProposalAccepted: (isNewSupplier: boolean) => {
    proposalsAcceptedTotal.labels(isNewSupplier ? "new" : "returning").inc();
  },

  recordOrderCreated: (clientType: string, supplierType: string) => {
    ordersCreatedTotal.labels(clientType, supplierType).inc();
  },

  recordOrderCompleted: (completionStatus: string) => {
    ordersCompletedTotal.labels(completionStatus).inc();
  },

  recordTransactionReleased: (paymentMethod: string) => {
    transactionsReleasedTotal.labels(paymentMethod).inc();
  },

  recordDisputeOpened: (disputeType: string) => {
    disputesOpenedTotal.labels(disputeType).inc();
  },

  recordDisputeResolved: (resolutionType: string) => {
    disputesResolvedTotal.labels(resolutionType).inc();
  },

  recordProposalDuration: (durationSeconds: number) => {
    proposalToAcceptanceDurationSeconds.observe(durationSeconds);
  },

  recordOrderDeliveryDuration: (durationSeconds: number) => {
    orderDeliveryDurationSeconds.observe(durationSeconds);
  },

  recordTransactionValue: (valueReais: number) => {
    transactionValueHistogram.observe(valueReais);
  },

  recordDisputeDuration: (durationSeconds: number) => {
    disputeResolutionDurationSeconds.observe(durationSeconds);
  },
};
