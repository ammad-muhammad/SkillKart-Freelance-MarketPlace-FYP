import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Save, 
  ArrowLeft, 
  FileText,
  Sparkles,
  Grid,
  ListOrdered,
  Megaphone,
  Users,
  Scale,
  LogIn,
  Layers
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCMS } from "../../context/CMSContext";
import SectionEditor from "../../components/editors/SectionEditor";
import CMSCard from "../../components/shared/CMSCard";
import CMSModal from "../../components/shared/CMSModal";
import { sortByOrder, generateId } from "../../utils/cmsHelpers";

// ====================================================================
// PAGE EDITOR BASE - Reusable page editor component
// Used by all individual page editors
// ====================================================================

const PageEditorBase = ({ pageId, pageName, pageSlug }) => {
  const { getPage, updateSection, deleteSection, createSection, reorderSections } = useCMS();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSectionType, setNewSectionType] = useState("content-block");
  const [newSectionName, setNewSectionName] = useState("");

  const page = getPage(pageId);
  const sections = sortByOrder(page?.sections || []);

  // Section types available
  const sectionTypes = [
    { id: "hero", name: "Hero Section", icon: Sparkles, description: "Full-width banner with headline and CTA" },
    { id: "features", name: "Features Grid", icon: Grid, description: "Grid of feature cards with icons" },
    { id: "steps", name: "Steps/Process", icon: ListOrdered, description: "Numbered step-by-step guide" },
    { id: "cta", name: "Call to Action", icon: Megaphone, description: "Action-focused section with button" },
    { id: "content-block", name: "Content Block", icon: FileText, description: "Title with text and optional image" },
    { id: "team", name: "Team Section", icon: Users, description: "Team member cards" },
    { id: "legal-text", name: "Legal Text", icon: Scale, description: "Legal/policy text blocks" },
    { id: "auth-form", name: "Auth Form", icon: LogIn, description: "Login/Register form content" },
    { id: "tab-content", name: "Tab Content", icon: Layers, description: "Tabbed content sections" }
  ];

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newOrder = sections.map(s => s.id);
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderSections(pageId, newOrder);
  };

  const handleMoveDown = (index) => {
    if (index === sections.length - 1) return;
    const newOrder = sections.map(s => s.id);
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderSections(pageId, newOrder);
  };

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    
    const selectedType = sectionTypes.find(t => t.id === newSectionType);
    
    // Default content based on type
    const defaultContent = {
      hero: { headline: "New Headline", subheadline: "Add your subheadline here", backgroundImage: "" },
      features: { title: "Features", subtitle: "Add subtitle", features: [] },
      steps: { title: "Steps", subtitle: "Add subtitle", steps: [] },
      cta: { title: "Call to Action", subtitle: "Add subtitle", buttonText: "Click Here", buttonLink: "/" },
      "content-block": { title: "Title", text: "Add your content here", image: "" },
      team: { title: "Our Team", subtitle: "Meet the team", members: [] },
      "legal-text": { title: "Section Title", text: "Add legal text here" },
      "auth-form": { title: "Form Title", subtitle: "Subtitle", buttonText: "Submit" },
      "tab-content": { tabId: "tab1", tabLabel: "Tab Label", steps: [] }
    };

    createSection(pageId, {
      id: generateId(),
      type: newSectionType,
      name: newSectionName,
      content: defaultContent[newSectionType] || {}
    });

    setShowAddModal(false);
    setNewSectionName("");
    setNewSectionType("content-block");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              {pageName} Page
            </motion.h1>
            <p className="text-slate-500 text-sm mt-0.5">{pageSlug}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#204ecf] hover:bg-[#1a3db3] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Section
          </button>
        </div>
      </div>

      {/* Page Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{sections.length}</p>
            <p className="text-xs text-slate-500">Total Sections</p>
          </div>
        </CMSCard>
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">
              {sections.filter(s => s.type === "hero").length}
            </p>
            <p className="text-xs text-slate-500">Hero Sections</p>
          </div>
        </CMSCard>
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">
              {sections.filter(s => s.type === "cta").length}
            </p>
            <p className="text-xs text-slate-500">CTA Sections</p>
          </div>
        </CMSCard>
        <CMSCard noPadding>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">Active</p>
            <p className="text-xs text-slate-500">Page Status</p>
          </div>
        </CMSCard>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-200">Page Sections</h2>
        
        {sections.length === 0 ? (
          <CMSCard>
            <div className="py-12 text-center">
              <Layers size={40} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No sections yet</h3>
              <p className="text-sm text-slate-500 mb-4">
                Add your first section to start building this page
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#204ecf] hover:bg-[#1a3db3] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add First Section
              </button>
            </div>
          </CMSCard>
        ) : (
          <AnimatePresence>
            {sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                pageId={pageId}
                onUpdate={(sectionId, updates) => updateSection(pageId, sectionId, updates)}
                onDelete={(sectionId) => deleteSection(pageId, sectionId)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                isFirst={index === 0}
                isLast={index === sections.length - 1}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Section Modal */}
      <CMSModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Section"
        subtitle="Choose a section type and give it a name"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSection}
              disabled={!newSectionName.trim()}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                newSectionName.trim()
                  ? "text-white bg-[#204ecf] hover:bg-[#1a3db3]"
                  : "text-slate-500 bg-slate-700/30 cursor-not-allowed"
              }`}
            >
              Add Section
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Section Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Section Name</label>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g., Hero Banner, Features Section..."
              className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
            />
          </div>

          {/* Section Type Grid */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Section Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sectionTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setNewSectionType(type.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    newSectionType === type.id
                      ? "bg-[#204ecf]/10 border-[#204ecf]/50"
                      : "bg-[#1b2029] border-slate-700/50 hover:border-slate-600"
                  }`}
                >
                  <type.icon
                    size={20}
                    className={newSectionType === type.id ? "text-[#204ecf]" : "text-slate-500"}
                  />
                  <p className={`text-sm font-medium mt-2 ${
                    newSectionType === type.id ? "text-[#204ecf]" : "text-slate-300"
                  }`}>
                    {type.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </CMSModal>
    </div>
  );
};

export default PageEditorBase;
