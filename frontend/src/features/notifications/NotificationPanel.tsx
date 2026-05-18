import React from "react";
import type { Notification } from "../../types";
import { useNotifications } from "./useNotifications";

interface NotificationPanelProps {
  onClose?: () => void;
}

const TYPE_ICON: Record<string, string> = {
  "proposal.new": "📋",
  "proposal.accepted": "✅",
  "proposal.rejected": "❌",
  "order.status": "📦",
  "contract.ready": "📄",
  "payment.received": "💰",
  "dispute.opened": "⚠️",
  "message.new": "💬",
};

function getIcon(type: string): string {
  return TYPE_ICON[type] ?? "🔔";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <span className="flex-shrink-0 text-xl" aria-hidden>
        {getIcon(notification.type ?? notification.tipo ?? "default")}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${
            notification.read ? "text-gray-600" : "font-semibold text-gray-900"
          }`}
        >
          {notification.title ?? notification.tipo}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
          {notification.body ?? notification.desc}
        </p>
        <p className="mt-1 text-[10px] text-gray-400">
          {notification.created_at ? timeAgo(notification.created_at) : "—"}
        </p>
      </div>
      {!notification.read && (
        <button
          onClick={() => onMarkRead(String(notification.id))}
          title="Marcar como lida"
          className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="4" />
          </svg>
        </button>
      )}
    </div>
  );
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  onClose,
}) => {
  const { notifications, unreadCount, markRead, markAllRead, refetch } =
    useNotifications();

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Notificações
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
              {unreadCount}
            </span>
          )}
        </h4>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-indigo-600 hover:underline"
            >
              Marcar todas
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Fechar"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            Nenhuma notificação.
          </div>
        ) : (
          notifications.slice(0, 30).map((n: import("../../types").Notification) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={markRead}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2 text-center">
        <button
          onClick={refetch}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
};

export default NotificationPanel;
