import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const Modal = ({ isOpen, onClose, title, children, size = "md", footer }) => {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  if (!isOpen) return null;

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

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`bg-[#212631] rounded-xl border border-slate-700/50 shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-lg font-bold text-slate-100">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-end gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Form Input Component
export const FormInput = ({ label, error, ...props }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
    )}
    <input
      {...props}
      className={`w-full bg-[#1b2029] border ${error ? 'border-red-500' : 'border-slate-700/50'} rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-[#204ecf] focus:ring-1 focus:ring-[#204ecf]/20 outline-none transition-all`}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// Form Select Component
export const FormSelect = ({ label, options, error, ...props }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
    )}
    <select
      {...props}
      className={`w-full bg-[#1b2029] border ${error ? 'border-red-500' : 'border-slate-700/50'} rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:border-[#204ecf] focus:ring-1 focus:ring-[#204ecf]/20 outline-none transition-all cursor-pointer`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// Form Textarea Component
export const FormTextarea = ({ label, error, ...props }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
    )}
    <textarea
      {...props}
      className={`w-full bg-[#1b2029] border ${error ? 'border-red-500' : 'border-slate-700/50'} rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-[#204ecf] focus:ring-1 focus:ring-[#204ecf]/20 outline-none transition-all resize-none`}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// Button Components
export const Button = ({ variant = "primary", size = "md", children, ...props }) => {
  const variants = {
    primary: "bg-[#204ecf] hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
    ghost: "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all ${variants[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
};

export default Modal;
