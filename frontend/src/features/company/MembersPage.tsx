/**
 * MembersPage — gerenciamento de membros da empresa (RBAC).
 */
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../app/AuthContext";
import { apiFetch } from "../../services/api";
import { toast } from "../../utils/toast";

interface Member {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role_id: string | null;
  role_name: string | null;
  hierarchy_level: number | null;
  status: "active" | "invited" | "blocked";
  joined_at: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string;
  hierarchy_level: number;
  is_system_role: boolean;
  member_count: number;
}

export function MembersPage() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [membersData, rolesData] = await Promise.all([
        apiFetch(`/company/${companyId}/members`).then(r => r.json()),
        apiFetch(`/company/${companyId}/roles`).then(r => r.json()),
      ]);
      setMembers(Array.isArray(membersData) ? membersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch {
      toast.error("Erro ao carregar membros.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !inviteEmail || !inviteRole) return;
    setInviting(true);
    try {
      const res = await apiFetch(`/company/${companyId}/members/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, roleId: inviteRole }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Erro ao convidar.");
        return;
      }
      toast.success("Convite enviado!");
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("");
      load();
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, roleId: string) => {
    if (!companyId) return;
    const res = await apiFetch(`/company/${companyId}/members/${memberId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    });
    if (res.ok) { toast.success("Cargo atualizado."); load(); }
    else { const d = await res.json(); toast.error(d.error || "Erro."); }
  };

  const handleBlock = async (memberId: string, blocked: boolean) => {
    if (!companyId) return;
    const res = await apiFetch(`/company/${companyId}/members/${memberId}/block`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked }),
    });
    if (res.ok) { toast.success(blocked ? "Membro bloqueado." : "Acesso restaurado."); load(); }
    else { const d = await res.json(); toast.error(d.error || "Erro."); }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!companyId) return;
    if (!confirm(`Remover ${name} da empresa?`)) return;
    const res = await apiFetch(`/company/${companyId}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Membro removido."); load(); }
    else { const d = await res.json(); toast.error(d.error || "Erro."); }
  };

  // ─── Status badge ──────────────────────────────────────────────────────────

  const statusColor = (s: string) =>
    s === "active" ? "#22c55e" : s === "blocked" ? "#ef4444" : "#f59e0b";
  const statusLabel = (s: string) =>
    s === "active" ? "Ativo" : s === "blocked" ? "Bloqueado" : "Convidado";

  const roleColor = (lvl: number | null) => {
    if (!lvl) return "var(--white3)";
    if (lvl >= 9) return "#ef4444";
    if (lvl >= 7) return "#f59e0b";
    if (lvl >= 5) return "#3b82f6";
    return "var(--white2)";
  };

  if (!companyId) {
    return (
      <div style={{ padding: 40, color: "var(--white3)", textAlign: "center" }}>
        Você não está associado a uma empresa.
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: "var(--body)", color: "var(--white)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--cond)", fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            Membros da Empresa
          </h1>
          <p style={{ fontSize: 12, color: "var(--white3)", fontFamily: "var(--mono)", marginTop: 4 }}>
            {members.length} membro{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          style={{ background: "var(--amber)", color: "var(--bg)", border: "none", padding: "10px 20px", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
        >
          + Convidar Membro
        </button>
      </div>

      {/* Modal convite */}
      {showInvite && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", padding: 32, width: "100%", maxWidth: 400 }}>
            <h2 style={{ fontFamily: "var(--cond)", fontSize: 18, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>
              Convidar Membro
            </h2>
            <form onSubmit={handleInvite}>
              <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--white2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                E-mail
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
                style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "10px 12px", fontSize: 14, boxSizing: "border-box", marginBottom: 16 }}
                placeholder="membro@empresa.com"
              />
              <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--white2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                Cargo
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                required
                style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "10px 12px", fontSize: 14, boxSizing: "border-box", marginBottom: 20 }}
              >
                <option value="">Selecione o cargo...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={inviting}
                  style={{ flex: 1, background: "var(--amber)", color: "var(--bg)", border: "none", padding: "11px", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", cursor: "pointer" }}
                >
                  {inviting ? "Enviando..." : "Enviar Convite"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  style={{ flex: 1, background: "transparent", color: "var(--white3)", border: "1px solid var(--border)", padding: "11px", fontFamily: "var(--mono)", fontSize: 12, cursor: "pointer" }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div style={{ color: "var(--white3)", textAlign: "center", padding: 40 }}>Carregando...</div>
      ) : (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Membro", "Cargo", "Status", "Ingressou", "Ações"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontFamily: "var(--mono)", fontSize: 10, color: "var(--white3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--border)", opacity: m.status === "blocked" ? 0.5 : 1 }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "var(--white3)", fontFamily: "var(--mono)" }}>{m.email}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <select
                      value={m.role_id || ""}
                      onChange={e => handleChangeRole(m.id, e.target.value)}
                      style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: roleColor(m.hierarchy_level), padding: "4px 8px", fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700, cursor: "pointer" }}
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: `${statusColor(m.status)}22`, color: statusColor(m.status), border: `1px solid ${statusColor(m.status)}44`, padding: "3px 10px", fontSize: 11, fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>
                      {statusLabel(m.status)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--white3)", fontSize: 11, fontFamily: "var(--mono)" }}>
                    {m.joined_at ? new Date(m.joined_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleBlock(m.id, m.status !== "blocked")}
                        style={{ background: "transparent", border: "1px solid var(--border)", color: m.status === "blocked" ? "#22c55e" : "#f59e0b", padding: "4px 10px", fontSize: 11, fontFamily: "var(--mono)", cursor: "pointer" }}
                      >
                        {m.status === "blocked" ? "Ativar" : "Bloquear"}
                      </button>
                      <button
                        onClick={() => handleRemove(m.id, m.name)}
                        style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "4px 10px", fontSize: 11, fontFamily: "var(--mono)", cursor: "pointer" }}
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--white3)" }}>
                    Nenhum membro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MembersPage;
