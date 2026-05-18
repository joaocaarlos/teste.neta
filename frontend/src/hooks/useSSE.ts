/**
 * useSSE — generic Server-Sent Events hook.
 *
 * Connects to /api/events with the HttpOnly auth cookie, listens for specific event types,
 * and returns the most recent event received. Auto-reconnects on disconnect.
 *
 * @example
 * const event = useSSE<Notification>(["notification.new", "notification.read"]);
 * useEffect(() => { if (event) console.log("New notification:", event); }, [event]);
 */

import { useState, useEffect, useRef, useCallback } from "react";

const SSE_ENDPOINT = "/api/events";
const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export interface SSEEvent<T = unknown> {
  type: string;
  data: T;
  id?: string;
}

export interface UseSSEOptions {
  /** Skip connecting (e.g. user not authenticated). */
  enabled?: boolean;
  /** Base URL override. Defaults to same-origin so HttpOnly cookies are sent. */
  baseUrl?: string;
}

export function useSSE<T = unknown>(
  eventTypes: string[],
  options: UseSSEOptions = {}
): SSEEvent<T> | null {
  const { enabled = true, baseUrl = "" } = options;

  const [lastEvent, setLastEvent] = useState<SSEEvent<T> | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef<number>(RECONNECT_DELAY_MS);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    const url = `${baseUrl}${SSE_ENDPOINT}`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    // Listen for each requested event type
    const handlers: Array<[string, EventListener]> = [];

    for (const type of eventTypes) {
      const handler: EventListener = (e: Event) => {
        const messageEvent = e as MessageEvent<string>;
        try {
          const parsed = JSON.parse(messageEvent.data) as T;
          if (mountedRef.current) {
            setLastEvent({ type, data: parsed, id: messageEvent.lastEventId });
          }
        } catch {
          // non-JSON payload — ignore
        }
      };
      es.addEventListener(type, handler);
      handlers.push([type, handler]);
    }

    // Also listen for unnamed messages
    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(e.data) as SSEEvent<T>;
        if (mountedRef.current) setLastEvent(parsed);
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      // Clean up and schedule reconnect with exponential back-off
      for (const [type, handler] of handlers) {
        es.removeEventListener(type, handler);
      }
      es.close();
      esRef.current = null;

      if (!mountedRef.current) return;

      reconnectTimerRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          MAX_RECONNECT_DELAY_MS
        );
        connect();
      }, reconnectDelayRef.current);
    };

    es.onopen = () => {
      // Reset back-off on successful connection
      reconnectDelayRef.current = RECONNECT_DELAY_MS;
    };
  }, [enabled, baseUrl, eventTypes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  return lastEvent;
}

// ─── Convenience variant that only returns the data payload ──────────────────

export function useSSEData<T = unknown>(
  eventTypes: string[],
  options: UseSSEOptions = {}
): T | null {
  const event = useSSE<T>(eventTypes, options);
  return event?.data ?? null;
}
