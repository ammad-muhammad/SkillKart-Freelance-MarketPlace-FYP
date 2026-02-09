import { motion } from "framer-motion";
import {
  FileText,
  Layers,
  Image,
  FormInput,
  Settings,
  BarChart3,
  PieChart,
  TrendingUp
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell
} from "recharts";
import { useCMS } from "../context/CMSContext";
import CMSStatsCard from "../components/CMSStatsCard";
import CMSCard from "../components/shared/CMSCard";

// ====================================================================
// CONTENT STATS - Detailed statistics page for CMS content
// Shows charts and breakdowns of all content
// ====================================================================

const ContentStats = () => {
  const { pagesContent, componentsContent, mediaLibrary, formFields } = useCMS();

  // Calculate stats
  const pageStats = Object.values(pagesContent).map(page => ({
    name: page.name,
    sections: page.sections?.length || 0
  }));

  const sectionTypeStats = Object.values(pagesContent).reduce((acc, page) => {
    page.sections?.forEach(section => {
      const type = section.type || "unknown";
      acc[type] = (acc[type] || 0) + 1;
    });
    return acc;
  }, {});

  const sectionTypePieData = Object.entries(sectionTypeStats).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ["#204ecf", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

  // Components breakdown
  const componentsList = Object.entries(componentsContent).map(([id, comp]) => ({
    id,
    name: comp.name,
    fieldsCount: Object.keys(comp.content || {}).length
  }));

  // Media usage
  const mediaUsageData = mediaLibrary.reduce((acc, media) => {
    media.usedIn?.forEach(page => {
      acc[page] = (acc[page] || 0) + 1;
    });
    return acc;
  }, {});

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1b2029] border border-slate-700/50 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-xs font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-slate-100"
        >
          Content Statistics
        </motion.h1>
        <p className="text-slate-500 text-sm mt-1">
          Detailed breakdown of your website content
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <CMSStatsCard
            title="Total Pages"
            value={Object.keys(pagesContent).length}
            icon={FileText}
            color="blue"
            trend="up"
            trendValue="+2 this month"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CMSStatsCard
            title="Total Sections"
            value={Object.values(pagesContent).reduce((acc, p) => acc + (p.sections?.length || 0), 0)}
            icon={Layers}
            color="green"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <CMSStatsCard
            title="Media Files"
            value={mediaLibrary.length}
            icon={Image}
            color="purple"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CMSStatsCard
            title="Components"
            value={Object.keys(componentsContent).length}
            icon={Settings}
            color="cyan"
          />
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sections per Page Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <CMSCard title="Sections per Page" subtitle="Number of sections in each page">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pageStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="sections" fill="#204ecf" radius={[4, 4, 0, 0]} name="Sections" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CMSCard>
        </motion.div>

        {/* Section Types Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CMSCard title="Section Types" subtitle="Distribution of section types">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={sectionTypePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "#6b7280" }}
                  >
                    {sectionTypePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CMSCard>
        </motion.div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pages Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <CMSCard title="Pages Breakdown" subtitle="Detailed page information">
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {Object.values(pagesContent).map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-3 bg-[#1b2029] rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-[#204ecf]" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{page.name}</p>
                      <p className="text-xs text-slate-500">{page.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-sm font-bold text-slate-200">{page.sections?.length || 0}</p>
                      <p className="text-xs text-slate-500">Sections</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CMSCard>
        </motion.div>

        {/* Components List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <CMSCard title="Components" subtitle="Reusable components overview">
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
              {componentsList.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between p-3 bg-[#1b2029] rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    <Layers size={16} className="text-emerald-400" />
                    <p className="text-sm font-medium text-slate-200">{comp.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-200">{comp.fieldsCount}</p>
                    <p className="text-xs text-slate-500">Fields</p>
                  </div>
                </div>
              ))}
            </div>
          </CMSCard>
        </motion.div>
      </div>

      {/* Media Usage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <CMSCard title="Media Library" subtitle="All uploaded media files">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mediaLibrary.map((media) => (
              <div
                key={media.id}
                className="aspect-square bg-[#1b2029] rounded-lg border border-slate-700/50 overflow-hidden group relative"
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Image size={24} className="text-slate-600" />
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-xs text-white text-center px-2 truncate">{media.name}</p>
                </div>
              </div>
            ))}
          </div>
        </CMSCard>
      </motion.div>
    </div>
  );
};

export default ContentStats;
