import Modal from '../Modal/Modal';
import Button from '../Button/Button';

/**
 * Shared confirmation dialog built on the accessible Modal.
 * Standardizes the "Are you sure?" pattern across the app using the shared
 * Button component (no more one-off inline button styling).
 *
 * Props:
 *  - open, title, message (string | node)
 *  - confirmLabel / cancelLabel
 *  - danger: red confirm button (default true for destructive actions)
 *  - loading: disables buttons + shows a busy label
 *  - onConfirm / onClose
 */
const ConfirmDialog = ({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}) => (
  <Modal open={open} title={title} onClose={loading ? () => {} : onClose} danger={danger}>
    {typeof message === 'string'
      ? <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-mid)', lineHeight: 1.6 }}>{message}</p>
      : message}
    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
      <Button
        variant={danger ? 'danger' : 'primary'}
        onClick={onConfirm}
        loading={loading}
      >
        {confirmLabel}
      </Button>
      <Button
        variant="ghost"
        onClick={onClose}
        disabled={loading}
      >
        {cancelLabel}
      </Button>
    </div>
  </Modal>
);

export default ConfirmDialog;
