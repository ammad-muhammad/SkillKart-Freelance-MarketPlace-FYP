import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles, TrendingUp } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import { adminService } from "../../../services/adminService";

const AIRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getAIRecommendations();
        if (res.success) setRecommendations(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { header: "Type", accessor: "type", render: (value) => <span className="text-xs px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400">{value}</span> },
    { header: "Target", accessor: "target", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Recommendation", accessor: "recommendation", render: (value) => <span className="text-sm text-slate-200">{value}</span> },
    {
      header: "Confidence",
      accessor: "confidence",
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${value}%`, background: value > 80 ? "#10b981" : value > 60 ? "#204ecf" : "#f59e0b" }} />
          </div>
          <span className="text-xs text-slate-400">{value}%</span>
        </div>
      ),
    },
    { header: "Impact", accessor: "impact", render: (value) => <span className={`text-xs px-2 py-1 rounded ${value === "High" ? "bg-emerald-500/10 text-emerald-400" : value === "Medium" ? "bg-blue-500/10 text-blue-400" : "bg-slate-700/50 text-slate-400"}`}>{value}</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">AI Recommendations</motion.h1>
        <p className="text-slate-500 text-sm mt-1">AI-powered insights and recommendations for platform optimization</p>
      </div>

      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-lg bg-purple-500/20"><Brain className="text-purple-400" size={24} /></div>
          <div><h3 className="text-lg font-bold text-slate-100">AI-Powered Analytics</h3><p className="text-sm text-slate-400">Machine learning insights to improve platform performance</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, label: "Active Recommendations", value: recommendations.length, color: "purple" },
            { icon: TrendingUp, label: "High Impact", value: recommendations.filter(r => r.impact === "High").length, color: "emerald" },
            { icon: Brain, label: "Avg Confidence", value: recommendations.length ? `${Math.round(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length)}%` : "0%", color: "blue" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1b2029] p-4 rounded-lg">
              <stat.icon className={`text-${stat.color}-400 mb-2`} size={20} />
              <p className={`text-xl font-bold text-${stat.color}-400`}>{stat.value}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={recommendations} loading={loading} searchPlaceholder="Search recommendations..." />
    </div>
  );
};

export default AIRecommendations;
