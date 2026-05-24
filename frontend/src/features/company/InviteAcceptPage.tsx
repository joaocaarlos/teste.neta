import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import { apiFetch } from "../../services/api";
import { toast } from "../../utils/toast";

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/company/accept-invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Bem-vindo a empresa!");
        setDone(true);
        setTimeout(() => navigate("/dashboard"), 2000);
      } else {
        setError(data.error || "Erro ao aceitar convite.");
      }
    } catch {
      setError("Erro de conexao.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", fontFamily: "var(--body)", color: "var(--white)", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontFamily: "var(--cond)", fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
            Convite Recebido
          </div>
          <p style={{ color: "var(--white3)", marginBottom: 20, fontSize: 14 }}>
            Faca login para aceitar o convite.
          </p>
          <a href={`/login?redirect=/convite/${token}`} style={{ background: "var(--amber)", color: "var(--bg)", padding: "10px 24px", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", textDecoration: "none", letterSpacing: "0.06em" }}>
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", fontFamily: "var(--body)", color: "var(--white)", padding: 24 }}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", padding: 40, maxWidth: 400, width: "100%", textAlign: "center" }}>
        {done ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>:)</div>
            <div style={{ fontFamily: "var(--cond)", fontSize: 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Convite Aceito!
            </div>
            <p style={{ color: "var(--white3)", marginTop: 8, fontSize: 13 }}>Redirecionando...</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>@</div>
            <div style={{ fontFamily: "var(--cond)", fontSize: 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Voce foi convidado
            </div>
            <p style={{ color: "var(--white3)", fontSize: 14, marginBottom: 24 }}>
              Clique abaixo para ingressar na empresa.
            </p>
            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "10px 14px", fontSize: 12, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <button
              onClick={handleAccept}
              disabled={loading}
              style={{ width: "100%", background: "var(--amber)", color: "var(--bg)", border: "none", padding: "12px", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer" }}
            >
              {loading ? "Processando..." : "Aceitar Convite"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default InviteAcceptPage;
