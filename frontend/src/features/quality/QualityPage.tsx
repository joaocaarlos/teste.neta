/**
 * QualityPage — Quality metrics dashboard
 * Route: /qualidade/*
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../services/api";
import { useAuth } from "../../app/AuthContext";
import { color, font, fontSize, space } from "../../styles/tokens";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  reviewer_name?: string;
  reviewer_company?: string;
  created_at?: string;
}

interface ReviewsResponse {
  reviews: Review[];
  average_rating?: number;
  total?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function computeDistribution(reviews: Review[]): Record<number, number> {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    const key = Math.round(r.rating);
    if (key >= 1 && key <= 5) dist[key]++;
  });
  return dist;
}

function StarRating({ value }: { value: number }) {
  return (
    <span style={{ fontFamily: font.mono, color: color.amber }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ opacity: i < Math.round(value) ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white2, width: 12 }}>
        {star}
      </span>
      <span style={{ color: color.amber, fontSize: fontSize.caption }}>★</span>
      <div style={{ flex: 1, background: color.bg3, height: 8, borderRadius: 2 }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color.amber,
            borderRadius: 2,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3, width: 28, textAlign: "right" }}>
        {count}
      </span>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      style={{
        background: color.bg2,
        border: `1px solid ${color.border}`,
        padding: "16px 20px",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <span style={{ fontFamily: font.body, fontSize: fontSize.body, color: color.white, fontWeight: 600 }}>
            {review.reviewer_name ?? "Anônimo"}
          </span>
          {review.reviewer_company && (
            <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3, marginLeft: 10 }}>
              {review.reviewer_company}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StarRating value={review.rating} />
          <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.amber }}>
            {review.rating.toFixed(1)}
          </span>
        </div>
      </div>
      {review.comment && (
        <p style={{ fontFamily: font.body, fontSize: fontSize.body, color: color.white2, margin: 0, lineHeight: 1.5 }}>
          {review.comment}
        </p>
      )}
      <div style={{ fontFamily: font.mono, fontSize: "9px", color: color.white3, marginTop: 8 }}>
        {review.created_at ? new Date(review.created_at).toLocaleDateString("pt-BR") : "—"}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function QualityPage() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiGet<ReviewsResponse | Review[]>("/v1/reviews");
    if (result.ok) {
      const raw = result.data;
      if (Array.isArray(raw)) {
        setReviews(raw);
        const avg = raw.length > 0 ? raw.reduce((s, r) => s + r.rating, 0) / raw.length : 0;
        setAvgRating(avg);
      } else {
        setReviews(raw.reviews ?? []);
        setAvgRating(raw.average_rating ?? 0);
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (authLoading || (!user && !authLoading)) return null;

  const distribution = computeDistribution(reviews);
  const total = reviews.length;

  return (
    <div style={{ padding: `${space.xl}px ${space.lg}px`, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: space.xl }}>
        <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.2em", textTransform: "uppercase", color: color.amber, marginBottom: 8 }}>
          Qualidade
        </div>
        <h1 style={{ fontFamily: font.condensed, fontSize: fontSize.hero, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, margin: 0 }}>
          Métricas de <span style={{ color: color.amber }}>Avaliação</span>
        </h1>
      </div>

      {loading && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3 }}>
          Carregando avaliações…
        </div>
      )}

      {error && (
        <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.red, marginBottom: space.md }}>
          Erro ao carregar avaliações: {error}
          <button
            onClick={() => void load()}
            style={{ marginLeft: 12, color: color.amber, background: "none", border: "none", cursor: "pointer", fontFamily: font.mono, fontSize: fontSize.caption }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: space.xl }}>
            <div style={{ background: color.bg2, border: `1px solid ${color.border}`, padding: "20px 24px" }}>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.1em", textTransform: "uppercase", color: color.white3, marginBottom: 8 }}>
                Avaliação Média
              </div>
              <div style={{ fontFamily: font.condensed, fontSize: "48px", fontWeight: 900, color: color.amber, lineHeight: 1 }}>
                {avgRating.toFixed(1)}
              </div>
              <div style={{ marginTop: 6 }}>
                <StarRating value={avgRating} />
              </div>
            </div>
            <div style={{ background: color.bg2, border: `1px solid ${color.border}`, padding: "20px 24px" }}>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.1em", textTransform: "uppercase", color: color.white3, marginBottom: 8 }}>
                Total de Avaliações
              </div>
              <div style={{ fontFamily: font.condensed, fontSize: "48px", fontWeight: 900, color: color.white, lineHeight: 1 }}>
                {total.toLocaleString("pt-BR")}
              </div>
            </div>
            <div style={{ background: color.bg2, border: `1px solid ${color.border}`, padding: "20px 24px" }}>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.1em", textTransform: "uppercase", color: color.white3, marginBottom: 8 }}>
                Nota 5 Estrelas
              </div>
              <div style={{ fontFamily: font.condensed, fontSize: "48px", fontWeight: 900, color: color.green, lineHeight: 1 }}>
                {total > 0 ? `${Math.round((distribution[5] / total) * 100)}%` : "—"}
              </div>
            </div>
          </div>

          {/* Distribution chart */}
          <div style={{ background: color.bg2, border: `1px solid ${color.border}`, padding: "24px", marginBottom: space.xl }}>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white3, marginBottom: 20 }}>
              Distribuição de Notas
            </div>
            {[5, 4, 3, 2, 1].map((star) => (
              <RatingBar key={star} star={star} count={distribution[star]} total={total} />
            ))}
          </div>

          {/* Recent reviews */}
          <div>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.label, letterSpacing: "0.12em", textTransform: "uppercase", color: color.white3, marginBottom: 16 }}>
              Avaliações Recentes
            </div>
            {reviews.length === 0 ? (
              <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: color.white3, padding: space.xl, textAlign: "center", border: `1px dashed ${color.border}` }}>
                Nenhuma avaliação encontrada.
              </div>
            ) : (
              reviews.slice(0, 20).map((r) => <ReviewCard key={r.id} review={r} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default QualityPage;
