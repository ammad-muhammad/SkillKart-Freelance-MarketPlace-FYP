import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const StatsCard = ({ title, value, icon: Icon, trend, trendValue, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  const iconBgClasses = {
    blue: "bg-blue-500/20",
    green: "bg-emerald-500/20",
    yellow: "bg-yellow-500/20",
    red: "bg-red-500/20",
    purple: "bg-purple-500/20",
    cyan: "bg-cyan-500/20",
  };

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp size={14} className="text-emerald-400" />;
    if (trend === "down") return <TrendingDown size={14} className="text-red-400" />;
    return <Minus size={14} className="text-slate-400" />;
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-emerald-400";
    if (trend === "down") return "text-red-400";
    return "text-slate-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
      transition={{ duration: 0.2 }}
      className="bg-[#212631] rounded-xl border border-slate-700/50 p-3 lg:p-4 hover:border-slate-600/50 transition-all group"
    >
      <div className="flex items-start justify-between mb-2 lg:mb-3">
        <div className={`p-2 lg:p-2.5 rounded-lg ${iconBgClasses[color]} transition-transform group-hover:scale-110`}>
          <Icon size={18} className={colorClasses[color].split(" ")[1]} />
        </div>
        {trendValue && (
          <div className={`flex items-center gap-0.5 text-[10px] lg:text-xs font-medium ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      <div>
        <motion.h3
          className="text-lg lg:text-xl font-bold text-slate-100 mb-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </motion.h3>
        <p className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-wider font-medium truncate">{title}</p>
      </div>
    </motion.div>
  );
};

export default StatsCard;
