import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Layers,
  Navigation,
  SquareStack,
  MousePointer,
  CreditCard,
  FormInput,
  Sliders,
  Megaphone,
  Save,
  Edit3
} from "lucide-react";
import { useCMS } from "../context/CMSContext";
import CMSCard from "../components/shared/CMSCard";
import TextEditor from "../components/editors/TextEditor";

// ====================================================================
// COMPONENTS MANAGER - Manage reusable UI components
// ====================================================================

const ComponentsManager = () => {
  const { componentsContent, updateComponent } = useCMS();
  const [editingComponent, setEditingComponent] = useState(null);
  const [editedContent, setEditedContent] = useState({});

  const componentIcons = {
    navbar: Navigation,
    footer: SquareStack,
    buttons: MousePointer,
    cards: CreditCard,
    forms: FormInput,
    sliders: Sliders,
    cta: Megaphone
  };

  const handleEdit = (componentId) => {
    setEditingComponent(componentId);
    setEditedContent(componentsContent[componentId]?.content || {});
  };

  const handleSave = () => {
    if (editingComponent) {
      updateComponent(editingComponent, editedContent);
      setEditingComponent(null);
    }
  };

  const handleCancel = () => {
    setEditingComponent(null);
    setEditedContent({});
  };

  const renderComponentEditor = (componentId) => {
    const component = componentsContent[componentId];
    if (!component) return null;

    const content = editingComponent === componentId ? editedContent : component.content;

    switch (componentId) {
      case "navbar":
        return (
          <div className="space-y-4">
            <TextEditor
              label="Logo Text"
              value={content.logo?.text || ""}
              onChange={(val) => setEditedContent({
                ...editedContent,
                logo: { ...editedContent.logo, text: val }
              })}
              disabled={editingComponent !== componentId}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Navigation Links</label>
              {content.links?.map((link, index) => (
                <div key={index} className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const newLinks = [...(editedContent.links || content.links)];
                      newLinks[index] = { ...newLinks[index], label: e.target.value };
                      setEditedContent({ ...editedContent, links: newLinks });
                    }}
                    disabled={editingComponent !== componentId}
                    placeholder="Label"
                    className="bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50"
                  />
                  <input
                    type="text"
                    value={link.path}
                    onChange={(e) => {
                      const newLinks = [...(editedContent.links || content.links)];
                      newLinks[index] = { ...newLinks[index], path: e.target.value };
                      setEditedContent({ ...editedContent, links: newLinks });
                    }}
                    disabled={editingComponent !== componentId}
                    placeholder="Path"
                    className="bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50"
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case "footer":
        return (
          <div className="space-y-4">
            <TextEditor
              label="Logo Text"
              value={content.logo?.text || ""}
              onChange={(val) => setEditedContent({
                ...editedContent,
                logo: { ...editedContent.logo, text: val }
              })}
              disabled={editingComponent !== componentId}
            />
            <TextEditor
              label="Tagline"
              value={content.logo?.tagline || ""}
              onChange={(val) => setEditedContent({
                ...editedContent,
                logo: { ...editedContent.logo, tagline: val }
              })}
              disabled={editingComponent !== componentId}
            />
            <TextEditor
              label="Copyright"
              value={content.copyright || ""}
              onChange={(val) => setEditedContent({ ...editedContent, copyright: val })}
              disabled={editingComponent !== componentId}
            />
          </div>
        );

      case "cta":
        return (
          <div className="space-y-4">
            <TextEditor
              label="Title"
              value={content.default?.title || ""}
              onChange={(val) => setEditedContent({
                ...editedContent,
                default: { ...editedContent.default, title: val }
              })}
              disabled={editingComponent !== componentId}
            />
            <TextEditor
              label="Subtitle"
              value={content.default?.subtitle || ""}
              onChange={(val) => setEditedContent({
                ...editedContent,
                default: { ...editedContent.default, subtitle: val }
              })}
              multiline
              disabled={editingComponent !== componentId}
            />
            <TextEditor
              label="Button Text"
              value={content.default?.buttonText || ""}
              onChange={(val) => setEditedContent({
                ...editedContent,
                default: { ...editedContent.default, buttonText: val }
              })}
              disabled={editingComponent !== componentId}
            />
            <TextEditor
              label="Button Link"
              value={content.default?.buttonLink || ""}
              onChange={(val) => setEditedContent({
                ...editedContent,
                default: { ...editedContent.default, buttonLink: val }
              })}
              disabled={editingComponent !== componentId}
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
                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                    value={value}
                    onChange={(val) => setEditedContent({ ...editedContent, [key]: val })}
                    disabled={editingComponent !== componentId}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/cms"
          className="p-2 rounded-lg bg-[#212631] border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-slate-100"
          >
            Components Manager
          </motion.h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage reusable UI components across your website
          </p>
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(componentsContent).map(([id, component], index) => {
          const IconComponent = componentIcons[id] || Layers;
          const isEditing = editingComponent === id;

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <CMSCard
                title={
                  <div className="flex items-center gap-2">
                    <IconComponent size={16} className="text-[#204ecf]" />
                    {component.name}
                  </div>
                }
                action={
                  isEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-700/30 hover:bg-slate-700/50 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#204ecf] hover:bg-[#1a3db3] rounded-md transition-colors"
                      >
                        <Save size={12} />
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-700/30 hover:bg-slate-700/50 rounded-md transition-colors"
                    >
                      <Edit3 size={12} />
                      Edit
                    </button>
                  )
                }
              >
                {renderComponentEditor(id)}
              </CMSCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ComponentsManager;
