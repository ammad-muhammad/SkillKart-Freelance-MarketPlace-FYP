import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FileText,
  Layers,
  Image,
  FormInput,
  Settings,
  TrendingUp,
  Edit3,
  Clock,
  ArrowRight
} from "lucide-react";
import { useCMS } from "../context/CMSContext";
import CMSStatsCard from "../components/CMSStatsCard";
import CMSCard from "../components/shared/CMSCard";
import { formatDate } from "../utils/cmsHelpers";

// ====================================================================
// CMS DASHBOARD - Overview page for the CMS
// Shows content statistics and quick actions
// ====================================================================

const CMSDashboard = () => {
  const { getStats, pagesContent } = useCMS();
  const stats = getStats();

  // Stats cards data
  const statsCards = [
    { title: "Total Pages", value: stats.totalPages, icon: FileText, color: "blue" },
    { title: "Total Sections", value: stats.totalSections, icon: Layers, color: "green" },
    { title: "Components", value: stats.totalComponents, icon: Layers, color: "purple" },
    { title: "Media Files", value: stats.totalMedia, icon: Image, color: "cyan" },
    { title: "Form Fields", value: stats.totalForms, icon: FormInput, color: "yellow" }
  ];

  // Quick actions
  const quickActions = [
    { label: "Edit Home Page", path: "/cms/pages/home", icon: Edit3, color: "blue" },
    { label: "Edit About Page", path: "/cms/pages/about", icon: Edit3, color: "green" },
    { label: "Manage Media", path: "/cms/media", icon: Image, color: "purple" },
    { label: "Site Settings", path: "/cms/settings", icon: Settings, color: "yellow" }
  ];

  // Recent pages (sorted by section count for demo)
  const recentPages = Object.values(pagesContent)
    .sort((a, b) => (b.sections?.length || 0) - (a.sections?.length || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-slate-100"
        >
          CMS Dashboard
        </motion.h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage all your website content from one place
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        {statsCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <CMSStatsCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pages Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <CMSCard
            title="Pages Overview"
            subtitle="Your website pages and their sections"
            action={
              <Link
                to="/cms/pages/home"
                className="text-xs text-[#204ecf] hover:text-[#1a3db3] font-medium flex items-center gap-1"
              >
                View All <ArrowRight size={12} />
              </Link>
            }
          >
            <div className="space-y-3">
              {recentPages.map((page, index) => (
                <Link
                  key={page.id}
                  to={`/cms/pages/${page.id}`}
                  className="flex items-center justify-between p-3 bg-[#1b2029] rounded-lg border border-slate-700/50 hover:border-[#204ecf]/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#204ecf]/10 flex items-center justify-center">
                      <FileText size={18} className="text-[#204ecf]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                        {page.name}
                      </h4>
                      <p className="text-xs text-slate-500">{page.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-300">{page.sections?.length || 0}</p>
                      <p className="text-xs text-slate-500">Sections</p>
                    </div>
                    <ArrowRight size={16} className="text-slate-600 group-hover:text-[#204ecf] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </CMSCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CMSCard title="Quick Actions" subtitle="Frequently used actions">
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.path}
                  className="flex items-center gap-3 p-3 bg-[#1b2029] rounded-lg border border-slate-700/50 hover:border-[#204ecf]/30 transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg bg-${action.color}-500/10 flex items-center justify-center`}>
                    <action.icon size={16} className={`text-${action.color}-400`} />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors flex-1">
                    {action.label}
                  </span>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-[#204ecf] transition-colors" />
                </Link>
              ))}
            </div>
          </CMSCard>
        </motion.div>
      </div>

      {/* Activity & Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last Saved */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <CMSCard title="Activity" subtitle="Recent content changes">
            <div className="flex items-center gap-4 p-4 bg-[#1b2029] rounded-lg border border-slate-700/50">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Clock size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Last Saved</p>
                <p className="text-xs text-slate-500">
                  {stats.lastSaved ? formatDate(stats.lastSaved) : "No changes yet"}
                </p>
              </div>
            </div>
          </CMSCard>
        </motion.div>

        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <CMSCard title="Tips" subtitle="Get the most out of your CMS">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-[#204ecf]/5 rounded-lg border border-[#204ecf]/20">
                <TrendingUp size={16} className="text-[#204ecf] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Real-time Updates</p>
                  <p className="text-xs text-slate-400">
                    All changes are instantly reflected on your website without refresh.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                <Layers size={16} className="text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Section Reordering</p>
                  <p className="text-xs text-slate-400">
                    Drag and drop sections to reorder them on any page.
                  </p>
                </div>
              </div>
            </div>
          </CMSCard>
        </motion.div>
      </div>
    </div>
  );
};

export default CMSDashboard;
