import { useId, useRef } from 'react';
import { X } from 'lucide-react';
import useFocusTrap from '../../../hooks/useFocusTrap';
import './Modal.css';

// `size` widens the dialog: 'sm' (default, 480px) | 'md' (640px) | 'lg' (820px).
// Wider sizes also cap height to the viewport and scroll the body on overflow.
const Modal = ({ open, title, children, onClose, danger, size = 'sm' }) => {
  const titleId = useId();
  const modalRef = useRef(null);

  useFocusTrap(modalRef, open, onClose);

  if (!open) return null;
  return (
    <div className="sk-modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className={`sk-modal sk-modal--${size}${danger ? ' sk-modal--danger' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="sk-modal__header">
          <h3 className="sk-modal__title" id={titleId}>{title}</h3>
          <button className="sk-modal__close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="sk-modal__body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
