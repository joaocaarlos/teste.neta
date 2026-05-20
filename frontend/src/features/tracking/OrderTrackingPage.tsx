/**
 * OrderTrackingPage — authenticated page for tracking order status.
 * - /acompanhamento        → shows list of active orders with status
 * - /acompanhamento/:id   → shows status timeline for a specific order
 *
 * Redirects to /login if the user is not authenticated.
 * Inline styles only. TypeScript strict.
 */

import { useState, useEffect } from "react";
import { Package, CheckCircle, Clock, Truck, ChevronRight } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { apiGet, apiGetList } from "../../services/api";
import { normOrder } from "../../utils";
import { Order, OrderStatus } from "../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineStep {
  key: OrderStatus;
  label: string;
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: "Contratado",
    label: "Pedido criado",
    description: "O contrato foi assinado e o pedido foi gerado.",
  },
  {
    key: "Em setup",
    label: "Configuração",
    description: "Fornecedor está configurando máquinas e materiais.",
  },
  {
    key: "Em produção",
    label: "Em produção",
    description: "A produção está em andamento.",
  },
  {
    key: "Em inspeção",
    label: "Inspeção de qualidade",
    description: "Produto em inspeção de qualidade antes do envio.",
  },
  {
    key: "Aguardando coleta",
    label: "Aguardando coleta",
    description: "Pronto para envio — aguardando transportadora.",
  },
  {
    key: "Em transporte",
    label: "Em transporte",
    description: "Produto em rota de entrega.",
  },
  {
    key: "Entregue",
    label: "Entregue",
    description: "Produto entregue com sucesso.",
  },
];

const STATUS_ORDER: OrderStatus[] = [
  "Contratado",
  "Em setup",
  "Em produção",
  "Em inspeção",
  "Aguardando coleta",
  "Em transporte",
  "Entregue",
  "Finalizado",
];

const STATUS_COLORS: Record<string, string> = {
  Publicado: "var(--amber)",
  "Em cotação": "var(--blue, #3b82f6)",
  Contratado: "var(--purple, #8b5cf6)",
  "Em setup": "var(--purple, #8b5cf6)",
  "Em produção": "var(--blue, #3b82f6)",
  "Em inspeção": "var(--amber)",
  "Aguardando coleta": "var(--amber)",
  "Em transporte": "var(--blue, #3b82f6)",
  Entregue: "var(--green, #22c55e)",
  Finalizado: "var(--white3)",
  Cancelado: "var(--red, #ef4444)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function fmtValue(val?: string | number): string {
  if (!val) return "—";
  if (typeof val === "string") return val;
  return `R$ ${Number(val).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  })}`;
}

function getStepIndex(status?: string): number {
  return STATUS_ORDER.indexOf((status ?? "") as OrderStatus);
}

