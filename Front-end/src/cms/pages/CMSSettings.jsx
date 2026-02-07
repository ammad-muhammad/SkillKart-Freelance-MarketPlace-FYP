import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Settings,
  Globe,
  Type,
  FileText,
  Search as SearchIcon,
  Save,
  RotateCcw
} from "lucide-react";
import { useCMS } from "../context/CMSContext";
import CMSCard from "../components/shared/CMSCard";
import TextEditor from "../components/editors/TextEditor";

// ====================================================================
// CMS SETTINGS - Global site settings and configuration
// ====================================================================

const CMSSettings = () => {
  const { siteSettings, updateSiteSettings } = useCMS();
  
  // Guard clause to prevent crash if settings aren't loaded
  if (!siteSettings) return null;

  const [editedSettings, setEditedSettings] = useState(siteSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when context updates (e.g. from localStorage)
  useEffect(() => {
    if (siteSettings) setEditedSettings(siteSettings);
  }, [siteSettings]);

  const handleChange = (field, value) => {
    setEditedSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleSeoChange = (field, value) => {
    setEditedSettings(prev => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: value
      }
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      updateSiteSettings(editedSettings);
      setIsDirty(false);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setEditedSettings(siteSettings);
    setIsDirty(false);
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
              Site Settings
            </motion.h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Configure global site settings and SEO
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isDirty && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              Reset
            </motion.button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDirty
                ? "bg-[#204ecf] hover:bg-[#1a3db3] text-white"
                : "bg-slate-700/30 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CMSCard
            title={
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-[#204ecf]" />
                General Settings
              </div>
            }
            subtitle="Basic site information"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Type size={14} className="text-slate-500" />
                  Site Title
                </label>
                <input
                  type="text"
                  value={editedSettings.siteTitle || ""}
                  onChange={(e) => handleChange("siteTitle", e.target.value)}
                  placeholder="SkillKart"
                  className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <FileText size={14} className="text-slate-500" />
                  Tagline
                </label>
                <input
                  type="text"
                  value={editedSettings.tagline || ""}
                  onChange={(e) => handleChange("tagline", e.target.value)}
                  placeholder="Your site tagline"
                  className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <FileText size={14} className="text-slate-500" />
                  Footer Text
                </label>
                <input
                  type="text"
                  value={editedSettings.footerText || ""}
                  onChange={(e) => handleChange("footerText", e.target.value)}
                  placeholder="© 2026 SkillKart. All rights reserved."
                  className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Type size={14} className="text-slate-500" />
                  Global CTA Text
                </label>
                <input
                  type="text"
                  value={editedSettings.globalCTA || ""}
                  onChange={(e) => handleChange("globalCTA", e.target.value)}
                  placeholder="Get Started Today"
                  className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
                />
              </div>
            </div>
          </CMSCard>
        </motion.div>

        {/* SEO Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CMSCard
            title={
              <div className="flex items-center gap-2">
                <SearchIcon size={16} className="text-emerald-400" />
                SEO Settings
              </div>
            }
            subtitle="Search engine optimization"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Default Page Title</label>
                <input
                  type="text"
                  value={editedSettings.seo?.defaultTitle || ""}
                  onChange={(e) => handleSeoChange("defaultTitle", e.target.value)}
                  placeholder="SkillKart - Micro Freelance Platform"
                  className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
                />
                <p className="text-xs text-slate-500">Appears in browser tab and search results</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Meta Description</label>
                <textarea
                  value={editedSettings.seo?.defaultDescription || ""}
                  onChange={(e) => handleSeoChange("defaultDescription", e.target.value)}
                  placeholder="A brief description of your website..."
                  rows={3}
                  className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors resize-none"
                />
                <p className="text-xs text-slate-500">
                  {(editedSettings.seo?.defaultDescription || "").length}/160 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Keywords</label>
                <input
                  type="text"
                  value={Array.isArray(editedSettings.seo?.keywords) 
                    ? editedSettings.seo.keywords.join(", ") 
                    : editedSettings.seo?.keywords || ""}
                  onChange={(e) => handleSeoChange("keywords", e.target.value.split(",").map(k => k.trim()))}
                  placeholder="freelance, pakistan, gigs, micro tasks"
                  className="w-full bg-[#1b2029] border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#204ecf]/50 transition-colors"
                />
                <p className="text-xs text-slate-500">Separate keywords with commas</p>
              </div>
            </div>
          </CMSCard>
        </motion.div>
      </div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <CMSCard
          title="Search Result Preview"
          subtitle="How your site appears in search engines"
        >
          <div className="p-4 bg-white rounded-lg max-w-2xl">
            <p className="text-[#1a0dab] text-lg hover:underline cursor-pointer">
              {editedSettings.seo?.defaultTitle || "SkillKart - Micro Freelance Platform"}
            </p>
            <p className="text-[#006621] text-sm">
              www.skillkart.pk
            </p>
            <p className="text-[#545454] text-sm mt-1">
              {editedSettings.seo?.defaultDescription || "Connect with skilled freelancers and clients on Pakistan's fastest-growing micro-freelance marketplace."}
            </p>
          </div>
        </CMSCard>
      </motion.div>

      {/* Current Settings Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <CMSCard title="Current Configuration" noPadding>
          <div className="divide-y divide-slate-700/50">
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-slate-400">Site Title</span>
              <span className="text-sm font-medium text-slate-200">{editedSettings.siteTitle}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-slate-400">Tagline</span>
              <span className="text-sm font-medium text-slate-200">{editedSettings.tagline}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-slate-400">Global CTA</span>
              <span className="text-sm font-medium text-slate-200">{editedSettings.globalCTA}</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-slate-400">Keywords</span>
              <span className="text-sm font-medium text-slate-200">
                {Array.isArray(editedSettings.seo?.keywords) 
                  ? editedSettings.seo.keywords.length 
                  : (editedSettings.seo?.keywords?.split(",")?.length || 0)} keywords
              </span>
            </div>
          </div>
        </CMSCard>
      </motion.div>
    </div>
  );
};

export default CMSSettings;
