/**
 * Toast Container Component
 */
import React, { useState, useEffect } from "react";
import { subscribeToToasts, getToasts } from "../../utils/toast";

type LocalToast = ReturnType<typeof getToasts>[number];
import { X } from "lucide-react";

export function ToastContainer() {
  const [toasts, setToasts] = useState(getToasts());

  useEffect(() => {
    return subscribeToToasts(setToasts);
  }, []);

  const bgColor: Record<string, string> = {
    success: "rgba(34,197,94,.12)",
    error: "rgba(239,68,68,.12)",
    info: "rgba(59,130,246,.12)",
    warning: "rgba(249,115,22,.12)",
  };

  const borderColor: Record<string, string> = {
    success: "rgba(34,197,94,.3)",
    error: "rgba(239,68,68,.3)",
    info: "rgba(59,130,246,.3)",
    warning: "rgba(249,115,22,.3)",
  };

  const textColor: Record<string, string> = {
    success: "#22C55E",
    error: "#EF4444",
    info: "#3B82F6",
    warning: "#F97316",
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 400,
      }}
    >
      {toasts.map((t: LocalToast) => (
        <div
          key={t.id}
          style={{
            background: bgColor[t.type],
            border: `1px solid ${borderColor[t.type]}`,
            borderRadius: 4,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--body)",
            fontSize: 14,
            fontWeight: 300,
            color: textColor[t.type],
            animation: "fadeup .3s ease",
          }}
        >
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => {
              // Note: removeToast is internal, handled by toast system
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