function getOrderId(): string | null {
  const parts = window.location.pathname.split("/").filter(Boolean);
  // parts[0] === "acompanhamento", parts[1] is optional id
  return parts.length >= 2 ? parts[1] : null;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ label }: { label?: string }) {
  if (!label) return null;
  const color = STATUS_COLORS[label] ?? "var(--white3)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        fontFamily: "var(--mono)",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function OrderTimeline({ order }: { order: Order }) {
  const currentIndex = getStepIndex(order.status);
  const isCancelled = order.status === "Cancelado";

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "24px 28px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          fontFamily: "var(--cond)",
          fontSize: 14,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "var(--white3)",
          marginBottom: 20,
        }}
      >
        Linha do Tempo
      </div>

      {isCancelled && (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--red, #ef4444)22",
            border: "1px solid var(--red, #ef4444)44",
            color: "var(--red, #ef4444)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            marginBottom: 16,
          }}
        >
          Este pedido foi cancelado.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {TIMELINE_STEPS.map((step, i) => {
          const stepIndex = getStepIndex(step.key);
          const isDone = !isCancelled && currentIndex >= stepIndex;
          const isCurrent = !isCancelled && currentIndex === stepIndex;

          const color = isDone
            ? isCurrent
              ? "var(--amber)"
              : "var(--green, #22c55e)"
            : "var(--white3)";

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                paddingBottom: i < TIMELINE_STEPS.length - 1 ? 16 : 0,
              }}
            >
              {/* Icon + line */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                  width: 20,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: isDone ? color : "transparent",
                    border: `2px solid ${color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {isDone && !isCurrent && (
                    <CheckCircle
                      size={12}
                      style={{ color: "var(--bg)", strokeWidth: 3 }}
                    />
                  )}
                  {isCurrent && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--bg)",
                      }}
                    />
                  )}
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 20,
                      background: isDone
                        ? "var(--green, #22c55e)"
                        : "var(--border)",
                      marginTop: 2,
                    }}
                  />
                )}
              </div>

              {/* Text */}
              <div style={{ paddingTop: 1 }}>
                <div
                  style={{
                    fontFamily: "var(--cond)",
                    fontSize: 14,
                    fontWeight: isCurrent ? 800 : 600,
                    textTransform: "uppercase",
                    letterSpacing: ".03em",
                    color: isDone ? "var(--white)" : "var(--white3)",
                    marginBottom: 2,
                  }}
                >
                  {step.label}
                  {isCurrent && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        color: "var(--amber)",
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                      }}
                    >
                      ← atual
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "var(--body)",
                    fontSize: 12,
                    color: isDone ? "var(--white2)" : "var(--white3)",
                    lineHeight: 1.5,
                  }}
                >
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── OrderDetail ─────────────────────────────────────────────────────────────

function OrderDetail({ order }: { order: Order }) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "24px 28px",
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                color: "var(--amber)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              {order.id}
            </span>
            <StatusBadge label={order.status} />
          </div>
          <h2
            style={{
              fontFamily: "var(--cond)",
              fontSize: 24,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              color: "var(--white)",
              margin: 0,
            }}
          >
            {order.product || order.id}
          </h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 28,
              fontWeight: 900,
              color: "var(--amber)",
              lineHeight: 1,
            }}
          >
            {fmtValue(order.value ?? order.value_raw)}
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: "var(--white3)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginTop: 4,
            }}
          >
            Valor do pedido
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
          borderTop: "1px solid var(--border)",
          paddingTop: 16,
        }}
      >
        {[
          order.supplier && { label: "Fornecedor", value: order.supplier },
          order.client && { label: "Cliente", value: order.client },
          order.deadline && {
            label: "Prazo de entrega",
            value: fmtDate(order.deadline),
          },
          order.created && {
            label: "Criado em",
            value: fmtDate(order.created),
          },
        ]
          .filter(Boolean)
          .map((item) => {
            if (!item) return null;
            return (
              <div key={item.label}>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    color: "var(--white3)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 4,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--cond)",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--white)",
                  }}
                >
                  {item.value}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── OrderListItem ────────────────────────────────────────────────────────────

function OrderListItem({ order }: { order: Order }) {
  return (
    <a
      href={`/acompanhamento/${order.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          transition: "border-color .2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor =
            "rgba(232,160,32,.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor =
            "var(--border)";
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                color: "var(--amber)",
                textTransform: "uppercase",
              }}
            >
              {order.id}
            </span>
            <StatusBadge label={order.status} />
          </div>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 16,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--white)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {order.product || order.id}
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            {[
              order.supplier && `Fornecedor: ${order.supplier}`,
              order.deadline && `Prazo: ${fmtDate(order.deadline)}`,
            ]
              .filter(Boolean)
              .map((text) => (
                <span
                  key={text as string}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    color: "var(--white3)",
                  }}
                >
                  {text}
                </span>
              ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "var(--cond)",
                fontSize: 20,
                fontWeight: 800,
                color: "var(--amber)",
              }}
            >
              {fmtValue(order.value ?? order.value_raw)}
            </div>
          </div>
          <ChevronRight size={16} style={{ color: "var(--white3)" }} />
        </div>
      </div>
    </a>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "16px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          height: 12,
          width: "25%",
          background: "var(--bg3)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          height: 18,
          width: "60%",
          background: "var(--bg3)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          height: 10,
          width: "40%",
          background: "var(--bg3)",
          borderRadius: 2,
        }}
      />
    </div>
  );
}

