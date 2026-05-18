import React, { useState, type FormEvent } from "react";
import type { ProposalCreateInput } from "../../types";
import { useCreateProposal } from "./useProposals";
import { useStore } from "../../store";

interface ProposalFormProps {
  demandId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ProposalForm: React.FC<ProposalFormProps> = ({
  demandId,
  onSuccess,
  onCancel,
}) => {
  const { mutate: createProposal, loading, error } = useCreateProposal();
  const { toastSuccess, toastError } = useStore();

  const [form, setForm] = useState<Omit<ProposalCreateInput, "demand_id">>({
    price: 0,
    lead_time_days: 30,
    notes: "",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.price || form.price <= 0) errs.price = "Informe um valor válido.";
    if (!form.lead_time_days || form.lead_time_days < 1)
      errs.lead_time_days = "Informe um prazo mínimo de 1 dia.";
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
    // Clear error on change
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createProposal({ ...form, demand_id: demandId });
      toastSuccess("Proposta enviada!", "Sua proposta foi registrada com sucesso.");
      onSuccess?.();
    } catch (err) {
      toastError("Erro ao enviar proposta", (err as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-lg font-semibold text-gray-900">Enviar Proposta</h3>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Valor total (R$)
          <span className="ml-1 text-red-500">*</span>
        </label>
        <input
          type="number"
          name="price"
          value={form.price || ""}
          onChange={handleChange}
          min={0}
          step={0.01}
          placeholder="Ex: 48500.00"
          className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {validationErrors.price && (
          <p className="mt-1 text-xs text-red-600">{validationErrors.price}</p>
        )}
      </div>

      {/* Lead time */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Prazo de entrega (dias)
          <span className="ml-1 text-red-500">*</span>
        </label>
        <input
          type="number"
          name="lead_time_days"
          value={form.lead_time_days}
          onChange={handleChange}
          min={1}
          placeholder="Ex: 30"
          className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {validationErrors.lead_time_days && (
          <p className="mt-1 text-xs text-red-600">
            {validationErrors.lead_time_days}
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Observações (opcional)
        </label>
        <textarea
          name="notes"
          value={form.notes ?? ""}
          onChange={handleChange}
          rows={4}
          maxLength={2000}
          placeholder="Detalhes sobre sua proposta, diferenciais, etc."
          className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
        <p className="mt-0.5 text-right text-xs text-gray-400">
          {(form.notes ?? "").length}/2000
        </p>
      </div>

      {/* API error */}
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error.message}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar Proposta"}
        </button>
      </div>
    </form>
  );
};

export default ProposalForm;
