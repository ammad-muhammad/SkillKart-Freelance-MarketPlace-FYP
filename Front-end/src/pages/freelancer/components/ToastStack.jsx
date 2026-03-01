import './ToastStack.css';

const ICONS = { success: '✔', error: '✖', info: 'ℹ', warning: '⚠' };

const ToastStack = ({ toasts }) => (
  <div className="fl-toast-stack">
    {toasts.map((t) => (
      <div key={t.id} className={`fl-toast fl-toast--${t.type}`}>
        <span className="fl-toast__icon">{ICONS[t.type] || '✔'}</span>
        <span className="fl-toast__msg">{t.message}</span>
      </div>
    ))}
  </div>
);

export default ToastStack;
