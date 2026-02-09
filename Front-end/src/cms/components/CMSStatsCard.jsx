import { motion } from "framer-motion";

// ====================================================================
// CMS STATS CARD - Statistics display component
// Matches Admin Dashboard StatsCard styling
// ====================================================================

const CMSStatsCard = ({ title, value, icon: Icon, color = "blue", trend, trendValue, subtitle }) => {
  const colorClasses = {
    blue: {
      bg: "bg-[#204ecf]/10",
      text: "text-[#204ecf]",
      border: "border-[#204ecf]/20"
    },
    green: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20"
    },
    purple: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/20"
    },
    yellow: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/20"
    },
    red: {
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/20"
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      border: "border-cyan-500/20"
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  const trendColors = {
    up: "text-emerald-400",
    down: "text-red-400",
    neutral: "text-slate-400"
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 transition-all hover:border-slate-600/50"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colors.bg} ${colors.border} border`}>
          <Icon size={18} className={colors.text} />
        </div>
        {trend && trendValue && (
          <span className={`text-xs font-medium ${trendColors[trend]}`}>
            {trendValue}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-2xl font-bold text-slate-100">{value}</h3>
        <p className="text-sm text-slate-400 mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

export default CMSStatsCard;
