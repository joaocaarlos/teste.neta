/**
 * ReviewsPage — authenticated page for viewing supplier reviews.
 * Redirects to /login if the user is not authenticated.
 * Inline styles only. TypeScript strict.
 */

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { apiGet } from "../../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  order?: string;
  order_id?: string;
  from?: string;
  reviewer_company?: string;
  rating: number;
  comment: string;
  date?: string;
  created_at?: string;
  criterios?: Array<[string, number]>;
  criteria?: Record<string, number>;
}

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

function normalizeReview(raw: Record<string, unknown>): Review {
  const rating =
    typeof raw.rating === "number"
      ? raw.rating
      : Number(raw.rating ?? 0);

  const criterios: Array<[string, number]> = [];
  if (Array.isArray(raw.criterios)) {
    (raw.criterios as Array<[string, number]>).forEach((c) =>
      criterios.push(c)
    );
  } else if (raw.criteria && typeof raw.criteria === "object") {
    Object.entries(raw.criteria as Record<string, number>).forEach(
      ([k, v]) => criterios.push([k, v])
    );
  }

  return {
    id: String(raw.id ?? `rev-${Math.random()}`),
    order: String(raw.order ?? raw.order_id ?? ""),
    from: String(raw.from ?? raw.reviewer_company ?? "Empresa"),
    rating: Math.max(1, Math.min(5, Math.round(rating))),
    comment: String(raw.comment ?? ""),
    date: String(raw.date ?? raw.created_at ?? ""),
    criterios: criterios.length > 0 ? criterios : undefined,
  };
}

// ─── StarDisplay ─────────────────────────────────────────────────────────────

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          style={{
            color: n <= rating ? "var(--amber)" : "var(--white3)",
            fill: n <= rating ? "var(--amber)" : "transparent",
            display: "inline-block",
            verticalAlign: "middle",
          }}
        />
      ))}
    </span>
  );
}

// ─── ReviewCard ──────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color .2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "rgba(232,160,32,.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          {review.order && (
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9,
                color: "var(--amber)",
                marginRight: 10,
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              {review.order}
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--cond)",
              fontSize: 15,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".03em",
              color: "var(--white)",
            }}
          >
            {review.from}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <StarDisplay rating={review.rating} />
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              color: "var(--white3)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            {fmtDate(review.date)}
          </span>
        </div>
      </div>

      {/* Comment */}
      <div
        style={{
          fontFamily: "var(--body)",
          fontSize: 13,
          fontWeight: 300,
          color: "var(--white2)",
          lineHeight: 1.6,
        }}
      >
        {review.comment}
      </div>

      {/* Criteria breakdown */}
      {review.criterios && review.criterios.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 8,
            padding: "12px 0 0",
            borderTop: "1px solid var(--border)",
          }}
        >
          {review.criterios.map(([label, score]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--amber)",
                  lineHeight: 1,
                }}
              >
                {score}
                <span style={{ fontSize: 10, color: "var(--white3)" }}>/5</span>
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 8,
                  color: "var(--white3)",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div
          style={{
            height: 14,
            width: "30%",
            background: "var(--bg3)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            height: 14,
            width: 80,
            background: "var(--bg3)",
            borderRadius: 2,
          }}
        />
      </div>
      <div
        style={{
          height: 12,
          width: "80%",
          background: "var(--bg3)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          height: 12,
          width: "60%",
          background: "var(--bg3)",
          borderRadius: 2,
        }}
      />
    </div>
  );
}

// ─── ReviewsPage ─────────────────────────────────────────────────────────────

export function ReviewsPage() {
  const { user, authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
    }
  }, [user, authLoading]);

  // Fetch reviews
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGet<unknown[]>("/v1/reviews")
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setError("Não foi possível carregar as avaliações.");
          return;
        }
        const data = Array.isArray(result.data) ? result.data : [];
        setReviews(
          data.map((r) => normalizeReview(r as Record<string, unknown>))
        );
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao conectar com o servidor.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const avgRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10
        ) / 10
      : 0;

  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
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
            Avaliações{" "}
            <span style={{ color: "var(--amber)" }}>&amp; Reputação</span>
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
              : `${reviews.length} avaliações · nota média ${avgRating}★`}
          </p>
        </div>
      </div>

      {/* ─── Stats row ────────────────────────────────────────────────────── */}
      {!loading && !error && reviews.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Nota média", value: `${avgRating}★` },
            { label: "Total de avaliações", value: String(reviews.length) },
            {
              label: "Avaliações 5★",
              value: String(fiveStarCount),
            },
            {
              label: "Taxa 5★",
              value:
                reviews.length > 0
                  ? `${Math.round((fiveStarCount / reviews.length) * 100)}%`
                  : "—",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--cond)",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "var(--amber)",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  color: "var(--white3)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
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

      {/* ─── Empty state ──────────────────────────────────────────────────── */}
      {!loading && !error && reviews.length === 0 && (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
          }}
        >
          <Star
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
            Nenhuma avaliação ainda
          </div>
          <div
            style={{
              fontFamily: "var(--body)",
              fontSize: 13,
              color: "var(--white3)",
            }}
          >
            As avaliações de fornecedores aparecerão aqui após a conclusão dos
            pedidos.
          </div>
        </div>
      )}

      {/* ─── Reviews list ─────────────────────────────────────────────────── */}
      {!loading && !error && reviews.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reviews.map((review, i) => (
            <ReviewCard key={review.id ?? i} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;
