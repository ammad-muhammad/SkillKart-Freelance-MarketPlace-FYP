import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  Briefcase,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import StatsCard from "../../Components/admin/StatsCard";
import { adminService } from "../../services/adminService";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, chartRes] = await Promise.all([
          adminService.getStats(),
          adminService.getChartData(),
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (chartRes.success) setChartData(chartRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#204ecf] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    { title: "Total Freelancers", value: stats?.totalFreelancers || 0, icon: Users, color: "blue", trend: "up", trendValue: "+12%" },
    { title: "Verified Freelancers", value: stats?.verifiedFreelancers || 0, icon: UserCheck, color: "green", trend: "up", trendValue: "+8%" },
    { title: "Total Clients", value: stats?.totalClients || 0, icon: Users, color: "purple", trend: "up", trendValue: "+15%" },
    { title: "Total Projects", value: stats?.totalProjects || 0, icon: Briefcase, color: "cyan", trend: "up", trendValue: "+22%" },
    { title: "Active Gigs", value: stats?.activeGigs || 0, icon: TrendingUp, color: "yellow", trend: "neutral", trendValue: "0%" },
    { title: "Digital Products", value: stats?.digitalProducts || 0, icon: ShoppingBag, color: "purple", trend: "up", trendValue: "+5%" },
    { title: "Total Revenue", value: `PKR ${((stats?.totalRevenue || 0) / 1000).toFixed(0)}K`, icon: DollarSign, color: "green", trend: "up", trendValue: "+18%" },
    { title: "Active Disputes", value: stats?.activeDisputes || 0, icon: AlertTriangle, color: "red", trend: "down", trendValue: "-3%" },
  ];

  const COLORS = ["#204ecf", "#10b981", "#f59e0b", "#ef4444"];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1b2029] border border-slate-700/50 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-xs font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
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
          Dashboard Overview
        </motion.h1>
        <p className="text-slate-500 text-sm mt-1">
          Welcome back! Here&apos;s what&apos;s happening on SkillKart today.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
        {statsCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <StatsCard {...card} />
          </motion.div>
        ))}
      </div>


      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Freelancers vs Clients Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#212631] rounded-xl border border-slate-700/50 p-6"
        >
          <h3 className="text-sm font-bold text-slate-200 mb-4">Freelancers vs Clients Growth</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData?.freelancersVsClients || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="freelancers" fill="#204ecf" radius={[4, 4, 0, 0]} name="Freelancers" />
                <Bar dataKey="clients" fill="#10b981" radius={[4, 4, 0, 0]} name="Clients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Monthly Projects Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#212631] rounded-xl border border-slate-700/50 p-6"
        >
          <h3 className="text-sm font-bold text-slate-200 mb-4">Monthly Projects Posted</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData?.monthlyProjects || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="projects"
                  stroke="#204ecf"
                  strokeWidth={3}
                  dot={{ fill: "#204ecf", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#204ecf" }}
                  name="Projects"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Revenue Breakdown Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#212631] rounded-xl border border-slate-700/50 p-6"
        >
          <h3 className="text-sm font-bold text-slate-200 mb-4">Revenue Breakdown</h3>
          <div className="h-72 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData?.revenueBreakdown || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "#6b7280" }}
                >
                  {(chartData?.revenueBreakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Skill Demand Ranking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#212631] rounded-xl border border-slate-700/50 p-6"
        >
          <h3 className="text-sm font-bold text-slate-200 mb-4">Skill Demand Ranking</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData?.skillDemand || []}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="skill" type="category" stroke="#6b7280" fontSize={10} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="demand" fill="#204ecf" radius={[0, 4, 4, 0]} name="Demand Score">
                  {(chartData?.skillDemand || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.demand > 80 ? "#10b981" : entry.demand > 60 ? "#204ecf" : "#f59e0b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-[#212631] rounded-xl border border-slate-700/50 p-6"
      >
        <h3 className="text-sm font-bold text-slate-200 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "View All Freelancers", path: "/admin/freelancers", color: "blue" },
            { label: "Pending Approvals", path: "/admin/products/approvals", color: "yellow" },
            { label: "Active Disputes", path: "/admin/disputes/active", color: "red" },
            { label: "Process Withdrawals", path: "/admin/transactions/withdrawals", color: "green" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.path}
              className={`p-4 rounded-lg border border-slate-700/50 hover:border-${action.color}-500/50 hover:bg-${action.color}-500/5 transition-all text-center group`}
            >
              <p className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                {action.label}
              </p>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;