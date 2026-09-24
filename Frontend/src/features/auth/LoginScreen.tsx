import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../shared/types";

type LoginScreenProps = {
  onLogin?: (userName: string) => void;
  onRoleChange?: (nextRole: Role) => void;
};

function LoginScreen({ onLogin, onRoleChange }: LoginScreenProps) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setError("Please enter both identifier and password/PIN.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(trimmedIdentifier, password);
      onLogin?.(trimmedIdentifier);
      onRoleChange?.("Admin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-card__brand">
          <img src="/mcl-logo.png" alt="MCL logo" className="login-card__logo" />
        </div>
        <h1>Sign in to MCL-BB</h1>
        <p className="login-subtitle">Ludhiana Municipal Corporation — Complaint Management</p>

        <div className="divider" />

        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span>Username or Phone Number</span>
            <input
              type="text"
              placeholder="e.g. admin or 90410-22742"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              disabled={isSubmitting}
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span>Password or 6-digit PIN</span>
            <input
              type="password"
              placeholder="Password or officer PIN"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            className="primary-button button-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          {error && (
            <div
              style={{
                marginTop: "14px",
                padding: "10px 12px",
                borderRadius: "6px",
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                fontSize: "13px",
                border: "1px solid #fecaca",
                textAlign: "center",
                lineHeight: "1.4",
              }}
            >
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;
