import { useEffect } from "react";
import { useSSE } from "../../hooks/useSSE";
import { useStore, selectUser } from "../../store";
import type { Notification } from "../../types";

/**
 * Syncs notifications from:
 *   1. The REST API (on mount, via store.fetchNotifications)
 *   2. Server-Sent Events (real-time push)
 *
 * Returns the notification state from the global Zustand store.
 */
export function useNotifications() {
  const user = useStore(selectUser);
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
    pushNotification,
  } = useStore();

  // Fetch on mount / when user changes
  useEffect(() => {
    if (user) {
      void fetchNotifications();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time new notifications via SSE
  const sseEvent = useSSE<Notification>(
    ["notification.new"],
    { enabled: !!user }
  );

  useEffect(() => {
    if (sseEvent?.data) {
      pushNotification(sseEvent.data);
    }
  }, [sseEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
  };
}
