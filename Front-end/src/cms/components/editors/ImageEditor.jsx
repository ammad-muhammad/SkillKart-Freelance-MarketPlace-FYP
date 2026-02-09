import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, RotateCcw, Image, Link, Trash2, Eye } from "lucide-react";

// ====================================================================
// IMAGE EDITOR - Image URL editing component with preview
// Supports URL input, preview, alt text, and replace/delete actions
// ====================================================================

const ImageEditor = ({
  value,
  onChange,
  onSave,
  onDelete,
  label,
  placeholder = "/images/example.jpg",
  altText = "",
  onAltTextChange,
  showPreview = true,
  previewSize = "md",
  required = false,
  helperText,
  disabled = false
}) => {
  const [localValue, setLocalValue] = useState(value || "");
  const [localAltText, setLocalAltText] = useState(altText || "");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setLocalValue(value || "");
    setLocalAltText(altText || "");
    setIsDirty(false);
    setImageError(false);
  }, [value, altText]);

  const handleUrlChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setIsDirty(newValue !== value || localAltText !== altText);
    setImageError(false);
    if (onChange) onChange(newValue);
  };

  const handleAltChange = (e) => {
    const newValue = e.target.value;
    setLocalAltText(newValue);
    setIsDirty(localValue !== value || newValue !== altText);
    if (onAltTextChange) onAltTextChange(newValue);
  };

  const handleSave = async () => {
    if (!isDirty || disabled) return;
    setIsSaving(true);
    try {
      if (onSave) await onSave({ url: localValue, alt: localAltText });
      setIsDirty(false);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalValue(value || "");
    setLocalAltText(altText || "");
    setIsDirty(false);
    setImageError(false);
  };

  const previewSizes = {
    sm: "h-20",
    md: "h-32",
    lg: "h-48"
  };

  const inputClasses = `w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 
    placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors
    ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className="space-y-3">
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Image size={14} className="text-slate-500" />
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

      {/* Preview */}
      {showPreview && localValue && (
        <div className="relative group">
          <div className={`${previewSizes[previewSize]} w-full bg-[#1b2029] rounded-lg overflow-hidden border border-slate-700/50`}>
            {!imageError ? (
              <img
                src={localValue}
                alt={localAltText || "Preview"}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Image size={24} className="mx-auto mb-1" />
                  <span className="text-xs">Image not found</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Preview Actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => setShowFullPreview(true)}
              className="p-2 bg-slate-800/80 rounded-lg text-white hover:bg-slate-700 transition-colors"
            >
              <Eye size={16} />
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 bg-red-500/80 rounded-lg text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* URL Input */}
      <div className="relative">
        <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={localValue}
          onChange={handleUrlChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClasses} pl-9`}
        />
      </div>

      {/* Alt Text */}
      <input
        type="text"
        value={localAltText}
        onChange={handleAltChange}
        placeholder="Alt text (for accessibility)"
        disabled={disabled}
        className={inputClasses}
      />

      {/* Footer */}
      <div className="flex items-center justify-between">
        {helperText && (
          <span className="text-xs text-slate-500">{helperText}</span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
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

      {/* Full Preview Modal */}
      {showFullPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullPreview(false)}
        >
          <img
            src={localValue}
            alt={localAltText || "Full preview"}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default ImageEditor;
