import { useState } from "react";
import type { Role } from "../../shared/types";

type LoginScreenProps = {
  onLogin: () => void;
  onRoleChange: (nextRole: Role) => void;
};

function LoginScreen({ onLogin, onRoleChange }: LoginScreenProps) {
  const [role, setRole] = useState<Role>("Admin");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRoleChange(role);
    onLogin();
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
            <span>Username</span>
            <input type="text" defaultValue="arjun.mehta" />
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" defaultValue="password123" />
          </label>

          <label className="field">
            <span>Designation</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="Operator">Operator</option>
              <option value="Officer">Officer</option>
              <option value="ATP">ATP</option>
              <option value="MTP">MTP</option>
              <option value="JC">JC</option>
              <option value="C">C</option>
              <option value="Admin">Admin</option>
            </select>
          </label>

          <button type="submit" className="primary-button button-full">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;
