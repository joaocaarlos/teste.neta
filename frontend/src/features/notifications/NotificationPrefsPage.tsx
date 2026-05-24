/**
 * NotificationPrefsPage — full-page notification preferences settings.
 * Inline styles only. No Tailwind/CSS modules.
 */

import React, { useState, useEffect } from "react";
import { apiFetch } from "../../services/api";
import { toast } from "../../utils/toast";

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? "var(--amber)" : "var(--border)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: "var(--mono)",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: ".12em",
        color: "var(--muted)",
        marginBottom: 10,
      }}>
        {title}
      </div>
      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Channel row ─────────────────────────────────────────────────────────────

function ChannelRow({
  icon,
  label,
  description,
  enabled,
  onChange,
  disabled,
  badge,
}: {
  icon: string;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 18px",
      borderBottom: "1px solid var(--border)",
      opacity: disabled ? 0.6 : 1,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--cond)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            {label}
          </span>
          {badge && (
            <span style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--amber)",
              border: "1px solid var(--amber)",
              padding: "1px 6px",
              borderRadius: 3,
            }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
          {description}
        </div>
      </div>
      <Toggle on={enabled} onChange={disabled ? () => {} : onChange} />
    </div>
  );
}

// ─── Frequency option ─────────────────────────────────────────────────────────

type EmailFrequency = "realtime" | "hourly" | "daily" | "disabled";

const FREQ_OPTIONS: { value: EmailFrequency; icon: string; label: string }[] = [
  { value: "realtime", icon: "⚡", label: "Tempo real" },
  { value: "hourly",   icon: "🕐", label: "Resumo por hora" },
  { value: "daily",    icon: "📅", label: "Resumo diário (às 8h)" },
  { value: "disabled", icon: "🔕", label: "Desativado" },
];

function FrequencyCard({
  option,
  selected,
  onSelect,
}: {
  option: { value: EmailFrequency; icon: string; label: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        flex: 1,
        minWidth: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "14px 8px",
        background: selected ? "rgba(245,158,11,.1)" : "var(--bg)",
        border: selected ? "1px solid var(--amber)" : "1px solid var(--border)",
        borderRadius: 6,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 20 }}>{option.icon}</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: selected ? "var(--amber)" : "var(--text)", textAlign: "center", lineHeight: 1.3 }}>
        {option.label}
      </span>
    </button>
  );
}

// ─── Notification type row ────────────────────────────────────────────────────

interface NotifTypeRow {
  key: string;
  label: string;
  description: string;
}

const NOTIF_GROUPS: { group: string; items: NotifTypeRow[] }[] = [
  {
    group: "Marketplace",
    items: [
      { key: "nova_demanda",    label: "Nova Demanda",    description: "Quando uma nova demanda é publicada no mercado" },
      { key: "nova_proposta",   label: "Nova Proposta",   description: "Quando você recebe uma proposta para sua demanda" },
      { key: "proposta_aceita", label: "Proposta Aceita", description: "Quando sua proposta enviada é aceita" },
    ],
  },
  {
    group: "Pedidos",
    items: [
      { key: "status_pedido",   label: "Status do Pedido",  description: "Atualizações de status nos seus pedidos" },
      { key: "pedido_entregue", label: "Pedido Entregue",   description: "Confirmação de entrega de pedidos" },
      { key: "disputa_aberta",  label: "Disputa Aberta",    description: "Quando uma disputa é aberta em algum pedido" },
    ],
  },
  {
    group: "Contratos",
    items: [
      { key: "contrato_assinar",  label: "Contrato para Assinar", description: "Quando há um contrato aguardando sua assinatura" },
      { key: "contrato_assinado", label: "Contrato Assinado",     description: "Quando um contrato é assinado por todas as partes" },
    ],
  },
  {
    group: "Financeiro",
    items: [
      { key: "pagamento_recebido", label: "Pagamento Recebido",  description: "Confirmação de pagamentos recebidos" },
      { key: "pagamento_liberado", label: "Pagamento Liberado",  description: "Quando fundos são liberados do escrow" },
    ],
  },
  {
    group: "Mensagens",
    items: [
      { key: "nova_mensagem", label: "Nova Mensagem", description: "Quando você recebe uma nova mensagem no chat" },
    ],
  },
];

// ─── State ────────────────────────────────────────────────────────────────────

