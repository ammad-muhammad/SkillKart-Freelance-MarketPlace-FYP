import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, RotateCcw, Type } from "lucide-react";

// ====================================================================
// TEXT EDITOR - Reusable text editing component
// Supports single line and multiline text editing
// ====================================================================

const TextEditor = ({
  value,
  onChange,
  onSave,
  label,
  placeholder = "Enter text...",
  multiline = false,
  rows = 4,
  maxLength,
  showCharCount = false,
  required = false,
  helperText,
  disabled = false,
  autoSave = false,
  autoSaveDelay = 1000
}) => {
  const [localValue, setLocalValue] = useState(value || "");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalValue(value || "");
    setIsDirty(false);
  }, [value]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !isDirty) return;

    const timer = setTimeout(() => {
      handleSave();
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [localValue, autoSave, isDirty]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (maxLength && newValue.length > maxLength) return;
    setLocalValue(newValue);
    setIsDirty(newValue !== value);
    if (onChange) onChange(newValue);
  };

  const handleSave = async () => {
    if (!isDirty || disabled) return;
    setIsSaving(true);
    try {
      if (onSave) await onSave(localValue);
      setIsDirty(false);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalValue(value || "");
    setIsDirty(false);
  };

  const inputClasses = `w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 
    placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors resize-none
    ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Type size={14} className="text-slate-500" />
            {label}
            {required && <span className="text-red-400">*</span>}
          </label>
          {isDirty && (
            <motion.span
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-amber-400"
            >
              Unsaved changes
            </motion.span>
          )}
        </div>
      )}

      {/* Input */}
      {multiline ? (
        <textarea
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={inputClasses}
        />
      ) : (
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {helperText && (
            <span className="text-xs text-slate-500">{helperText}</span>
          )}
          {showCharCount && (
            <span className="text-xs text-slate-500">
              {localValue.length}{maxLength ? `/${maxLength}` : ""} characters
            </span>
          )}
        </div>

        {/* Actions */}
        {!autoSave && (
          <div className="flex items-center gap-2">
            {isDirty && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-700/30 hover:bg-slate-700/50 rounded-md transition-colors"
              >
                <RotateCcw size={12} />
                Reset
              </motion.button>
            )}
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                ${isDirty
                  ? "text-white bg-[#204ecf] hover:bg-[#1a3db3]"
                  : "text-slate-500 bg-slate-700/30 cursor-not-allowed"
                }`}
            >
              <Save size={12} />
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextEditor;
