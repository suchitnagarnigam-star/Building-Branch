import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../shared/components/Icon";
import type { Role } from "../../shared/types";

type LoginScreenProps = {
  onLogin?: (userName: string) => void;
  onRoleChange?: (nextRole: Role) => void;
};

function LoginScreen({ onLogin, onRoleChange }: LoginScreenProps) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setError("Please enter both identifier and PIN.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(trimmedIdentifier, password);
      onLogin?.(trimmedIdentifier);
      onRoleChange?.("Admin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please verify credentials.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* Header Branding */}
        <div className="login-card__brand">
          <img src="/mcl-logo.png" alt="MCL Emblem" className="login-card__logo" />
        </div>

        <div className="login-brand-titles">
          <div className="login-gov-header">MUNICIPAL CORPORATION LUDHIANA</div>
          <h1 className="login-branch-title">Building Branch</h1>
          <p className="login-branch-subtitle">Building Permission & Enforcement Operations</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field-wrap">
            <span className="login-field-icon">
              <Icon name="user" />
            </span>
            <input
              type="text"
              className="login-input"
              placeholder="Username / Employee ID"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              disabled={isSubmitting}
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field-wrap">
            <span className="login-field-icon">
              <Icon name="lock" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              className="login-input login-input--password"
              placeholder="PIN"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide PIN" : "Show PIN"}
            >
              <Icon name={showPassword ? "eye-off" : "eye"} />
            </button>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>

          <div className="login-forgot-wrap">
            <button
              type="button"
              className="login-forgot-link"
              onClick={() => alert("Please contact your Zonal ATP or Super Admin to reset your PIN.")}
            >
              Forgot PIN?
            </button>
          </div>

          {error && (
            <div className="login-error-badge">
              {error}
            </div>
          )}
        </form>

        {/* Ludhiana Heritage Skyline Footer Art */}
        <div className="login-footer-art">
          <img
            src="/ludhiana-illustration.png"
            alt="Ludhiana Heritage Landmark"
            className="login-footer-art__img"
          />
          <div className="login-footer-tagline">
            <span>Our Ludhiana</span>
            <span>Our Responsibility</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
