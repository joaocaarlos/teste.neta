/**
 * FileUpload — reusable drag-and-drop file upload component.
 * Uses apiFetch with FormData for multipart upload.
 * Inline styles only.
 */

import React, { useRef, useState, useCallback } from "react";
import { apiFetch } from "../../services/api";

export interface UploadedFile {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
}

export interface FileUploadProps {
  category?: "doc" | "drawing" | "avatar" | "logo" | "default";
  onSuccess?: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  label?: string;
  disabled?: boolean;
}

type FileStatus = "idle" | "uploading" | "done" | "error";

interface FileEntry {
  file: File;
  status: FileStatus;
  progress: number;
  result?: UploadedFile;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  category = "default",
  onSuccess,
  accept,
  maxFiles = 10,
  label = "Arraste arquivos aqui ou clique para selecionar",
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [entries, setEntries] = useState<FileEntry[]>([]);

  const uploadFile = useCallback(
    async (entry: FileEntry, index: number) => {
      setEntries((prev) =>
        prev.map((e, i) =>
          i === index ? { ...e, status: "uploading", progress: 0 } : e
        )
      );

      const fd = new FormData();
      fd.append("files", entry.file);

      try {
        const res = await apiFetch(`/v1/uploads?category=${category}`, {
          method: "POST",
          body: fd,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(errData.error ?? "Upload failed");
        }

        const data = await res.json() as UploadedFile[] | UploadedFile;
        const uploaded: UploadedFile = Array.isArray(data) ? data[0] : data;

        setEntries((prev) => {
          const updated = prev.map((e, i) =>
            i === index
              ? { ...e, status: "done" as FileStatus, progress: 100, result: uploaded }
              : e
          );
          const done = updated.filter((e) => e.status === "done" && e.result);
          onSuccess?.(done.map((e) => e.result as UploadedFile));
          return updated;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao enviar";
        setEntries((prev) =>
          prev.map((e, i) =>
            i === index ? { ...e, status: "error" as FileStatus, error: msg } : e
          )
        );
      }
    },
    [category, onSuccess]
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).slice(0, maxFiles - entries.length);
      if (arr.length === 0) return;

      const newEntries: FileEntry[] = arr.map((file) => ({
        file,
        status: "idle" as FileStatus,
        progress: 0,
      }));

      setEntries((prev) => {
        const updated = [...prev, ...newEntries];
        newEntries.forEach((entry) => {
          const index = updated.indexOf(entry);
          // upload after state is set
          setTimeout(() => uploadFile(entry, index), 0);
        });
        return updated;
      });
    },
    [entries.length, maxFiles, uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      addFiles(e.dataTransfer.files);
    },
    [addFiles, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const statusColor: Record<FileStatus, string> = {
    idle: "var(--white3)",
    uploading: "var(--amber)",
    done: "var(--green)",
    error: "var(--red)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? "var(--amber)" : "var(--border2)"}`,
          borderRadius: 4,
          padding: "32px 24px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          background: isDragging ? "var(--amber-dim)" : "var(--bg3)",
          transition: "border-color .2s, background .2s",
          userSelect: "none",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div
          style={{
            fontFamily: "var(--cond)",
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            color: "var(--white2)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "var(--white3)",
            fontFamily: "var(--body)",
          }}
        >
          {accept ?? "Qualquer arquivo"} &middot; máx. {maxFiles} arquivo(s)
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={accept}
        disabled={disabled}
        style={{ display: "none" }}
        onChange={handleChange}
      />

      {/* File list */}
      {entries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "var(--bg2)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: "var(--body)",
                    color: "var(--white)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.file.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--mono)",
                    color: statusColor[entry.status],
                    marginTop: 2,
                  }}
                >
                  {entry.status === "uploading" && `Enviando… ${entry.progress}%`}
                  {entry.status === "done" && `✓ ${formatBytes(entry.file.size)}`}
                  {entry.status === "error" && `✗ ${entry.error}`}
                  {entry.status === "idle" && formatBytes(entry.file.size)}
                </div>
              </div>

              <button
                onClick={() => removeEntry(i)}
                aria-label="Remover arquivo"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--white3)",
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: "2px 4px",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
