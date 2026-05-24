import { Request, Response } from "express";
import { EventEmitter } from "events";

/**
 * Server-Sent Events (SSE) bus.
 * Permite real-time push para chat, notificações, atualizações de pedido.
 *
 * Uso (no servidor):
 *   sseEmit("user:abc-123", { type: "message", payload: {...} });
 *   sseEmit("role:admin",   { type: "dispute_opened", payload: {...} });
 *
 * Uso (cliente):
 *   const es = new EventSource("/api/events", { withCredentials: true });
 *   es.addEventListener("message", e => {...});
 */

interface SSEEvent {
  type: string;
  payload: unknown;
}

const bus = new EventEmitter();
bus.setMaxListeners(1000);

/** Emite um evento para todos os listeners de uma "channel". */
export function sseEmit(channel: string, event: SSEEvent): void {
  bus.emit(channel, event);
}

/** Conecta um cliente a uma ou mais channels via SSE. */
export function sseConnect(req: Request, res: Response, channels: string[]): void {
  // Headers SSE obrigatórios
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // disable nginx buffering
  });
  res.flushHeaders();

  // Helper para enviar evento formatado
  const send = (event: SSEEvent) => {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.payload)}\n\n`);
  };

  // Mensagem inicial p/ confirmar conexão
  send({ type: "connected", payload: { channels, ts: Date.now() } });

  // Listener por channel
  const handlers: Array<{ ch: string; fn: (e: SSEEvent) => void }> = [];
  for (const ch of channels) {
    const fn = (e: SSEEvent) => send(e);
    bus.on(ch, fn);
    handlers.push({ ch, fn });
  }

  // Heartbeat a cada 25s p/ manter conexão viva
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25_000);

  // Cleanup ao desconectar
  req.on("close", () => {
    clearInterval(heartbeat);
    for (const { ch, fn } of handlers) bus.off(ch, fn);
    res.end();
  });
}
