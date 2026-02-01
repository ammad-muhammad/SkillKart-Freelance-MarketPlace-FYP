const StatusBadge = ({ status, size = "md" }) => {
  const statusStyles = {
    // Verification statuses
    "Verified": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Pending": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "Rejected": "bg-red-500/10 text-red-400 border-red-500/20",
    
    // Project/Gig statuses
    "Active": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "In Progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Completed": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Under Review": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Cancelled": "bg-red-500/10 text-red-400 border-red-500/20",
    
    // Payment statuses
    "Processing": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "Paid": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Failed": "bg-red-500/10 text-red-400 border-red-500/20",
    
    // Dispute statuses
    "Resolved": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    
    // Skill Test statuses
    "Passed": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Not Taken": "bg-slate-500/10 text-slate-400 border-slate-500/20",
    
    // Product statuses
    "Approved": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    
    // Client statuses
    "Premium": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Inactive": "bg-slate-500/10 text-slate-400 border-slate-500/20",
    
    // Visibility
    "High": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "Medium": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "Low": "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const style = statusStyles[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20";

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${style} ${sizeClasses[size]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
