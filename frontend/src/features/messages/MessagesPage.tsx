/**
 * MessagesPage — full messaging page with two-panel layout.
 * Left: conversation list. Right: message thread + input bar.
 * Inline styles only.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { MessageSquare, Paperclip, Send, Pencil, Trash2, X, Check } from "lucide-react";
import { apiGetList, apiPost, apiFetch } from "../../services/api";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../app/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  name: string;
}

interface Conversation {
  id: string;
  participants?: Participant[];
  demand_id?: string | null;
  order_id?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
  context?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  msg: string;
  attachment_id?: string | null;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
}

// ─── Conversation List ────────────────────────────────────────────────────────

function ConvItem({
  conv,
  selected,
  currentUserId,
  onClick,
}: {
  conv: Conversation;
  selected: boolean;
  currentUserId?: string;
  onClick: () => void;
}) {
  const others = (conv.participants ?? []).filter((p) => p.id !== currentUserId);
  const title = others.map((p) => p.name).join(", ") || conv.context || "Conversa";
  const unread = conv.unread_count ?? 0;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px 14px",
        background: selected ? "var(--amber-dim)" : "transparent",
        border: "none",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => {
        if (!selected)
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg3)";
      }}
      onMouseLeave={(e) => {
        if (!selected)
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "var(--amber-dim2)",
          color: "var(--amber)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--cond)",
          fontWeight: 700,
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        {title.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
          <span
            style={{
              fontFamily: "var(--cond)",
              fontWeight: unread > 0 ? 700 : 600,
              fontSize: 14,
              color: "var(--white)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
          {unread > 0 && (
            <span
              style={{
                background: "var(--amber)",
                color: "var(--bg)",
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                flexShrink: 0,
                fontFamily: "var(--mono)",
              }}
            >
              {unread}
            </span>
          )}
        </div>
        {conv.last_message_preview && (
          <div
            style={{
              fontSize: 12,
              color: "var(--white3)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: 2,
            }}
          >
            {conv.last_message_preview}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 min

function MsgBubble({
  msg,
  isOwn,
  onEdit,
  onDelete,
}: {
  msg: Message;
  isOwn: boolean;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const canEdit =
    isOwn && Date.now() - new Date(msg.created_at).getTime() < EDIT_WINDOW_MS;
  const ts = new Date(msg.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (msg.deleted_at) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: isOwn ? "flex-end" : "flex-start",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--white3)", fontStyle: "italic" }}>
          Mensagem apagada
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isOwn ? "flex-end" : "flex-start",
        marginBottom: 6,
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          maxWidth: "65%",
          padding: "8px 12px",
          background: isOwn ? "var(--amber)" : "var(--bg3)",
          color: isOwn ? "var(--bg)" : "var(--white)",
          borderRadius: isOwn ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          position: "relative",
        }}
      >
        {!isOwn && msg.sender_name && (
          <div
            style={{
              fontSize: 11,
              fontFamily: "var(--cond)",
              fontWeight: 700,
              color: "var(--amber)",
              marginBottom: 2,
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {msg.sender_name}
          </div>
        )}
        <div
          style={{
            fontSize: 14,
            fontFamily: "var(--body)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {msg.msg}
        </div>
        <div
          style={{
            fontSize: 10,
            marginTop: 4,
            textAlign: "right",
            color: isOwn ? "rgba(7,7,8,0.55)" : "var(--white3)",
            fontFamily: "var(--mono)",
          }}
        >
          {ts}
          {msg.edited_at && " · editado"}
        </div>
      </div>

      {/* Action buttons on hover */}
      {isOwn && hovered && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: "calc(65% + 6px)",
            display: "flex",
            gap: 4,
            background: "var(--bg2)",
            border: "1px solid var(--border2)",
            borderRadius: 6,
            padding: "2px 4px",
          }}
        >
          {canEdit && (
            <button
              onClick={() => onEdit(msg.id, msg.msg)}
              title="Editar"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--white3)",
                cursor: "pointer",
                padding: 2,
                display: "flex",
              }}
            >
              <Pencil size={12} />
            </button>
          )}
          <button
            onClick={() => onDelete(msg.id)}
            title="Apagar"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--red)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MessagesPage ─────────────────────────────────────────────────────────────

