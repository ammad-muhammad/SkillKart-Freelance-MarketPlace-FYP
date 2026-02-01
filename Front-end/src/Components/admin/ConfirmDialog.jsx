import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger" 
}) => {
  const variants = {
    danger: {
      icon: "bg-red-500/20 text-red-400",
      button: "bg-red-500 hover:bg-red-600 text-white",
    },
    warning: {
      icon: "bg-yellow-500/20 text-yellow-400",
      button: "bg-yellow-500 hover:bg-yellow-600 text-black",
    },
    info: {
      icon: "bg-blue-500/20 text-blue-400",
      button: "bg-[#204ecf] hover:bg-blue-600 text-white",
    },
  };

  const style = variants[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#212631] rounded-xl border border-slate-700/50 shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${style.icon}`}>
                    <AlertTriangle size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
                    <p className="text-sm text-slate-400">{message}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${style.button}`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
