import Modal from '../../../pages/freelancer/components/Modal';

/**
 * Shared confirmation dialog built on the accessible Modal.
 * Standardizes the "Are you sure?" pattern across the app with self-contained
 * button styling (no dependency on client/freelancer CSS prefixes).
 *
 * Props:
 *  - open, title, message (string | node)
 *  - confirmLabel / cancelLabel
 *  - danger: red confirm button (default true for destructive actions)
 *  - loading: disables buttons + shows a busy label
 *  - onConfirm / onClose
 */
const btnBase = {
  padding: '0.6rem 1.15rem',
  borderRadius: '10px',
  fontWeight: 700,
  fontSize: '0.875rem',
  cursor: 'pointer',
  border: 'none',
};

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
      ? <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-mid, #475569)', lineHeight: 1.6 }}>{message}</p>
      : message}
    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
      <button
        onClick={onConfirm}
        disabled={loading}
        style={{
          ...btnBase,
          background: danger ? '#dc2626' : 'var(--color-primary, #042e4c)',
          color: '#fff',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Working…' : confirmLabel}
      </button>
      <button
        onClick={onClose}
        disabled={loading}
        style={{ ...btnBase, background: '#f1f5f9', color: 'var(--color-text-dark, #1e293b)' }}
      >
        {cancelLabel}
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;
