import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

// ====================================================================
// CMS CONFIRM DIALOG - Confirmation dialog for delete operations
// Matches Admin Dashboard confirmation dialog styling
// ====================================================================

const CMSConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger" // danger, warning, info
}) => {
  const variantStyles = {
    danger: {
      icon: Trash2,
      iconBg: "bg-red-500/10",
      iconColor: "text-red-400",
      buttonBg: "bg-red-500 hover:bg-red-600"
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      buttonBg: "bg-amber-500 hover:bg-amber-600"
    },
    info: {
      icon: AlertTriangle,
      iconBg: "bg-[#204ecf]/10",
      iconColor: "text-[#204ecf]",
      buttonBg: "bg-[#204ecf] hover:bg-[#1a3db3]"
    }
  };

  const styles = variantStyles[variant] || variantStyles.danger;
  const IconComponent = styles.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-[#212631] rounded-xl border border-slate-700/50 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={16} />
            </button>

            {/* Content */}
            <div className="p-6 text-center">
              {/* Icon */}
              <div className={`w-14 h-14 mx-auto rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}>
                <IconComponent size={24} className={styles.iconColor} />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>

              {/* Message */}
              <p className="text-sm text-slate-400 mb-6">{message}</p>

              {/* Actions */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-4 py-2 text-sm font-medium text-white ${styles.buttonBg} rounded-lg transition-colors`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CMSConfirmDialog;
