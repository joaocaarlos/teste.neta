/**
 * RegisterPage — standalone registration page for /cadastro and /register routes.
 * Inline styles only. TypeScript strict.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import { UserRole } from "../../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  cnpj: string;
  companyName: string;
  city: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--mono)",
  fontSize: "10px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--white2)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg3)",
  border: "1px solid var(--border)",
  color: "var(--white)",
  fontFamily: "var(--body)",
  fontSize: "16px",
  padding: "10px 14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 0,
};

function FormField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── RegisterPage ─────────────────────────────────────────────────────────────

export function RegisterPage() {
  const { register, loginErr, loginLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
    role: "demandante",
    cnpj: "",
    companyName: "",
    city: "",
  });
  const [validErr, setValidErr] = useState("");

  // Pre-select role from ?role= query param
  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "demandante" || roleParam === "fornecedor") {
      setForm((f) => ({ ...f, role: roleParam as UserRole }));
    }
  }, [searchParams]);

  const upd = <K extends keyof RegisterForm>(k: K, v: RegisterForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidErr("");

    if (!form.name.trim()) { setValidErr("Informe seu nome."); return; }
    if (!form.email.trim()) { setValidErr("Informe o e-mail."); return; }
    if (form.password.length < 8) { setValidErr("Senha deve ter ao menos 8 caracteres."); return; }
    if (!form.cnpj.trim()) { setValidErr("Informe o CNPJ."); return; }
    if (!form.companyName.trim()) { setValidErr("Informe o nome da empresa."); return; }

    const ok = await register(form);
    if (ok) {
      navigate("/dashboard");
    }
  };

  const displayError = validErr || loginErr;

  const roleOptions: Array<{ value: UserRole; label: string; description: string }> = [
    { value: "demandante", label: "Demandante", description: "Quero comprar capacidade" },
    { value: "fornecedor", label: "Fornecedor", description: "Tenho capacidade ociosa" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "40px 16px",
        fontFamily: "var(--body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          padding: "40px 36px",
        }}
      >
        {/* ─── Logo / Title ─────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontFamily: "var(--cond)",
              fontSize: 32,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: "var(--amber)",
              marginBottom: 4,
            }}
          >
            CapaCity
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--white3)",
              textTransform: "uppercase",
              letterSpacing: ".12em",
            }}
          >
            Marketplace Industrial B2B
          </div>
        </div>

        {/* ─── Form title ───────────────────────────────────────────────────── */}
        <div
          style={{
            fontFamily: "var(--cond)",
            fontSize: 20,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            marginBottom: 4,
          }}
        >
          Criar conta
        </div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            color: "var(--white3)",
            letterSpacing: ".08em",
            marginBottom: 20,
          }}
        >
          Cadastre sua empresa para começar
        </div>

        {/* ─── Role selector ────────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {roleOptions.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => upd("role", value)}
              style={{
                padding: "12px 8px",
                border: "1px solid",
                background:
                  form.role === value ? "rgba(232,160,32,.15)" : "transparent",
                borderColor:
                  form.role === value
                    ? "rgba(232,160,32,.5)"
                    : "var(--border)",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color:
                    form.role === value ? "var(--amber)" : "var(--white3)",
                  marginBottom: 4,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 8,
                  color: "var(--white3)",
                }}
              >
                {description}
              </div>
            </button>
          ))}
        </div>

        {/* ─── Form ─────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Seu nome" id="register-name">
            <input
              id="register-name"
              style={inputStyle}
              value={form.name}
              onChange={(e) => upd("name", e.target.value)}
              placeholder="João Silva"
              autoComplete="name"
              disabled={loginLoading}
            />
          </FormField>

          <FormField label="E-mail" id="register-email">
            <input
              id="register-email"
              style={inputStyle}
              type="email"
              value={form.email}
              onChange={(e) => upd("email", e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              disabled={loginLoading}
            />
          </FormField>

          <FormField label="Senha (mín. 8 caracteres)" id="register-password">
            <input
              id="register-password"
              style={inputStyle}
              type="password"
              value={form.password}
              onChange={(e) => upd("password", e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={loginLoading}
            />
          </FormField>

          <FormField label="Nome da empresa" id="register-company-name">
            <input
              id="register-company-name"
              style={inputStyle}
              value={form.companyName}
              onChange={(e) => upd("companyName", e.target.value)}
              placeholder="Minha Empresa Ltda"
              autoComplete="organization"
              disabled={loginLoading}
            />
          </FormField>

          <FormField label="CNPJ" id="register-cnpj">
            <input
              id="register-cnpj"
              style={inputStyle}
              value={form.cnpj}
              onChange={(e) => upd("cnpj", e.target.value)}
              placeholder="00.000.000/0001-00"
              disabled={loginLoading}
            />
          </FormField>

          <FormField label="Cidade (opcional)" id="register-city">
            <input
              id="register-city"
              style={inputStyle}
              value={form.city}
              onChange={(e) => upd("city", e.target.value)}
              placeholder="Recife/PE"
              autoComplete="address-level2"
              disabled={loginLoading}
            />
          </FormField>

          {/* ─── Error ────────────────────────────────────────────────────── */}
          {displayError && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--red)22",
                border: "1px solid var(--red)44",
                color: "var(--red)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                marginBottom: 16,
              }}
            >
              {displayError}
            </div>
          )}

          {/* ─── Submit ───────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={loginLoading}
            style={{
              width: "100%",
              padding: "12px 0",
              background: loginLoading ? "var(--border2)" : "var(--amber)",
              border: "none",
              color: loginLoading ? "var(--white3)" : "var(--bg)",
              fontFamily: "var(--cond)",
              fontWeight: 700,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              cursor: loginLoading ? "not-allowed" : "pointer",
              transition: "background .15s",
              marginTop: 8,
            }}
          >
            {loginLoading ? "Cadastrando…" : "Criar conta →"}
          </button>
        </form>

        {/* ─── Links ────────────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--white3)",
            letterSpacing: ".05em",
          }}
        >
          Já tem conta?{" "}
          <a
            href="/login"
            style={{
              color: "var(--amber)",
              textDecoration: "underline",
              fontFamily: "var(--mono)",
              fontSize: 10,
            }}
          >
            Entrar
          </a>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
