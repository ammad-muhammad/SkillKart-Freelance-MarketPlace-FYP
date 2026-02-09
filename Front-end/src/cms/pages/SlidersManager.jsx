
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Sliders,
  Sparkles,
  Layers
} from "lucide-react";
import { useCMS } from "../context/CMSContext";
import SectionEditor from "../components/editors/SectionEditor";
import CMSCard from "../components/shared/CMSCard";

// ====================================================================
// SLIDERS MANAGER - Manage Hero, Carousel, and Slider sections
// Aggregates slider-like sections from all pages
// ====================================================================

const SlidersManager = () => {
  const { pages, updateSection } = useCMS();
  const [activeTab, setActiveTab] = useState("all");

  // Collect all slider-like sections from all pages
  const allSliders = Object.values(pages).flatMap(page => 
    (page.sections || [])
      .filter(s => ['hero', 'carousel', 'cardStack', 'scrollingText'].includes(s.type))
      .map(s => ({ ...s, _pageId: page.id, _pageName: page.name }))
  );

  const filteredSliders = activeTab === "all" 
    ? allSliders 
    : allSliders.filter(s => s.type === activeTab);

  // Stats
  const stats = {
    total: allSliders.length,
    hero: allSliders.filter(s => s.type === 'hero').length,
    carousel: allSliders.filter(s => s.type === 'carousel').length,
    other: allSliders.filter(s => !['hero', 'carousel'].includes(s.type)).length
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
              Sliders & Hero Manager
            </motion.h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage hero sections, carousels, and sliders across all pages
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CMSCard noPadding>
            <div className="p-4 text-center cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => setActiveTab("all")}>
            <p className={`text-2xl font-bold ${activeTab === "all" ? "text-[#204ecf]" : "text-slate-100"}`}>{stats.total}</p>
            <p className="text-xs text-slate-500">Total Active</p>
            </div>
        </CMSCard>
        <CMSCard noPadding>
            <div className="p-4 text-center cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => setActiveTab("hero")}>
            <p className={`text-2xl font-bold ${activeTab === "hero" ? "text-[#204ecf]" : "text-slate-100"}`}>{stats.hero}</p>
            <p className="text-xs text-slate-500">Hero Sections</p>
            </div>
        </CMSCard>
        <CMSCard noPadding>
            <div className="p-4 text-center cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => setActiveTab("carousel")}>
            <p className={`text-2xl font-bold ${activeTab === "carousel" ? "text-[#204ecf]" : "text-slate-100"}`}>{stats.carousel}</p>
            <p className="text-xs text-slate-500">Carousels</p>
            </div>
        </CMSCard>
        <CMSCard noPadding>
             <div className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">Live</p>
                <p className="text-xs text-slate-500">System Status</p>
            </div>
        </CMSCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-1">
        {[
            { id: "all", label: "All Items" },
            { id: "hero", label: "Hero Banners" },
            { id: "carousel", label: "Carousels" },
            { id: "cardStack", label: "Card Stacks" },
            { id: "scrollingText", label: "Marquees" },
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                    activeTab === tab.id 
                    ? "text-[#204ecf] border-[#204ecf] bg-[#204ecf]/5" 
                    : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30"
                }`}
            >
                {tab.label}
            </button>
        ))}
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {filteredSliders.length === 0 ? (
          <CMSCard>
            <div className="py-12 text-center">
              <Sliders size={40} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No items found</h3>
              <p className="text-sm text-slate-500">
                No sections of type "{activeTab}" found on any page.
              </p>
            </div>
          </CMSCard>
        ) : (
          <AnimatePresence>
            {filteredSliders.map((section, index) => (
              <motion.div
                key={`${section._pageId}-${section.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                 {/* Page Badge */}
                 <div className="mb-2 flex items-center gap-2">
                    <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 uppercase tracking-wider font-semibold">
                        {section._pageName}
                    </span>
                    <span className="text-slate-600 text-xs">/</span>
                    <span className="text-slate-500 text-xs">{section.name}</span>
                 </div>
                 
                 <SectionEditor
                    section={section}
                    pageId={section._pageId}
                    onUpdate={(sectionId, updates) => updateSection(section._pageId, sectionId, updates)}
                    // Disable delete/move/create from this aggregated view to avoid confusion
                    onDelete={() => alert("Please go to the specific Page Editor to delete sections.")}
                 />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default SlidersManager;
