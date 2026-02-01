import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { adminService } from "../../../services/adminService";

const SkillDemand = () => {
  const [skillData, setSkillData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getSkillDemand();
        if (res.success) setSkillData(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTrendIcon = (trend) => {
    if (trend === "up") return <TrendingUp size={14} className="text-emerald-400" />;
    if (trend === "down") return <TrendingDown size={14} className="text-red-400" />;
    return <Minus size={14} className="text-slate-400" />;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1b2029] border border-slate-700/50 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-xs font-medium mb-1">{label}</p>
          <p className="text-sm text-[#204ecf] font-bold">Demand: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-96"><div className="w-10 h-10 border-4 border-[#204ecf] border-t-transparent rounded-full animate-spin" /></div>);
  }

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Skill Demand Analysis</motion.h1>
        <p className="text-slate-500 text-sm mt-1">AI-analyzed market demand for different skills in Pakistan</p>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-sm font-bold text-slate-200 mb-4">Skill Demand Chart</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={skillData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis dataKey="skill" type="category" stroke="#6b7280" fontSize={10} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="demand" fill="#204ecf" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skillData.map((skill) => (
          <motion.div key={skill.skill} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 hover:border-[#204ecf]/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-200">{skill.skill}</h4>
              <div className="flex items-center gap-1">{getTrendIcon(skill.trend)}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${skill.demand}%`, background: skill.demand > 80 ? "#10b981" : skill.demand > 60 ? "#204ecf" : "#f59e0b" }} />
              </div>
              <span className="text-sm font-bold text-slate-300">{skill.demand}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Projects: {skill.activeProjects}</span>
              <span className="text-slate-500">Freelancers: {skill.freelancers}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SkillDemand;
