# ADR-003: SSE em vez de WebSocket

**Status:** Aceito  
**Data:** 2025-01

## Contexto

O sistema precisa de notificações em tempo real: nova demanda, nova proposta, status de pedido, mensagens de chat, etc.

## Decisão

Usar **Server-Sent Events (SSE)** em vez de WebSocket.

## Justificativa

| Critério          | SSE                       | WebSocket              |
|-------------------|---------------------------|------------------------|
| Direção           | Servidor → Cliente        | Bidirecional           |
| Protocolo         | HTTP/1.1 padrão           | Upgrade para WS        |
| Reconexão         | Automática pelo browser   | Manual                 |
| Proxy/firewall    | Transparente (HTTP)       | Pode bloquear          |
| Complexidade      | Baixa                     | Média/Alta             |
| Autenticação      | Query param `?token=`     | Header no handshake    |
| Escala horizontal | Difícil (sticky sessions) | Difícil (mesma razão)  |

O caso de uso é principalmente unidirecional (servidor notifica cliente). O cliente "responde" via chamadas REST normais, não via WS.

## Consequências

- Mensagens de chat usam SSE para notificação + REST para envio
- Sem contagem precisa de "quem está online" (não é caso de uso atual)
- Para escala horizontal futura: Redis pub/sub como bus central para os workers Node.js
