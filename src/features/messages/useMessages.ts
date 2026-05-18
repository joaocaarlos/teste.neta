import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, type UseQueryOptions } from "../../hooks/useApi";
import { useSSE } from "../../hooks/useSSE";
import { useStore, selectUser } from "../../store";
import type { Conversation, Message, PaginatedResponse } from "../../types";

// ─── Conversations ────────────────────────────────────────────────────────────

export function useConversations(options: UseQueryOptions = {}) {
  const result = useQuery<PaginatedResponse<Conversation> | Conversation[]>(
    "/api/messages/conversations?limit=50",
    options
  );

  const conversations: Conversation[] = Array.isArray(result.data)
    ? result.data
    : (result.data?.data ?? []);

  return { ...result, conversations };
}

export interface CreateConversationInput {
  participant_ids: string[];
  demand_id?: string | null;
  order_id?: string | null;
}

export function useCreateConversation() {
  return useMutation<Conversation, CreateConversationInput>(
    "/api/messages/conversations",
    "POST"
  );
}

// ─── Messages in a conversation ───────────────────────────────────────────────

export function useMessages(conversationId: string | null, options: UseQueryOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);

  const result = useQuery<PaginatedResponse<Message> | Message[]>(
    `/api/messages/conversations/${conversationId}?limit=100`,
    { ...options, enabled: !!conversationId }
  );

  // Sync from API result
  useEffect(() => {
    if (!result.data) return;
    if (Array.isArray(result.data)) {
      setMessages(result.data);
      setTotal(result.data.length);
    } else {
      setMessages(result.data.data);
      setTotal(result.data.meta.total);
    }
  }, [result.data]);

  // Real-time: append new messages via SSE
  const user = useStore(selectUser);
  const sseEvent = useSSE<Message>(["message.new"], {
    enabled: !!conversationId && !!user,
  });

  useEffect(() => {
    if (!sseEvent?.data) return;
    const msg = sseEvent.data;
    if (msg.conversation_id !== conversationId) return;
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    setTotal((t) => t + 1);
  }, [sseEvent, conversationId]);

  return { ...result, messages, total };
}

// ─── Send message ─────────────────────────────────────────────────────────────

export interface SendMessageInput {
  body: string;
  attachment_id?: string | null;
}

export function useSendMessage(conversationId: string) {
  return useMutation<Message, SendMessageInput>(
    `/api/messages/conversations/${conversationId}/messages`,
    "POST"
  );
}

// ─── Optimistic message sender (for ChatWindow) ───────────────────────────────

export function useOptimisticSend(conversationId: string) {
  const { mutate: send, loading, error } = useSendMessage(conversationId);
  const user = useStore(selectUser);

  const sendMessage = useCallback(
    async (body: string): Promise<Message | null> => {
      if (!body.trim()) return null;
      return send({ body: body.trim() });
    },
    [send]
  );

  return { sendMessage, sending: loading, sendError: error };
}
