import { useEffect, useRef, useState, useCallback } from "react";

interface UseTypingIndicatorOpts {
  /** ID da conversa atual */
  conversationId: string | null;
  /** Função que dispara POST /api/messages/conversations/:id/typing */
  notifyTyping: (conversationId: string) => Promise<void> | void;
  /** Tempo em ms para considerar "parou de digitar" */
  idleMs?: number;
  /** Tempo em ms entre re-notificações enquanto digitando */
  throttleMs?: number;
}

/**
 * Hook que dispara eventos de "está digitando" com throttle.
 *
 * Uso:
 *   const { onChange, remoteTyping } = useTypingIndicator({...});
 *   <input onChange={(e) => { onChange(); setText(e.target.value); }} />
 *   {remoteTyping && <span>Digitando…</span>}
 */
export function useTypingIndicator(opts: UseTypingIndicatorOpts) {
  const { conversationId, notifyTyping, idleMs = 3000, throttleMs = 2000 } = opts;

  const [remoteTyping, setRemoteTyping] = useState(false);
  const lastFireRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen para eventos SSE de typing remoto
  useEffect(() => {
    if (!conversationId) return;

    const onTyping = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.conversationId === conversationId) {
        setRemoteTyping(true);
        // Auto-clear depois de idleMs
        const t = setTimeout(() => setRemoteTyping(false), idleMs);
        return () => clearTimeout(t);
      }
    };

    window.addEventListener("sse:message.typing", onTyping as EventListener);
    return () => {
      window.removeEventListener("sse:message.typing", onTyping as EventListener);
      setRemoteTyping(false);
    };
  }, [conversationId, idleMs]);

  const onChange = useCallback(() => {
    if (!conversationId) return;

    const now = Date.now();
    if (now - lastFireRef.current >= throttleMs) {
      lastFireRef.current = now;
      void notifyTyping(conversationId);
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      lastFireRef.current = 0;
    }, idleMs);
  }, [conversationId, notifyTyping, idleMs, throttleMs]);

  return { onChange, remoteTyping };
}
