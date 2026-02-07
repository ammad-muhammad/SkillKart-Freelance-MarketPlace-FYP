import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams, useLocation } from "react-router-dom";
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

  const location = useLocation();
  const currentPath = location.pathname.split('/').pop();
  
  // Filter logic
  const filteredComponents = Object.entries(componentsContent).filter(([id, component]) => {
      if (currentPath === "components") return true; 
      
      // Match ID directly or category
      if (currentPath === id) return true;
      if (currentPath === "ctas" && id.includes("cta")) return true;
      if (currentPath === "buttons" && id === "buttons") return true; // buttons is plural in ID too
      if (currentPath === "cards" && id === "cards") return true; 

      return false;
  });

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
    
    // Determine editor type based on ID or Type
    const editorType = component.type || componentId;

    // Helper for updating fields
    const updateField = (key, val) => setEditedContent(prev => ({ ...prev, [key]: val }));
    const updateNestedField = (parent, key, val) => setEditedContent(prev => ({ 
      ...prev, 
      [parent]: { ...prev[parent], [key]: val } 
    }));

    if (editorType === "navigation" || componentId === "navbar") {
      return (
          <div className="space-y-4">
            <TextEditor
              label="Logo Text"
              value={content.logo?.text || ""}
              onChange={(val) => updateNestedField("logo", "text", val)}
              disabled={editingComponent !== componentId}
            />
            {content.logo?.tagline !== undefined && (
              <TextEditor
                label="Tagline"
                value={content.logo?.tagline || ""}
                onChange={(val) => updateNestedField("logo", "tagline", val)}
                disabled={editingComponent !== componentId}
              />
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Links</label>
              {(content.links || []).map((link, index) => (
                <div key={index} className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={link.text || link.label || ""}
                    onChange={(e) => {
                      const newLinks = [...(content.links)];
                      newLinks[index] = { ...newLinks[index], [link.text ? 'text' : 'label']: e.target.value };
                      updateField("links", newLinks);
                    }}
                    disabled={editingComponent !== componentId}
                    placeholder="Label"
                    className="bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50"
                  />
                  <input
                    type="text"
                    value={link.href || link.path || ""}
                    onChange={(e) => {
                      const newLinks = [...(content.links)];
                      newLinks[index] = { ...newLinks[index], [link.href ? 'href' : 'path']: e.target.value };
                      updateField("links", newLinks);
                    }}
                    disabled={editingComponent !== componentId}
                    placeholder="URL"
                    className="bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50"
                  />
                </div>
              ))}
            </div>
            
            {content.copyright !== undefined && (
               <TextEditor
                label="Copyright"
                value={content.copyright || ""}
                onChange={(val) => updateField("copyright", val)}
                disabled={editingComponent !== componentId}
              />
            )}
          </div>
        );
    } 
    
    if (editorType === "button" || componentId.startsWith("cta")) {
         return (
          <div className="space-y-4">
            <TextEditor
              label="Button Text"
              value={content.text || content.default?.buttonText || ""}
              onChange={(val) => content.text ? updateField("text", val) : updateNestedField("default", "buttonText", val)}
              disabled={editingComponent !== componentId}
            />
            <TextEditor
              label="Link URL"
              value={content.href || content.default?.buttonLink || ""}
              onChange={(val) => content.href ? updateField("href", val) : updateNestedField("default", "buttonLink", val)}
              disabled={editingComponent !== componentId}
            />
             <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Style Variant</label>
                <select 
                    value={content.variant || content.default?.variant || "primary"}
                    onChange={(e) => content.variant ? updateField("variant", e.target.value) : updateNestedField("default", "variant", e.target.value)}
                    disabled={editingComponent !== componentId}
                    className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#204ecf]/50"
                >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="outline">Outline</option>
                </select>
             </div>
             {content.icon && (
                <TextEditor
                    label="Icon Name"
                    value={content.icon || ""}
                    onChange={(val) => updateField("icon", val)}
                    disabled={editingComponent !== componentId}
                />
             )}
          </div>
        );
    }

    // Default Fallback
    return (
        <div className="space-y-4">
        {Object.entries(content).map(([key, value]) => {
            if (typeof value === "string") {
            return (
                <TextEditor
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={value}
                onChange={(val) => updateField(key, val)}
                disabled={editingComponent !== componentId}
                />
            );
            }
            return null;
        })}
        </div>
    );
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
            {currentPath !== "components" 
                ? `${currentPath.charAt(0).toUpperCase() + currentPath.slice(1)} Manager` 
                : "Components Manager"}
          </motion.h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage reusable UI components across your website
          </p>
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredComponents.map(([id, component], index) => {
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
