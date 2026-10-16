import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToasts } from '../../../utils/notify';
import ToastItem from './ToastItem';
import './Toast.css';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = subscribeToasts((list) => {
      setToasts(list);
    });
    return unsubscribe;
  }, []);

  if (!mounted || typeof document === 'undefined') return null;
  if (!toasts || toasts.length === 0) return null;

  // Most recent toasts displayed on top.
  // We calculate depth from the end of the array (most recent has depth 0)
  const renderedContent = (
    <div
      className="sk-toast-container"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast, index) => {
        const depth = toasts.length - 1 - index;
        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            depth={depth}
          />
        );
      })}
    </div>
  );

  return createPortal(renderedContent, document.body);
}
