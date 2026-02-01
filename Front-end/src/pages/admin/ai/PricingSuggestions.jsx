import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import { adminService } from "../../../services/adminService";

const PricingSuggestions = () => {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getPricingSuggestions();
        if (res.success) setPricing(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { header: "Skill", accessor: "skill", render: (value) => <span className="text-sm font-medium text-slate-200">{value}</span> },
    { header: "Current Avg", accessor: "currentAvg", render: (value) => <span className="text-sm text-slate-400">PKR {value?.toLocaleString()}/hr</span> },
    { header: "Suggested", accessor: "suggested", render: (value) => <span className="text-sm text-emerald-400 font-medium">PKR {value?.toLocaleString()}/hr</span> },
    {
      header: "Change",
      accessor: "change",
      render: (value) => (
        <span className={`text-xs px-2 py-1 rounded ${value > 0 ? "bg-emerald-500/10 text-emerald-400" : value < 0 ? "bg-red-500/10 text-red-400" : "bg-slate-700/50 text-slate-400"}`}>
          {value > 0 ? "+" : ""}{value}%
        </span>
      ),
    },
    { header: "Market Demand", accessor: "demand", render: (value) => <span className={`text-xs px-2 py-1 rounded ${value === "High" ? "bg-emerald-500/10 text-emerald-400" : value === "Medium" ? "bg-blue-500/10 text-blue-400" : "bg-yellow-500/10 text-yellow-400"}`}>{value}</span> },
    { header: "Confidence", accessor: "confidence", render: (value) => <span className="text-sm text-slate-300">{value}%</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">AI Pricing Suggestions</motion.h1>
        <p className="text-slate-500 text-sm mt-1">Market-based pricing recommendations for different skill categories</p>
      </div>

      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl border border-emerald-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/20"><DollarSign className="text-emerald-400" size={24} /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Pricing Intelligence</h3>
            <p className="text-sm text-slate-400 mb-4">AI analyzes market rates, demand, and competition to suggest optimal pricing for each skill category in Pakistan&apos;s micro-freelancing market.</p>
            <div className="flex items-center gap-2 text-xs text-emerald-400"><AlertCircle size={14} /> Suggestions updated daily based on active projects</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Skills Analyzed", value: pricing.length, icon: TrendingUp, color: "blue" },
          { label: "Avg Increase Suggested", value: `+${pricing.length ? Math.round(pricing.filter(p => p.change > 0).reduce((sum, p) => sum + p.change, 0) / pricing.filter(p => p.change > 0).length || 0) : 0}%`, icon: TrendingUp, color: "emerald" },
          { label: "High Demand Skills", value: pricing.filter(p => p.demand === "High").length, icon: DollarSign, color: "yellow" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-${stat.color}-500/10`}><stat.icon className={`text-${stat.color}-400`} size={24} /></div>
            <div><p className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</p><p className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</p></div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={pricing} loading={loading} searchPlaceholder="Search skills..." />
    </div>
  );
};

export default PricingSuggestions;
