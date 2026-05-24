/**
 * RolesPage — cargos e matriz de permissões da empresa (RBAC).
 */
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../app/AuthContext";
import { apiFetch } from "../../services/api";
import { toast } from "../../utils/toast";

interface Role {
  id: string;
  name: string;
  description: string;
  hierarchy_level: number;
  is_system_role: boolean;
  member_count: number;
}

interface Permission {
  id: string;
  code: string;
  module: string;
  description: string;
  granted: boolean;
}

const MODULE_LABELS: Record<string, string> = {
  empresa: "Empresa", membros: "Membros", cargos: "Cargos",
  demandas: "Demandas", propostas: "Propostas", engenharia: "Engenharia",
  qualidade: "Qualidade", logistica: "Logistica", manutencao: "Manutencao",
  financeiro: "Financeiro", contratos: "Contratos", auditoria: "Auditoria",
};

export function RolesPage() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const loadRoles = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/company/${companyId}/roles`).then(r => r.json());
      setRoles(Array.isArray(data) ? data : []);
    } catch { toast.error("Erro ao carregar cargos."); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const loadPermissions = useCallback(async (roleId: string) => {
    if (!companyId) return;
    try {
      const data = await apiFetch(`/company/${companyId}/roles/${roleId}/permissions`).then(r => r.json());
      setPermissions(Array.isArray(data) ? data : []);
    } catch { toast.error("Erro ao carregar permissoes."); }
  }, [companyId]);

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    loadPermissions(role.id);
  };

  const togglePermission = (code: string) => {
    setPermissions(prev =>
      prev.map(p => p.code === code ? { ...p, granted: !p.granted } : p)
    );
  };

  const handleSavePermissions = async () => {
    if (!companyId || !selectedRole) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/company/${companyId}/roles/${selectedRole.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permissions.map(p => ({ code: p.code, granted: p.granted })) }),
      });
      if (res.ok) toast.success("Permissoes salvas!");
      else { const d = await res.json(); toast.error(d.error || "Erro."); }
    } catch { toast.error("Erro de conexao."); }
    finally { setSaving(false); }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newRoleName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch(`/company/${companyId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName, description: newRoleDesc }),
      });
      if (res.ok) {
        toast.success("Cargo criado!");
        setShowNewRole(false);
        setNewRoleName("");
        setNewRoleDesc("");
        loadRoles();
      } else {
        const d = await res.json();
        toast.error(d.error || "Erro ao criar cargo.");
      }
    } catch { toast.error("Erro de conexao."); }
    finally { setCreating(false); }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!companyId) return;
    if (role.is_system_role) { toast.error("Cargos padrao nao podem ser excluidos."); return; }
    if (!confirm(`Excluir cargo "${role.name}"?`)) return;
    const res = await apiFetch(`/company/${companyId}/roles/${role.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Cargo excluido."); if (selectedRole?.id === role.id) { setSelectedRole(null); setPermissions([]); } loadRoles(); }
    else { const d = await res.json(); toast.error(d.error || "Erro."); }
  };

  // Agrupar permissoes por modulo
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const levelBadge = (lvl: number) => {
    const color = lvl >= 9 ? "#ef4444" : lvl >= 7 ? "#f59e0b" : lvl >= 5 ? "#3b82f6" : "var(--white3)";
    return (
      <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, padding: "2px 8px", fontSize: 10, fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>
        Nivel {lvl}
      </span>
    );
  };

  if (!companyId) {
    return <div style={{ padding: 40, color: "var(--white3)", textAlign: "center" }}>Voce nao esta associado a uma empresa.</div>;
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", fontFamily: "var(--body)", color: "var(--white)" }}>

      {/* Painel esquerdo — lista de cargos */}
      <div style={{ width: 280, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--bg2)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--cond)", fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Cargos
          </span>
          <button
            onClick={() => setShowNewRole(true)}
            style={{ background: "var(--amber)", color: "var(--bg)", border: "none", padding: "5px 12px", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            + Novo
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 20, color: "var(--white3)", fontSize: 12 }}>Carregando...</div>
          ) : roles.map(role => (
            <div
              key={role.id}
              onClick={() => handleSelectRole(role)}
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                background: selectedRole?.id === role.id ? "rgba(217,119,6,0.1)" : "transparent",
                borderLeft: selectedRole?.id === role.id ? "3px solid var(--amber)" : "3px solid transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: selectedRole?.id === role.id ? "var(--amber)" : "var(--white)" }}>
                  {role.name}
                </span>
                {role.is_system_role && (
                  <span style={{ fontSize: 9, color: "var(--white3)", fontFamily: "var(--mono)", background: "var(--bg3)", padding: "2px 6px", letterSpacing: "0.06em" }}>
                    PADRAO
                  </span>
                )}
              </div>
              <div style={{ marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                {levelBadge(role.hierarchy_level)}
                <span style={{ fontSize: 11, color: "var(--white3)" }}>{role.member_count} membro{role.member_count !== 1 ? "s" : ""}</span>
              </div>
              {role.description && (
                <div style={{ fontSize: 11, color: "var(--white3)", marginTop: 4, lineHeight: 1.3 }}>{role.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Painel direito — matriz de permissoes */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {!selectedRole ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--white3)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>[ ]</div>
              <div style={{ fontFamily: "var(--cond)", fontSize: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Selecione um cargo
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>para gerenciar suas permissoes</div>
            </div>
          </div>
        ) : (
          <>
            {/* Header do cargo */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg2)" }}>
              <div>
                <div style={{ fontFamily: "var(--cond)", fontSize: 18, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {selectedRole.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--white3)", marginTop: 2 }}>{selectedRole.description}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {!selectedRole.is_system_role && (
                  <button
                    onClick={() => handleDeleteRole(selectedRole)}
                    style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "7px 14px", fontFamily: "var(--mono)", fontSize: 11, cursor: "pointer" }}
                  >
                    Excluir
                  </button>
                )}
                <button
                  onClick={handleSavePermissions}
                  disabled={saving}
                  style={{ background: "var(--amber)", color: "var(--bg)", border: "none", padding: "7px 20px", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", cursor: "pointer" }}
                >
                  {saving ? "Salvando..." : "Salvar Permissoes"}
                </button>
              </div>
            </div>

            {/* Matriz de permissoes */}
            <div style={{ padding: 24, overflowY: "auto" }}>
              {Object.entries(grouped).map(([module, perms]) => (
                <div key={module} style={{ marginBottom: 24, background: "var(--bg2)", border: "1px solid var(--border)" }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)" }}>
                    {MODULE_LABELS[module] || module}
                  </div>
                  <div style={{ padding: "4px 0" }}>
                    {perms.map(perm => (
                      <label
                        key={perm.code}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "background .1s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <input
                          type="checkbox"
                          checked={perm.granted}
                          onChange={() => togglePermission(perm.code)}
                          style={{ width: 16, height: 16, accentColor: "var(--amber)", cursor: "pointer" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: perm.granted ? "var(--white)" : "var(--white3)" }}>
                            {perm.description}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--white3)", fontFamily: "var(--mono)", marginTop: 2 }}>
                            {perm.code}
                          </div>
                        </div>
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: perm.granted ? "#22c55e" : "var(--border)",
                          flexShrink: 0,
                        }} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal novo cargo */}
      {showNewRole && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", padding: 32, width: "100%", maxWidth: 400 }}>
            <h2 style={{ fontFamily: "var(--cond)", fontSize: 18, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>
              Novo Cargo
            </h2>
            <form onSubmit={handleCreateRole}>
              <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--white2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Nome do Cargo</label>
              <input
                type="text"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value.toUpperCase())}
                required
                maxLength={50}
                style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "10px 12px", fontSize: 14, boxSizing: "border-box", marginBottom: 16, fontFamily: "var(--mono)", letterSpacing: "0.06em" }}
                placeholder="EX: SUPERVISOR"
              />
              <label style={{ display: "block", fontFamily: "var(--mono)", fontSize: 10, color: "var(--white2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Descricao</label>
              <input
                type="text"
                value={newRoleDesc}
                onChange={e => setNewRoleDesc(e.target.value)}
                maxLength={200}
                style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", padding: "10px 12px", fontSize: 14, boxSizing: "border-box", marginBottom: 20 }}
                placeholder="Descricao do cargo..."
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" disabled={creating} style={{ flex: 1, background: "var(--amber)", color: "var(--bg)", border: "none", padding: "11px", fontFamily: "var(--cond)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", cursor: "pointer" }}>
                  {creating ? "Criando..." : "Criar Cargo"}
                </button>
                <button type="button" onClick={() => setShowNewRole(false)} style={{ flex: 1, background: "transparent", color: "var(--white3)", border: "1px solid var(--border)", padding: "11px", fontFamily: "var(--mono)", fontSize: 12, cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RolesPage;
