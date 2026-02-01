import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, CreditCard } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import { adminService } from "../../../services/adminService";

const ClientPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getTransactions();
        if (res.success) setPayments(res.data.filter(t => t.type === "Freelance Payment" || t.type === "Product Sale"));
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { header: "Transaction", accessor: "id", render: (value, row) => (<div><p className="text-sm font-semibold text-slate-100">{value}</p><p className="text-xs text-slate-500">{row.date}</p></div>) },
    { header: "From", accessor: "from", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "To", accessor: "to", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Type", accessor: "type", render: (value) => <span className="text-xs px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">{value}</span> },
    { header: "Amount", accessor: "amount", render: (value) => <span className="text-sm text-emerald-400 font-bold">PKR {value.toLocaleString()}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
  ];

  const stats = { total: payments.reduce((sum, p) => sum + p.amount, 0), count: payments.length };

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Client Payments</motion.h1>
        <p className="text-slate-500 text-sm mt-1">Track all payments made by clients</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10"><DollarSign className="text-emerald-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-emerald-400">PKR {(stats.total / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500 uppercase tracking-wider">Total Received</p></div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10"><CreditCard className="text-blue-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-blue-400">{stats.count}</p><p className="text-xs text-slate-500 uppercase tracking-wider">Transactions</p></div>
        </div>
      </div>

      <DataTable columns={columns} data={payments} loading={loading} searchPlaceholder="Search payments..." />
    </div>
  );
};

export default ClientPayments;
