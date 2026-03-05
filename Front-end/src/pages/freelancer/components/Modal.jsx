import './Modal.css';

const Modal = ({ open, title, children, onClose, danger }) => {
  if (!open) return null;
  return (
    <div className="fl-modal-overlay" onClick={onClose}>
      <div className={`fl-modal${danger ? ' fl-modal--danger' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="fl-modal__header">
          <h3 className="fl-modal__title">{title}</h3>
          <button className="fl-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="fl-modal__body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
