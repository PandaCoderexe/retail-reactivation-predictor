import type { Theme, User } from "../types";

type TopBarProps = {
  theme: Theme;
  user: User | null;
  onOpenModels: () => void;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onOpenLogoutConfirm: () => void;
};

export function TopBar({
  theme,
  user,
  onOpenModels,
  onToggleTheme,
  onOpenAuth,
  onOpenLogoutConfirm,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-title">
        <span className="status-dot" />
        <div>
          <h2>Prediction Chat</h2>
          <p>{user ? `Signed in as ${user.fullName}` : "Sign in to send predictions"}</p>
        </div>
      </div>

      <div className="top-actions">
        <button className="model-button" type="button" onClick={onOpenModels}>
          Models
        </button>
        <button
          className="icon-button"
          type="button"
          title={theme === "light" ? "White theme" : "Dark theme"}
          onClick={onToggleTheme}
        >
          {theme === "light" ? "☀" : "☾"}
        </button>
        {user ? (
          <button className="user-button" type="button" onClick={onOpenLogoutConfirm}>
            <span className="avatar">{user.fullName.slice(0, 1).toUpperCase()}</span>
            <span>Me</span>
          </button>
        ) : (
          <button className="user-button" type="button" onClick={onOpenAuth}>
            <span className="avatar">↪</span>
            <span>Log in</span>
          </button>
        )}
      </div>
    </header>
  );
}
