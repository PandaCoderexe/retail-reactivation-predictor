import type { FormEvent } from "react";
import type { AuthMode } from "../types";

type AuthModalProps = {
  authMode: AuthMode;
  username: string;
  fullName: string;
  password: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAuthModeChange: (mode: AuthMode) => void;
  onUsernameChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export function AuthModal({
  authMode,
  username,
  fullName,
  password,
  busy,
  onClose,
  onSubmit,
  onAuthModeChange,
  onUsernameChange,
  onFullNameChange,
  onPasswordChange,
}: AuthModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="auth-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{authMode === "login" ? "Log in" : "Create account"}</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>

        <label>
          Username
          <input
            autoComplete="off"
            placeholder="Provide username here"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
          />
        </label>

        {authMode === "signup" && (
          <label>
            Full name
            <input
              autoComplete="off"
              placeholder="Provide full name here"
              value={fullName}
              onChange={(event) => onFullNameChange(event.target.value)}
            />
          </label>
        )}

        <label>
          Password
          <input
            autoComplete="new-password"
            type="password"
            placeholder="Provide password here"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>

        <button type="submit" disabled={busy}>
          {busy ? "Please wait..." : authMode === "login" ? "Log in" : "Sign up"}
        </button>

        <button
          className="link-button"
          type="button"
          onClick={() => onAuthModeChange(authMode === "login" ? "signup" : "login")}
        >
          {authMode === "login" ? "Need an account?" : "Already have an account?"}
        </button>
      </form>
    </div>
  );
}
