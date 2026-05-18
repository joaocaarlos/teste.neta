/**
 * Accessible UI primitives — inputs/buttons/dialogs com ARIA correto.
 * Usar como base para forms acessíveis ao invés de <input> direto.
 */
import React from "react";

// ─── FORM FIELD WRAPPER ───────────────────────────────────────────────────

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ id, label, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-field-label">
        {label}
        {required && <span aria-hidden="true" style={{ color: "var(--red)" }}> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`hint-${id}`} className="form-field-hint">{hint}</p>
      )}
      {error && (
        <p id={`error-${id}`} role="alert" className="form-field-error">{error}</p>
      )}
    </div>
  );
}

// ─── ACCESSIBLE INPUT ─────────────────────────────────────────────────────

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ id, label, error, hint, required, ...props }, ref) => (
    <FormField id={id!} label={label} error={error} hint={hint} required={required}>
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `error-${id}` : hint ? `hint-${id}` : undefined}
        {...props}
      />
    </FormField>
  )
);

// ─── ACCESSIBLE TEXTAREA ──────────────────────────────────────────────────

interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  showCounter?: boolean;
}

export const AccessibleTextarea = React.forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({ id, label, error, hint, maxLength, showCounter, onChange, ...props }, ref) => {
    const [count, setCount] = React.useState(0);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCount(e.target.value.length);
      onChange?.(e);
    };

    return (
      <FormField id={id!} label={label} error={error} hint={hint}>
        <textarea
          ref={ref}
          id={id}
          maxLength={maxLength}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={showCounter && maxLength ? `counter-${id}` : undefined}
          {...props}
        />
        {showCounter && maxLength && (
          <p id={`counter-${id}`} className="counter" aria-live="polite" aria-atomic="true">
            {count} / {maxLength} caracteres
          </p>
        )}
      </FormField>
    );
  }
);

// ─── ACCESSIBLE SELECT ────────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

export const AccessibleSelect = React.forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({ id, label, options, error, placeholder, ...props }, ref) => (
    <FormField id={id!} label={label} error={error}>
      <select
        ref={ref}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `error-${id}` : undefined}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  )
);

// ─── ACCESSIBLE BUTTON ────────────────────────────────────────────────────

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ children, loading, icon, disabled, "aria-label": ariaLabel, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{loading ? "Carregando…" : children}</span>
    </button>
  )
);

// ─── ACCESSIBLE DIALOG ────────────────────────────────────────────────────

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isDangerous?: boolean;
}

export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  isDangerous,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "auto";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="dialog-backdrop" onClick={onClose} role="presentation" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`dialog ${isDangerous ? "dialog-danger" : ""}`}
      >
        <div className="dialog-header">
          <h2 id="dialog-title">{title}</h2>
          <button onClick={onClose} className="dialog-close" aria-label="Fechar diálogo">
            ✕
          </button>
        </div>
        <div className="dialog-content">{children}</div>
      </div>
    </>
  );
};

// ─── ACCESSIBLE TABLE ─────────────────────────────────────────────────────

export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface AccessibleTableProps<T> {
  data: T[];
  columns: Column<T>[];
  caption?: string;
  loading?: boolean;
}

export function AccessibleTable<T>({ data, columns, caption, loading }: AccessibleTableProps<T>) {
  return (
    <div className="table-wrapper" role="region" aria-label="Dados da tabela">
      <table className="table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} scope="col">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="loading-cell">Carregando…</td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-cell">Nenhum dado encontrado</td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={String(col.key)}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
