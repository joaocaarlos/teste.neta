import React, { useState, type FormEvent } from "react";
import type { DisputeCreateInput } from "../../types";
import { useOpenDispute } from "./useDisputes";
import { useStore } from "../../store";

interface DisputeFormProps {
  /** Pre-fill the order ID if opening from an order page */
  orderId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DisputeForm: React.FC<DisputeFormProps> = ({
  orderId,
  onSuccess,
  onCancel,
}) => {
  const { mutate: openDispute, loading, error } = useOpenDispute();
  const { toastSuccess, toastError } = useStore();

  const [form, setForm] = useState<DisputeCreateInput>({
    order_id: orderId ?? "",
    reason: "",
  });

  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof DisputeCreateInput, string>>
  >({});

  const validate = (): boolean => {
    const errs: Partial<Record<keyof DisputeCreateInput, string>> = {};
    if (!form.order_id.trim()) errs.order_id = "Informe o ID do pedido.";
    if (form.reason.trim().length < 20)
      errs.reason = "Descreva o motivo com pelo menos 20 caracteres.";
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name as keyof DisputeCreateInput]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof DisputeCreateInput];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await openDispute(form);
      toastSuccess(
        "Disputa aberta!",
        "Nossa equipe entrará em contato em breve."
      );
      onSuccess?.();
    } catch (err) {
      toastError("Erro ao abrir disputa", (err as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-lg font-semibold text-gray-900">Abrir Disputa</h3>

      {/* Order ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          ID do Pedido
          <span className="ml-1 text-red-500">*</span>
        </label>
        <input
          type="text"
          name="order_id"
          value={form.order_id}
          onChange={handleChange}
          disabled={!!orderId}
          placeholder="PD-1234"
          className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        {validationErrors.order_id && (
          <p className="mt-1 text-xs text-red-600">{validationErrors.order_id}</p>
        )}
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Motivo da Disputa
          <span className="ml-1 text-red-500">*</span>
        </label>
        <textarea
          name="reason"
          value={form.reason}
          onChange={handleChange}
          rows={5}
          maxLength={3000}
          placeholder="Descreva detalhadamente o problema: o que aconteceu, quando, quais foram os impactos…"
          className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
        <div className="mt-0.5 flex justify-between text-xs text-gray-400">
          <span>{validationErrors.reason ?? ""}</span>
          <span>{form.reason.length}/3000</span>
        </div>
        {validationErrors.reason && (
          <p className="mt-0.5 text-xs text-red-600">{validationErrors.reason}</p>
        )}
      </div>

      {/* API error */}
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error.message}
        </p>
      )}

      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
        Ao abrir uma disputa, os fundos em custódia ficam retidos até a
        resolução. Nossa equipe analisará o caso em até 3 dias úteis.
      </p>

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
          className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Abrindo..." : "Abrir Disputa"}
        </button>
      </div>
    </form>
  );
};

export default DisputeForm;
