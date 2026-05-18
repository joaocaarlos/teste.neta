import React, { useEffect, useRef, useState, type FormEvent } from "react";
import type { Conversation } from "../../types";
import { useMessages, useOptimisticSend } from "./useMessages";
import { useStore, selectUser } from "../../store";

interface ChatWindowProps {
  conversation: Conversation;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversation }) => {
  const user = useStore(selectUser);
  const { messages, loading } = useMessages(conversation.id);
  const { sendMessage, sending, sendError } = useOptimisticSend(conversation.id);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    const text = draft;
    setDraft("");
    try {
      await sendMessage(text);
    } catch {
      setDraft(text); // Restore on error
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as FormEvent);
    }
  };

  const otherParticipants = conversation.participants?.filter(
    (p) => p.id !== user?.id
  );
  const title =
    otherParticipants?.map((p) => p.name).join(", ") || "Conversa";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {conversation.demand_id && (
          <p className="text-xs text-gray-500">Demanda: {conversation.demand_id}</p>
        )}
        {conversation.order_id && (
          <p className="text-xs text-gray-500">Pedido: {conversation.order_id}</p>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
      >
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`h-12 w-2/3 animate-pulse rounded-2xl bg-gray-100 ${
                  i % 2 === 0 ? "" : "ml-auto"
                }`}
              />
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Nenhuma mensagem. Seja o primeiro a escrever!
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
                className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm lg:max-w-md ${
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

      {/* Send error */}
      {sendError && (
        <p className="px-5 pb-1 text-xs text-red-500">{sendError.message}</p>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3 border-t border-gray-200 px-5 py-4"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Escreva uma mensagem… (Enter para enviar)"
          className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{ maxHeight: "120px" }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex-shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