export function MessagesPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    setConvsLoading(true);
    apiGetList<Conversation>("/v1/messages/conversations")
      .then((data) => {
        setConversations(data);
        if (data.length > 0 && !selectedConv) setSelectedConv(data[0]);
      })
      .finally(() => setConvsLoading(false));
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!selectedConv) return;
    setMsgsLoading(true);
    setMessages([]);
    apiGetList<Message>(
      `/v1/messages/conversations/${selectedConv.id}/messages?limit=50`
    )
      .then(setMessages)
      .finally(() => setMsgsLoading(false));

    // Mark as read
    apiFetch(`/v1/messages/conversations/${selectedConv.id}/read`, {
      method: "POST",
    }).catch(() => undefined);
  }, [selectedConv?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!draft.trim() || sending || !selectedConv) return;
      const text = draft.trim();
      setDraft("");
      setSending(true);
      try {
        const newMsg = await apiPost<Message>(
          `/v1/messages/conversations/${selectedConv.id}/messages`,
          { msg: text }
        );
        if (newMsg) setMessages((prev) => [...prev, newMsg]);
      } catch {
        setDraft(text);
      } finally {
        setSending(false);
      }
    },
    [draft, sending, selectedConv]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  const handleEdit = useCallback(async (id: string) => {
    if (!editDraft.trim()) return;
    try {
      const updated = await apiPost<Message>(`/v1/messages/${id}`, { msg: editDraft });
      if (updated)
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, msg: editDraft, edited_at: new Date().toISOString() } : m))
        );
    } catch {
      // ignore
    } finally {
      setEditingId(null);
      setEditDraft("");
    }
  }, [editDraft]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await apiFetch(`/v1/messages/${id}`, { method: "DELETE" });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m
        )
      );
    } catch {
      // ignore
    }
  }, []);

  const startEdit = useCallback((id: string, text: string) => {
    setEditingId(id);
    setEditDraft(text);
  }, []);

  const others = selectedConv
    ? (selectedConv.participants ?? []).filter((p) => p.id !== user?.id)
    : [];
  const convTitle =
    others.map((p) => p.name).join(", ") ||
    selectedConv?.context ||
    "Conversa";

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 60px)",
        background: "var(--bg)",
        fontFamily: "var(--body)",
      }}
    >
      {/* ── Left panel: conversation list ── */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 14px",
            borderBottom: "1px solid var(--border)",
            fontFamily: "var(--cond)",
            fontSize: 16,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            color: "var(--white)",
          }}
        >
          Mensagens
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {convsLoading ? (
            <div style={{ padding: 16 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 56,
                    background: "var(--bg3)",
                    marginBottom: 6,
                    borderRadius: 4,
                    opacity: 0.6,
                  }}
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={32} />}
              title="Sem conversas"
              message="Inicie uma conversa a partir de um pedido ou demanda."
            />
          ) : (
            conversations.map((c) => (
              <ConvItem
                key={c.id}
                conv={c}
                selected={c.id === selectedConv?.id}
                currentUserId={user?.id}
                onClick={() => setSelectedConv(c)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: messages ── */}
      {!selectedConv ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <EmptyState
            icon={<MessageSquare size={48} />}
            title="Selecione uma conversa"
            message="Escolha uma conversa à esquerda para começar."
          />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg2)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontFamily: "var(--cond)",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--white)",
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              {convTitle}
            </div>
            {selectedConv.demand_id && (
              <div style={{ fontSize: 11, color: "var(--white3)", marginTop: 2 }}>
                Demanda: {selectedConv.demand_id}
              </div>
            )}
            {selectedConv.order_id && (
              <div style={{ fontSize: 11, color: "var(--white3)", marginTop: 2 }}>
                Pedido: {selectedConv.order_id}
              </div>
            )}
          </div>

          {/* Messages list */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 18px",
            }}
          >
            {msgsLoading && (
              <div style={{ textAlign: "center", color: "var(--white3)", fontSize: 13 }}>
                Carregando mensagens…
              </div>
            )}

            {!msgsLoading && messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--white3)",
                  fontSize: 13,
                  marginTop: 40,
                }}
              >
                Nenhuma mensagem. Seja o primeiro a escrever!
              </div>
            )}

            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;

              if (editingId === msg.id) {
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: 6,
                      gap: 6,
                    }}
                  >
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={2}
                      style={{
                        background: "var(--bg3)",
                        border: "1px solid var(--amber)",
                        color: "var(--white)",
                        fontFamily: "var(--body)",
                        fontSize: 14,
                        padding: "6px 10px",
                        resize: "none",
                        flex: 1,
                        maxWidth: "60%",
                      }}
                    />
                    <button
                      onClick={() => handleEdit(msg.id)}
                      title="Salvar"
                      style={{
                        background: "var(--amber)",
                        border: "none",
                        color: "var(--bg)",
                        cursor: "pointer",
                        padding: "4px 8px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditDraft(""); }}
                      title="Cancelar"
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
                      <X size={14} />
                    </button>
                  </div>
                );
              }

              return (
                <MsgBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={isOwn}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>

          {/* Input bar */}
          <form
            onSubmit={handleSend}
            style={{
              display: "flex",
              gap: 8,
              padding: "10px 18px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg2)",
              flexShrink: 0,
              alignItems: "flex-end",
            }}
          >
            <button
              type="button"
              title="Anexar arquivo"
              style={{
                background: "transparent",
                border: "1px solid var(--border2)",
                color: "var(--white3)",
                cursor: "pointer",
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <Paperclip size={16} />
            </button>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Escreva uma mensagem… (Enter para enviar)"
              style={{
                flex: 1,
                resize: "none",
                maxHeight: 120,
                background: "var(--bg3)",
                border: "1px solid var(--border2)",
                color: "var(--white)",
                fontFamily: "var(--body)",
                fontSize: 14,
                padding: "9px 12px",
                outline: "none",
              }}
            />

            <button
              type="submit"
              disabled={sending || !draft.trim()}
              style={{
                background: "var(--amber)",
                border: "none",
                color: "var(--bg)",
                cursor: sending || !draft.trim() ? "not-allowed" : "pointer",
                padding: "9px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--cond)",
                fontWeight: 700,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                opacity: sending || !draft.trim() ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <Send size={14} />
              {sending ? "…" : "Enviar"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
