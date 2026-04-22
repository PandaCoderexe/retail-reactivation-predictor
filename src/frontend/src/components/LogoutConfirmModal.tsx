type LogoutConfirmModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export function LogoutConfirmModal({ onCancel, onConfirm }: LogoutConfirmModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>Are you sure you want to log out?</h2>
        <div className="confirm-actions">
          <button className="clear-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            Log out
          </button>
        </div>
      </section>
    </div>
  );
}
