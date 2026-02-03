import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  GripVertical, 
  Edit3, 
  Save, 
  X,
  Plus,
  Layout
} from "lucide-react";
import TextEditor from "./TextEditor";
import ImageEditor from "./ImageEditor";
import CMSConfirmDialog from "../shared/CMSConfirmDialog";

// ====================================================================
// SECTION EDITOR - Full section editing component
// Supports editing section title, content, reordering, and deletion
// ====================================================================

const SectionEditor = ({
  section,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  pageId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedContent, setEditedContent] = useState(section.content || {});

  const handleSave = () => {
    onUpdate(section.id, { content: editedContent });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(section.content || {});
    setIsEditing(false);
  };

  const updateField = (field, value) => {
    setEditedContent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Render content fields based on section type
  const renderContentFields = () => {
    const content = isEditing ? editedContent : section.content;
    
    switch (section.type) {
      case "hero":
        return (
          <div className="space-y-4">
            <TextEditor
              label="Headline"
              value={content.headline}
              onChange={(val) => updateField("headline", val)}
              placeholder="Enter headline..."
              disabled={!isEditing}
            />
            <TextEditor
              label="Subheadline"
              value={content.subheadline}
              onChange={(val) => updateField("subheadline", val)}
              placeholder="Enter subheadline..."
              multiline
              rows={2}
              disabled={!isEditing}
            />
            {content.primaryButton && (
              <div className="grid grid-cols-2 gap-4">
                <TextEditor
                  label="Primary Button Text"
                  value={content.primaryButton?.text}
                  onChange={(val) => updateField("primaryButton", { ...content.primaryButton, text: val })}
                  disabled={!isEditing}
                />
                <TextEditor
                  label="Primary Button Link"
                  value={content.primaryButton?.link}
                  onChange={(val) => updateField("primaryButton", { ...content.primaryButton, link: val })}
                  disabled={!isEditing}
                />
              </div>
            )}
            {content.backgroundImage && (
              <ImageEditor
                label="Background Image"
                value={content.backgroundImage}
                onChange={(val) => updateField("backgroundImage", val)}
                disabled={!isEditing}
              />
            )}
          </div>
        );

      case "features":
        return (
          <div className="space-y-4">
            <TextEditor
              label="Section Title"
              value={content.title}
              onChange={(val) => updateField("title", val)}
              disabled={!isEditing}
            />
            <TextEditor
              label="Subtitle"
              value={content.subtitle}
              onChange={(val) => updateField("subtitle", val)}
              multiline
              disabled={!isEditing}
            />
            {content.features && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">Features</label>
                {content.features.map((feature, index) => (
                  <div key={index} className="p-3 bg-[#1b2029] rounded-lg border border-slate-700/50 space-y-2">
                    <TextEditor
                      label={`Feature ${index + 1} Title`}
                      value={feature.title}
                      onChange={(val) => {
                        const newFeatures = [...content.features];
                        newFeatures[index] = { ...feature, title: val };
                        updateField("features", newFeatures);
                      }}
                      disabled={!isEditing}
                    />
                    <TextEditor
                      label="Description"
                      value={feature.description}
                      onChange={(val) => {
                        const newFeatures = [...content.features];
                        newFeatures[index] = { ...feature, description: val };
                        updateField("features", newFeatures);
                      }}
                      multiline
                      rows={2}
                      disabled={!isEditing}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "content-block":
      case "legal-text":
        return (
          <div className="space-y-4">
            <TextEditor
              label="Title"
              value={content.title}
              onChange={(val) => updateField("title", val)}
              disabled={!isEditing}
            />
            <TextEditor
              label="Content"
              value={content.text}
              onChange={(val) => updateField("text", val)}
              multiline
              rows={6}
              disabled={!isEditing}
            />
            {content.image && (
              <ImageEditor
                label="Image"
                value={content.image}
                onChange={(val) => updateField("image", val)}
                disabled={!isEditing}
              />
            )}
          </div>
        );

      case "cta":
        return (
          <div className="space-y-4">
            <TextEditor
              label="Title"
              value={content.title}
              onChange={(val) => updateField("title", val)}
              disabled={!isEditing}
            />
            <TextEditor
              label="Subtitle"
              value={content.subtitle}
              onChange={(val) => updateField("subtitle", val)}
              multiline
              disabled={!isEditing}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextEditor
                label="Button Text"
                value={content.buttonText}
                onChange={(val) => updateField("buttonText", val)}
                disabled={!isEditing}
              />
              <TextEditor
                label="Button Link"
                value={content.buttonLink}
                onChange={(val) => updateField("buttonLink", val)}
                disabled={!isEditing}
              />
            </div>
          </div>
        );

      case "auth-form":
        return (
          <div className="space-y-4">
            <TextEditor
              label="Title"
              value={content.title}
              onChange={(val) => updateField("title", val)}
              disabled={!isEditing}
            />
            <TextEditor
              label="Subtitle"
              value={content.subtitle}
              onChange={(val) => updateField("subtitle", val)}
              disabled={!isEditing}
            />
            <TextEditor
              label="Button Text"
              value={content.buttonText}
              onChange={(val) => updateField("buttonText", val)}
              disabled={!isEditing}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            {Object.entries(content).map(([key, value]) => {
              if (typeof value === "string") {
                return (
                  <TextEditor
                    key={key}
                    label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                    value={value}
                    onChange={(val) => updateField(key, val)}
                    multiline={value.length > 100}
                    disabled={!isEditing}
                  />
                );
              }
              return null;
            })}
          </div>
        );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[#212631] rounded-xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1b2029] border-b border-slate-700/50">
        {/* Drag Handle */}
        <div className="text-slate-600 cursor-grab">
          <GripVertical size={16} />
        </div>

        {/* Section Info */}
        <div className="flex items-center gap-2 flex-1">
          <Layout size={14} className="text-[#204ecf]" />
          <span className="text-sm font-medium text-slate-200">{section.name}</span>
          <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-700/30 rounded">
            {section.type}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Move Up */}
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className={`p-1.5 rounded-md transition-colors ${
              isFirst ? "text-slate-600 cursor-not-allowed" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            <ChevronUp size={16} />
          </button>

          {/* Move Down */}
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className={`p-1.5 rounded-md transition-colors ${
              isLast ? "text-slate-600 cursor-not-allowed" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            <ChevronDown size={16} />
          </button>

          {/* Edit/Save */}
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              >
                <X size={16} />
              </button>
              <button
                onClick={handleSave}
                className="p-1.5 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
              >
                <Save size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setIsEditing(true);
                setIsExpanded(true);
              }}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            >
              <Edit3 size={16} />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={16} />
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          >
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
              <ChevronDown size={16} />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              {renderContentFields()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <CMSConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete(section.id)}
        title="Delete Section"
        message={`Are you sure you want to delete "${section.name}"? This action cannot be undone.`}
      />
    </motion.div>
  );
};

export default SectionEditor;
