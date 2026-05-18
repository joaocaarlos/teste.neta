import React from "react";
import { color, font, fontSize, transition } from "../../styles/tokens";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon, style, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div style={{ marginBottom: 16 }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: "block",
              fontFamily: font.mono,
              fontSize: fontSize.label,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: color.white2,
              marginBottom: 6,
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: "relative" }}>
          {icon && (
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: color.white3,
                display: "flex",
                pointerEvents: "none",
              }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            style={{
              background: color.bg3,
              border: `1px solid ${error ? color.red : color.border}`,
              color: color.white,
              fontFamily: font.body,
              fontSize: fontSize.body,
              padding: icon ? "10px 14px 10px 38px" : "10px 14px",
              outline: "none",
              transition: transition.normal,
              width: "100%",
              borderRadius: 0,
              ...style,
            }}
            {...props}
          />
        </div>
        {error && (
          <p
            style={{
              fontFamily: font.mono,
              fontSize: fontSize.label,
              color: color.red,
              marginTop: 4,
            }}
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p
            style={{
              fontFamily: font.mono,
              fontSize: "9px",
              color: color.white3,
              marginTop: 4,
            }}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
