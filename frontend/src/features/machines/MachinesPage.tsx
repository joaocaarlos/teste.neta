/**
 * MachinesPage — supplier machine inventory page.
 * Table/card grid of machines with add/edit/delete.
 * Inline styles only.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Check, Wrench } from "lucide-react";
import { apiGetList, apiPost, apiFetch } from "../../services/api";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Machine {
  id: string;
  name: string;
  type: string;
  capacity?: string | null;
  description?: string | null;
  maintenance_until?: string | null;
  created_at?: string;
}

interface MachineFormValues {
  name: string;
  type: string;
  capacity: string;
  description: string;
}

const EMPTY_FORM: MachineFormValues = {
  name: "",
  type: "",
  capacity: "",
  description: "",
};

// ─── MachineForm ─────────────────────────────────────────────────────────────

function MachineForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<MachineFormValues>;
  onSave: (values: MachineFormValues) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [values, setValues] = useState<MachineFormValues>({
    ...EMPTY_FORM,
    ...(initial ?? {}),
  });

  const set = (field: keyof MachineFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim() || !values.type.trim()) return;
    await onSave(values);
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg3)",
    border: "1px solid var(--border2)",
    color: "var(--white)",
    fontFamily: "var(--body)",
    fontSize: 13,
    padding: "8px 10px",
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontFamily: "var(--cond)",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: ".06em",
    color: "var(--white3)",
    marginBottom: 4,
    display: "block",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border2)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontFamily: "var(--cond)",
          fontSize: 14,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "var(--white)",
          marginBottom: 4,
        }}
      >
        {initial ? "Editar Máquina" : "Nova Máquina"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Nome *</label>
          <input
            style={inputStyle}
            value={values.name}
            onChange={set("name")}
            placeholder="Ex: Torno CNC 1"
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Tipo *</label>
          <input
            style={inputStyle}
            value={values.type}
            onChange={set("type")}
            placeholder="Ex: Torno, Fresa, Corte Laser"
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Capacidade</label>
          <input
            style={inputStyle}
            value={values.capacity}
            onChange={set("capacity")}
            placeholder="Ex: 500 kg, ⌀200mm"
          />
        </div>
        <div>
          <label style={labelStyle}>Descrição</label>
          <input
            style={inputStyle}
            value={values.description}
            onChange={set("description")}
            placeholder="Detalhes adicionais"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: "1px solid var(--border2)",
            color: "var(--white)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "8px 16px",
            background: "var(--amber)",
            border: "none",
            color: "var(--bg)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Check size={14} />
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

// ─── MachineCard ──────────────────────────────────────────────────────────────

function MachineCard({
  machine,
  onEdit,
  onDelete,
}: {
  machine: Machine;
  onEdit: (m: Machine) => void;
  onDelete: (m: Machine) => void;
}) {
  const hasMaintenance =
    machine.maintenance_until && new Date(machine.maintenance_until) > new Date();

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--white)",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {machine.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--amber)",
              fontFamily: "var(--mono)",
              marginTop: 2,
            }}
          >
            {machine.type}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(machine)}
            title="Editar"
            style={{
              background: "transparent",
              border: "1px solid var(--border2)",
              color: "var(--white3)",
              cursor: "pointer",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(machine)}
            title="Excluir"
            style={{
              background: "transparent",
              border: "1px solid var(--border2)",
              color: "var(--red)",
              cursor: "pointer",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Details */}
      {machine.capacity && (
        <div style={{ fontSize: 12, color: "var(--white2)", fontFamily: "var(--body)" }}>
          Capacidade: {machine.capacity}
        </div>
      )}

      {machine.description && (
        <div
          style={{
            fontSize: 12,
            color: "var(--white3)",
            fontFamily: "var(--body)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {machine.description}
        </div>
      )}

      {/* Maintenance badge */}
      {hasMaintenance && machine.maintenance_until && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(239,68,68,0.1)",
            color: "var(--red)",
            border: "1px solid rgba(239,68,68,0.25)",
            padding: "3px 8px",
            fontSize: 10,
            fontFamily: "var(--mono)",
            letterSpacing: ".06em",
            alignSelf: "flex-start",
          }}
        >
          <Wrench size={10} />
          Manutenção até{" "}
          {new Date(machine.maintenance_until).toLocaleDateString("pt-BR")}
        </div>
      )}
    </div>
  );
}

// ─── MachinesPage ─────────────────────────────────────────────────────────────

export function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGetList<Machine>("/v1/machines")
      .then(setMachines)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = useCallback(async (values: MachineFormValues) => {
    setSaving(true);
    try {
      const res = await apiFetch("/v1/machines", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          capacity: values.capacity || undefined,
          description: values.description || undefined,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar máquina");
      const created = (await res.json()) as Machine;
      setMachines((prev) => [created, ...prev]);
      setShowForm(false);
    } catch {
      // error handled silently; could toast here
    } finally {
      setSaving(false);
    }
  }, []);

  const handleUpdate = useCallback(
    async (values: MachineFormValues) => {
      if (!editingMachine) return;
      setSaving(true);
      try {
        const res = await apiFetch(`/v1/machines/${editingMachine.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: values.name,
            type: values.type,
            capacity: values.capacity || undefined,
            description: values.description || undefined,
          }),
        });
        if (!res.ok) throw new Error("Erro ao atualizar máquina");
        const updated = (await res.json()) as Machine;
        setMachines((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m))
        );
        setEditingMachine(null);
      } catch {
        // ignore
      } finally {
        setSaving(false);
      }
    },
    [editingMachine]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/v1/machines/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir máquina");
      setMachines((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  return (
    <div
      style={{
        padding: "28px 32px",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "var(--body)",
      }}
    >
      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
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
            Máquinas
          </h1>
          <p style={{ fontSize: 13, color: "var(--white3)", marginTop: 4 }}>
            Gerencie o inventário de máquinas disponíveis
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingMachine(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: "var(--amber)",
            border: "none",
            color: "var(--bg)",
            fontFamily: "var(--cond)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          Adicionar Máquina
        </button>
      </div>

      {/* Inline form */}
      {(showForm || editingMachine) && (
        <MachineForm
          initial={
            editingMachine
              ? {
                  name: editingMachine.name,
                  type: editingMachine.type,
                  capacity: editingMachine.capacity ?? "",
                  description: editingMachine.description ?? "",
                }
              : undefined
          }
          onSave={editingMachine ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingMachine(null);
          }}
          saving={saving}
        />
      )}

      {/* Loading skeleton */}
      {loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 100,
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && machines.length === 0 && (
        <EmptyState
          icon={<Wrench size={40} />}
          title="Nenhuma máquina cadastrada"
          message="Adicione sua primeira máquina usando o botão acima."
          action={{ label: "Adicionar Máquina", onClick: () => setShowForm(true) }}
        />
      )}

      {/* Machine grid */}
      {!loading && machines.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {machines.map((m) => (
            <MachineCard
              key={m.id}
              machine={m}
              onEdit={(machine) => {
                setEditingMachine(machine);
                setShowForm(false);
              }}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="Excluir máquina?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" será removida permanentemente.`
            : ""
        }
        confirmLabel={deleting ? "Excluindo…" : "Sim, excluir"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default MachinesPage;
