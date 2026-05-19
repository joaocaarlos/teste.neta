/**
 * SettingsPage — user configuration: profile, security, notifications.
 * Inline styles only. TypeScript strict.
 */

import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPatch, apiFetch } from "../../services/api";
import { Input } from "../../components/ui/Input";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "perfil" | "seguranca" | "notificacoes";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

interface NotifPreference {
  type: string;
  label: string;
  enabled: boolean;
}

interface ToastState {
  message: string;
  kind: "success" | "error";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "seguranca", label: "Segurança" },
  { key: "notificacoes", label: "Notificações" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--cond)",
        fontSize: 18,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: ".04em",
        color: "var(--white)",
        margin: "0 0 20px 0",
      }}
    >
      {children}
    </h2>
  );
}

function SaveButton({
  loading,
  label = "Salvar",
}: {
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        padding: "10px 24px",
        background: loading ? "var(--border2)" : "var(--amber)",
        border: "none",
        color: loading ? "var(--white3)" : "var(--bg)",
        fontFamily: "var(--cond)",
        fontWeight: 700,
        fontSize: 13,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "background .15s",
      }}
    >
      {loading ? "Salvando…" : label}
    </button>
  );
}

function InlineToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const isSuccess = toast.kind === "success";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        background: isSuccess ? "var(--green)22" : "var(--red)22",
        border: `1px solid ${isSuccess ? "var(--green)44" : "var(--red)44"}`,
        color: isSuccess ? "var(--green)" : "var(--red)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        marginBottom: 16,
      }}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          padding: "0 0 0 12px",
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── PerfilTab ────────────────────────────────────────────────────────────────

function PerfilTab() {
  const [profile, setProfile] = useState<UserProfile>({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<UserProfile>("/v1/users/me")
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setProfile(res.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      await apiPatch("/v1/users/me", {
        name: profile.name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
      });
      setToast({ message: "Perfil atualizado com sucesso.", kind: "success" });
    } catch {
      setToast({ message: "Erro ao salvar perfil.", kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--white3)",
          padding: "20px 0",
        }}
      >
        Carregando…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionTitle>Perfil</SectionTitle>

      {toast && (
        <InlineToast toast={toast} onDismiss={() => setToast(null)} />
      )}

      <Input
        label="Nome"
        type="text"
        value={profile.name}
        onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
        placeholder="Seu nome completo"
        disabled={saving}
      />

      <Input
        label="E-mail"
        type="email"
        value={profile.email}
        readOnly
        disabled
        hint="O e-mail não pode ser alterado."
        style={{ opacity: 0.6 }}
      />

      <Input
        label="Telefone"
        type="tel"
        value={profile.phone ?? ""}
        onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
        placeholder="+55 11 9 9999-9999"
        disabled={saving}
      />

      <Input
        label="URL do Avatar"
        type="url"
        value={profile.avatar_url ?? ""}
        onChange={(e) => setProfile((p) => ({ ...p, avatar_url: e.target.value }))}
        placeholder="https://…"
        disabled={saving}
      />

      <SaveButton loading={saving} />
    </form>
  );
}

// ─── SegurancaTab ─────────────────────────────────────────────────────────────

function SegurancaTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setToast({ message: "Preencha todos os campos.", kind: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ message: "A nova senha e a confirmação não coincidem.", kind: "error" });
      return;
    }
    if (newPassword.length < 8) {
      setToast({ message: "A nova senha deve ter pelo menos 8 caracteres.", kind: "error" });
      return;
    }

    setSaving(true);
    try {
      await apiPatch("/v1/users/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setToast({ message: "Senha alterada com sucesso.", kind: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar senha.";
      setToast({ message: msg, kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <SectionTitle>Segurança</SectionTitle>

      {toast && (
        <InlineToast toast={toast} onDismiss={() => setToast(null)} />
      )}

      <Input
        label="Senha atual"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="current-password"
        disabled={saving}
      />

      <Input
        label="Nova senha"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        disabled={saving}
        hint="Mínimo 8 caracteres."
      />

      <Input
        label="Confirmar nova senha"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        disabled={saving}
      />

      <SaveButton loading={saving} label="Alterar senha" />
    </form>
  );
}

// ─── NotificacoesTab ──────────────────────────────────────────────────────────

interface RawPreference {
  type: string;
  label?: string;
  enabled?: boolean;
}

function NotificacoesTab() {
  const [prefs, setPrefs] = useState<NotifPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<RawPreference[]>("/v1/notifications/preferences")
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          const normalized: NotifPreference[] = (res.data || []).map((p) => ({
            type: p.type,
            label: p.label ?? p.type,
            enabled: p.enabled ?? false,
          }));
          setPrefs(normalized);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((type: string) => {
    setPrefs((prev) =>
      prev.map((p) => (p.type === type ? { ...p, enabled: !p.enabled } : p))
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      await apiFetch("/api/v1/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify({ preferences: prefs }),
        headers: { "Content-Type": "application/json" },
      });
      setToast({ message: "Preferências salvas com sucesso.", kind: "success" });
    } catch {
      setToast({ message: "Erro ao salvar preferências.", kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--white3)",
          padding: "20px 0",
        }}
      >
        Carregando…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionTitle>Notificações</SectionTitle>

      {toast && (
        <InlineToast toast={toast} onDismiss={() => setToast(null)} />
      )}

      {prefs.length === 0 ? (
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--white3)",
            marginBottom: 20,
          }}
        >
          Nenhuma preferência disponível.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginBottom: 20,
            border: "1px solid var(--border)",
          }}
        >
          {prefs.map((pref, i) => (
            <div
              key={pref.type}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "var(--bg2)",
                borderBottom: i < prefs.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 13,
                  color: "var(--white)",
                }}
              >
                {pref.label}
              </span>
              {/* Toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={pref.enabled}
                onClick={() => toggle(pref.type)}
                style={{
                  position: "relative",
                  width: 42,
                  height: 22,
                  background: pref.enabled ? "var(--amber)" : "var(--border2)",
                  border: "none",
                  borderRadius: 11,
                  cursor: "pointer",
                  transition: "background .2s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: pref.enabled ? 22 : 3,
                    width: 16,
                    height: 16,
                    background: "var(--white)",
                    borderRadius: "50%",
                    transition: "left .2s",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <SaveButton loading={saving} label="Salvar preferências" />
    </form>
  );
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("perfil");

  return (
    <div
      style={{
        padding: "28px 32px",
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "var(--body)",
      }}
    >
      {/* ─── Page header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "var(--cond)",
            fontSize: 28,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            color: "var(--white)",
            margin: 0,
          }}
        >
          Configurações
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--white3)",
            marginTop: 4,
            fontFamily: "var(--mono)",
          }}
        >
          Gerencie seu perfil e preferências
        </p>
      </div>

      {/* ─── Tab bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 28,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === key ? "2px solid var(--amber)" : "2px solid transparent",
              color: activeTab === key ? "var(--amber)" : "var(--white2)",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color .15s, border-color .15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── Tab content ────────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          padding: "28px 28px",
        }}
      >
        {activeTab === "perfil" && <PerfilTab />}
        {activeTab === "seguranca" && <SegurancaTab />}
        {activeTab === "notificacoes" && <NotificacoesTab />}
      </div>
    </div>
  );
}

export default SettingsPage;
