import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, RotateCcw, MousePointer, Link } from "lucide-react";

// ====================================================================
// BUTTON EDITOR - Button configuration component
// Supports text, link, and style variant editing
// ====================================================================

const ButtonEditor = ({
  value = {},
  onChange,
  onSave,
  label,
  showVariant = true,
  disabled = false
}) => {
  const [localValue, setLocalValue] = useState({
    text: value.text || "",
    link: value.link || "",
    variant: value.variant || "primary"
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalValue({
      text: value.text || "",
      link: value.link || "",
      variant: value.variant || "primary"
    });
    setIsDirty(false);
  }, [value]);

  const handleChange = (field, val) => {
    const newValue = { ...localValue, [field]: val };
    setLocalValue(newValue);
    setIsDirty(JSON.stringify(newValue) !== JSON.stringify(value));
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
    setLocalValue({
      text: value.text || "",
      link: value.link || "",
      variant: value.variant || "primary"
    });
    setIsDirty(false);
  };

  const variants = [
    { id: "primary", label: "Primary", className: "bg-[#204ecf] text-white" },
    { id: "secondary", label: "Secondary", className: "border border-[#204ecf] text-[#204ecf]" },
    { id: "outline", label: "Outline", className: "border border-white text-white" },
    { id: "ghost", label: "Ghost", className: "text-slate-300 hover:text-white" }
  ];

  const inputClasses = `w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 
    placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors
    ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className="space-y-3">
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <MousePointer size={14} className="text-slate-500" />
            {label}
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

      {/* Button Text */}
      <input
        type="text"
        value={localValue.text}
        onChange={(e) => handleChange("text", e.target.value)}
        placeholder="Button text..."
        disabled={disabled}
        className={inputClasses}
      />

      {/* Button Link */}
      <div className="relative">
        <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={localValue.link}
          onChange={(e) => handleChange("link", e.target.value)}
          placeholder="/path or https://..."
          disabled={disabled}
          className={`${inputClasses} pl-9`}
        />
      </div>

      {/* Variant Selector */}
      {showVariant && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">Style Variant</label>
          <div className="grid grid-cols-4 gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => handleChange("variant", variant.id)}
                disabled={disabled}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  localValue.variant === variant.id
                    ? `${variant.className} ring-2 ring-[#204ecf] ring-offset-2 ring-offset-[#212631]`
                    : "bg-slate-700/30 text-slate-400 hover:bg-slate-700/50"
                }`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="p-4 bg-[#1b2029] rounded-lg border border-slate-700/50">
        <label className="text-xs font-medium text-slate-500 mb-2 block">Preview</label>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            variants.find(v => v.id === localValue.variant)?.className || variants[0].className
          }`}
        >
          {localValue.text || "Button Text"}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
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
    </div>
  );
};

export default ButtonEditor;
