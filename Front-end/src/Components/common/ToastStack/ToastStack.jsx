import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import './ToastStack.css';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };

const ToastStack = ({ toasts }) => (
  <div className="fl-toast-stack">
    {toasts.map((t) => {
      const Icon = ICONS[t.type] || CheckCircle2;
      return (
        <div key={t.id} className={`fl-toast fl-toast--${t.type}`}>
          <span className="fl-toast__icon"><Icon size={18} /></span>
          <span className="fl-toast__msg">{t.message}</span>
        </div>
      );
    })}
  </div>
);

export default ToastStack;