interface Prefs {
  inapp: boolean;
  email: boolean;
  push: boolean;
  emailFrequency: EmailFrequency;
  types: Record<string, boolean>;
}

const DEFAULT_PREFS: Prefs = {
  inapp: true,
  email: true,
  push: false,
  emailFrequency: "realtime",
  types: Object.fromEntries(
    NOTIF_GROUPS.flatMap((g) => g.items.map((it) => [it.key, true]))
  ),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NotificationPrefsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    apiFetch("/v1/notifications/prefs")
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        if (!json) return;
        const data = json.data ?? json;
        setPrefs((prev) => ({
          inapp: data.inapp ?? prev.inapp,
          email: data.email ?? prev.email,
          push: data.push ?? prev.push,
          emailFrequency: data.emailFrequency ?? data.email_frequency ?? prev.emailFrequency,
          types: { ...prev.types, ...(data.types ?? {}) },
        }));
      })
      .catch(() => {})
      .finally(() => setFetched(true));
  }, []);

  const setChannel = (key: keyof Pick<Prefs, "inapp" | "email" | "push">, val: boolean) => {
    setPrefs((p) => ({ ...p, [key]: val }));
  };

  const setFreq = (freq: EmailFrequency) => {
    setPrefs((p) => ({ ...p, emailFrequency: freq }));
  };

  const setType = (key: string, val: boolean) => {
    setPrefs((p) => ({ ...p, types: { ...p.types, [key]: val } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/v1/notifications/prefs", {
        method: "PATCH",
        body: JSON.stringify({
          inapp: prefs.inapp,
          email: prefs.email,
          push: prefs.push,
          emailFrequency: prefs.emailFrequency,
          types: prefs.types,
        }),
      });
      if (res.ok) {
        toast.success("Preferências salvas com sucesso!");
      } else {
        toast.error("Erro ao salvar preferências.");
      }
    } catch {
      toast.error("Erro ao salvar preferências.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 720, margin: "0 auto", fontFamily: "var(--body)" }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "var(--cond)",
          fontSize: 26,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          color: "var(--text)",
          margin: 0,
        }}>
          Preferências de Notificações
        </h1>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          Gerencie como e quando você recebe notificações da plataforma.
        </div>
      </div>

      {/* Section 1: Canais */}
      <Section title="Canais">
        <ChannelRow
          icon="🔔"
          label="In-App"
          description="Notificações dentro da plataforma"
          enabled={prefs.inapp}
          onChange={(v) => setChannel("inapp", v)}
        />
        <ChannelRow
          icon="📧"
          label="E-mail"
          description="Receba por e-mail"
          enabled={prefs.email}
          onChange={(v) => setChannel("email", v)}
        />
        <div style={{ borderBottom: "none" }}>
          <ChannelRow
            icon="📱"
            label="Push"
            description="Em breve"
            enabled={prefs.push}
            onChange={() => {}}
            disabled
            badge="Em breve"
          />
        </div>
      </Section>

      {/* Section 2: Email frequency */}
      {prefs.email && (
        <Section title="Frequência de E-mail">
          <div style={{ padding: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {FREQ_OPTIONS.map((opt) => (
              <FrequencyCard
                key={opt.value}
                option={opt}
                selected={prefs.emailFrequency === opt.value}
                onSelect={() => setFreq(opt.value)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Section 3: Notification types */}
      {NOTIF_GROUPS.map((group) => (
        <Section key={group.group} title={group.group}>
          {group.items.map((item, idx) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                borderBottom: idx < group.items.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--cond)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                  {item.description}
                </div>
              </div>
              <Toggle
                on={prefs.types[item.key] ?? true}
                onChange={(v) => setType(item.key, v)}
              />
            </div>
          ))}
        </Section>
      ))}

      {/* Save button */}
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !fetched}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 28px",
            background: saving ? "var(--border)" : "var(--amber)",
            border: "none",
            color: saving ? "var(--muted)" : "var(--bg)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: saving ? "not-allowed" : "pointer",
            borderRadius: 4,
            transition: "background 0.2s",
          }}
        >
          {saving && (
            <span style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid var(--muted)",
              borderTopColor: "transparent",
              display: "inline-block",
              animation: "spin 0.7s linear infinite",
            }} />
          )}
          {saving ? "Salvando…" : "Salvar Preferências"}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default NotificationPrefsPage;
