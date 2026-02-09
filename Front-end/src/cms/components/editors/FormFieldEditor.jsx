import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, RotateCcw, FormInput, Trash2, Plus, GripVertical } from "lucide-react";

// ====================================================================
// FORM FIELD EDITOR - Form field configuration component
// Supports label, placeholder, type, and required toggle
// ====================================================================

const FormFieldEditor = ({
  field = {},
  onChange,
  onSave,
  onDelete,
  disabled = false,
  showActions = true
}) => {
  const [localValue, setLocalValue] = useState({
    id: field.id || "",
    label: field.label || "",
    placeholder: field.placeholder || "",
    type: field.type || "text",
    required: field.required || false
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalValue({
      id: field.id || "",
      label: field.label || "",
      placeholder: field.placeholder || "",
      type: field.type || "text",
      required: field.required || false
    });
    setIsDirty(false);
  }, [field]);

  const handleChange = (fieldName, val) => {
    const newValue = { ...localValue, [fieldName]: val };
    setLocalValue(newValue);
    setIsDirty(JSON.stringify(newValue) !== JSON.stringify(field));
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
      id: field.id || "",
      label: field.label || "",
      placeholder: field.placeholder || "",
      type: field.type || "text",
      required: field.required || false
    });
    setIsDirty(false);
  };

  const fieldTypes = [
    { id: "text", label: "Text" },
    { id: "email", label: "Email" },
    { id: "tel", label: "Phone" },
    { id: "number", label: "Number" },
    { id: "textarea", label: "Textarea" },
    { id: "select", label: "Dropdown" },
    { id: "checkbox", label: "Checkbox" },
    { id: "date", label: "Date" }
  ];

  const inputClasses = `w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 
    placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors
    ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className="bg-[#1b2029] rounded-lg border border-slate-700/50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-700/50">
        <div className="text-slate-600 cursor-grab">
          <GripVertical size={16} />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <FormInput size={14} className="text-[#204ecf]" />
          <span className="text-sm font-medium text-slate-200">
            {localValue.label || "Untitled Field"}
          </span>
          {localValue.required && (
            <span className="text-xs text-red-400">*Required</span>
          )}
        </div>
        {isDirty && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs text-amber-400"
          >
            Unsaved
          </motion.span>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3">
        {/* Label */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Label</label>
          <input
            type="text"
            value={localValue.label}
            onChange={(e) => handleChange("label", e.target.value)}
            placeholder="Field label..."
            disabled={disabled}
            className={inputClasses}
          />
        </div>

        {/* Placeholder */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Placeholder</label>
          <input
            type="text"
            value={localValue.placeholder}
            onChange={(e) => handleChange("placeholder", e.target.value)}
            placeholder="Placeholder text..."
            disabled={disabled}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Field Type</label>
          <select
            value={localValue.type}
            onChange={(e) => handleChange("type", e.target.value)}
            disabled={disabled}
            className={inputClasses}
          >
            {fieldTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Required Toggle */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-400">Required</label>
          <button
            onClick={() => handleChange("required", !localValue.required)}
            disabled={disabled}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
              localValue.required
                ? "bg-[#204ecf]/20 border-[#204ecf]/50 text-[#204ecf]"
                : "bg-[#1b2029] border-slate-700/50 text-slate-400"
            }`}
          >
            <span className="text-sm">{localValue.required ? "Yes" : "No"}</span>
            <div className={`w-8 h-4 rounded-full transition-colors ${
              localValue.required ? "bg-[#204ecf]" : "bg-slate-600"
            }`}>
              <motion.div
                animate={{ x: localValue.required ? 16 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </div>
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="pt-3 border-t border-slate-700/50">
        <label className="text-xs font-medium text-slate-500 mb-2 block">Preview</label>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">
            {localValue.label || "Label"}
            {localValue.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {localValue.type === "textarea" ? (
            <textarea
              placeholder={localValue.placeholder || "Placeholder..."}
              disabled
              rows={3}
              className={inputClasses}
            />
          ) : (
            <input
              type={localValue.type}
              placeholder={localValue.placeholder || "Placeholder..."}
              disabled
              className={inputClasses}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-end gap-2 pt-2">
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
  );
};

export default FormFieldEditor;
