import { motion } from "framer-motion";

// ====================================================================
// CMS CARD - Reusable card component
// Matches Admin Dashboard card styling
// ====================================================================

const CMSCard = ({ 
  children, 
  title, 
  subtitle, 
  action, 
  className = "", 
  noPadding = false,
  hoverable = false 
}) => {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2 } : {}}
      className={`bg-[#212631] rounded-xl border border-slate-700/50 ${hoverable ? "transition-all hover:border-slate-600/50 cursor-pointer" : ""} ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-200">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>
        {children}
      </div>
    </motion.div>
  );
};

export default CMSCard;
