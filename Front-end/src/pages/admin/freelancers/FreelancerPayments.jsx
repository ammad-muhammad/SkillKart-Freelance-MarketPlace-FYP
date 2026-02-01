import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import { adminService } from "../../../services/adminService";

const FreelancerPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getFreelancePayments();
        if (res.success) setPayments(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    {
      header: "Transaction",
      accessor: "id",
      render: (value, row) => (
        <div>
          <p className="text-sm font-semibold text-slate-100">{value}</p>
          <p className="text-xs text-slate-500">{row.date}</p>
        </div>
      ),
    },
    { header: "From", accessor: "from", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "To", accessor: "to", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Amount", accessor: "amount", render: (value) => <span className="text-sm text-emerald-400 font-bold">PKR {value.toLocaleString()}</span> },
    { header: "Type", accessor: "paymentType", render: (value) => <span className="text-xs px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">{value}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
  ];

  const stats = {
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    completed: payments.filter(p => p.status === "Completed").length,
    pending: payments.filter(p => p.status === "Pending").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">
          Freelancer Payments
        </motion.h1>
        <p className="text-slate-500 text-sm mt-1">Track 30% upfront payment protection for freelancers</p>
      </div>

      <div className="bg-[#212631] rounded-xl border border-blue-500/20 p-6">
        <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
          <DollarSign className="text-blue-400" size={18} /> 30% Upfront Payment Model
        </h3>
        <p className="text-sm text-slate-400">Freelancers receive 30% payment upfront when project starts. Remaining 70% is released upon client approval.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10"><DollarSign className="text-emerald-400" size={24} /></div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">PKR {(stats.total / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Paid</p>
          </div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10"><CheckCircle className="text-blue-400" size={24} /></div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{stats.completed}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Completed</p>
          </div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-yellow-500/10"><Clock className="text-yellow-400" size={24} /></div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Pending</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        searchPlaceholder="Search payments..."
      />
    </div>
  );
};

export default FreelancerPayments;