// ─── OrderTrackingPage ────────────────────────────────────────────────────────

export function OrderTrackingPage() {
  const { user, authLoading } = useAuth();
  const [orderId] = useState<string | null>(getOrderId);
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
    }
  }, [user, authLoading]);

  // Fetch data
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    if (orderId) {
      // Fetch single order
      apiGet<Record<string, unknown>>(`/v1/orders/${orderId}`)
        .then((result) => {
          if (cancelled) return;
          if (!result.ok) {
            setError("Pedido não encontrado ou sem permissão de acesso.");
            return;
          }
          setOrder(normOrder(result.data) as Order);
        })
        .catch(() => {
          if (!cancelled) setError("Erro ao conectar com o servidor.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      // Fetch list of orders
      apiGetList<Record<string, unknown>>("/v1/orders")
        .then((rows) => {
          if (cancelled) return;
          setOrders((rows || []).map((r) => normOrder(r) as Order));
        })
        .catch(() => {
          if (!cancelled) setError("Não foi possível carregar os pedidos.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [user, orderId]);

  if (authLoading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--white3)",
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          Carregando…
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "28px 32px",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "var(--body)",
      }}
    >
      {/* ─── Page header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        {orderId && (
          <a
            href="/acompanhamento"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--white3)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              marginBottom: 12,
            }}
          >
            ← Todos os pedidos
          </a>
        )}

        <h1
          style={{
            fontFamily: "var(--cond)",
            fontSize: 30,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            color: "var(--white)",
            margin: 0,
          }}
        >
          Acompanhamento{" "}
          <span style={{ color: "var(--amber)" }}>
            {orderId ? `· ${orderId}` : "Operacional"}
          </span>
        </h1>
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--white3)",
            marginTop: 4,
            letterSpacing: ".06em",
          }}
        >
          {loading
            ? "Carregando…"
            : orderId
            ? "Status detalhado do pedido"
            : `${orders.length} pedidos encontrados`}
        </p>
      </div>

      {/* ─── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: orderId ? 1 : 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ─── Error state ──────────────────────────────────────────────────── */}
      {!loading && error && (
        <div
          style={{
            padding: "20px 24px",
            background: "var(--red, #ef4444)22",
            border: "1px solid var(--red, #ef4444)44",
            color: "var(--red, #ef4444)",
            fontFamily: "var(--mono)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* ─── Single order view ────────────────────────────────────────────── */}
      {!loading && !error && orderId && order && (
        <>
          <OrderDetail order={order} />
          <OrderTimeline order={order} />
        </>
      )}

      {/* ─── Order not found ──────────────────────────────────────────────── */}
      {!loading && !error && orderId && !order && (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
          }}
        >
          <Package
            size={48}
            style={{ color: "var(--white3)", marginBottom: 16 }}
          />
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 18,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--white3)",
            }}
          >
            Pedido não encontrado
          </div>
        </div>
      )}

      {/* ─── Orders list ──────────────────────────────────────────────────── */}
      {!loading && !error && !orderId && orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.map((o) => (
            <OrderListItem key={o.id} order={o} />
          ))}
        </div>
      )}

      {/* ─── Empty list ───────────────────────────────────────────────────── */}
      {!loading && !error && !orderId && orders.length === 0 && (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
          }}
        >
          <Clock
            size={48}
            style={{ color: "var(--white3)", marginBottom: 16 }}
          />
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 18,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--white3)",
              marginBottom: 8,
            }}
          >
            Nenhum pedido em andamento
          </div>
          <div
            style={{
              fontFamily: "var(--body)",
              fontSize: 13,
              color: "var(--white3)",
            }}
          >
            Quando uma proposta for aceita e o contrato assinado, o pedido
            aparecerá aqui.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
            <a
              href="/demandas"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--white2)",
                textDecoration: "none",
                padding: "8px 16px",
                border: "1px solid var(--border2)",
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              Ver demandas
            </a>
            <a
              href="/pedidos"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--bg)",
                textDecoration: "none",
                padding: "8px 16px",
                background: "var(--amber)",
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              Ver pedidos
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderTrackingPage;
