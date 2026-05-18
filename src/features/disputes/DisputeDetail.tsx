import React, { useState, useRef, useEffect, type FormEvent } from "react";
import type { DisputeStatus } from "../../types";
import {
  useDispute,
  useDisputeMessages,
  useSendDisputeMessage,
  useCloseDispute,
} from "./useDisputes";
import { useStore, selectUser } from "../../store";

interface DisputeDetailProps {
  disputeId: string;
  onBack?: () => void;
  onStatusChange?: () => void;
}

const STATUS_STYLES: Record<DisputeStatus, string> = {
  Aberta: "bg-yellow-100 text-yellow-800",
  "Em análise": "bg-blue-100 text-blue-700",
  Resolvida: "bg-green-100 text-green-800",
  Encerrada: "bg-gray-100 text-gray-600",
};

export const DisputeDetail: React.FC<DisputeDetailProps> = ({
  disputeId,
  onBack,
  onStatusChange,
}) => {
  const user = useStore(selectUser);
  const { toastSuccess, toastError } = useStore();
  const { data: dispute, loading: disputeLoading, refetch } = useDispute(disputeId);
  const { data: rawMessages, loading: msgsLoading, refetch: refetchMsgs } =
    useDisputeMessages(disputeId);
  const messages = Array.isArray(rawMessages) ? rawMessages : [];

  const { mutate: sendMsg, loading: sending } = useSendDisputeMessage(disputeId);
  const { mutate: close, loading: closing } = useCloseDispute(disputeId);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    try {
      await sendMsg({ body: draft.trim() });
      setDraft("");
      refetchMsgs();
    } catch (err) {
      toastError("Erro ao enviar mensagem", (err as Error).message);
    }
  };

  const handleClose = async () => {
    if (!window.confirm("Encerrar esta disputa?")) return;
    try {
      await close();
      toastSuccess("Disputa encerrada.", "");
      refetch();
      onStatusChange?.();
    } catch (err) {
      toastError("Erro", (err as Error).message);
    }
  };

  if (disputeLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-600">
        Disputa não encontrada.
      </div>
    );
  }

  const statusClass =
    STATUS_STYLES[dispute.status as DisputeStatus] ?? "bg-gray-100 text-gray-600";
  const canClose = dispute.status !== "Encerrada";

  return (
    <div className="space-y-5">
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Voltar
        </button>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Disputa
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-gray-900">
              {dispute.id}
            </h2>
            <p className="mt-1 text-sm text-gray-500">Pedido: {dispute.order_id}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusClass}`}>
            {dispute.status}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Motivo
          </p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{dispute.reason}</p>
        </div>

        {dispute.resolution && (
          <div className="mt-4 rounded-xl bg-green-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Resolução
            </p>
            <p className="mt-1 text-sm text-green-800 whitespace-pre-wrap">
              {dispute.resolution}
            </p>
          </div>
        )}
      </div>

      {/* Message thread */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Mensagens</h3>
        </div>

        <div
          ref={scrollRef}
          className="h-64 overflow-y-auto space-y-2 px-5 py-4"
        >
          {msgsLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          )}
          {!msgsLoading && messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">
              Nenhuma mensagem ainda.
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                    isOwn
                      ? "rounded-br-sm bg-indigo-600 text-white"
                      : "rounded-bl-sm bg-gray-100 text-gray-900"
                  }`}
                >
                  {!isOwn && msg.sender && (
                    <p className="mb-0.5 text-xs font-semibold text-indigo-600">
                      {msg.sender.name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      isOwn ? "text-indigo-200" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {canClose && (
          <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-100 px-5 py-3">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escreva uma mensagem..."
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {sending ? "..." : "Enviar"}
            </button>
          </form>
        )}
      </div>

      {/* Actions */}
      {canClose && (
        <button
          onClick={handleClose}
          disabled={closing}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {closing ? "Encerrando..." : "Encerrar Disputa"}
        </button>
      )}
    </div>
  );
};

export default DisputeDetail;
