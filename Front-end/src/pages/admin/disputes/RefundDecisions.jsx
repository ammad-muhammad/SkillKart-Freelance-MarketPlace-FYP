import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCcw, DollarSign, ArrowRightLeft } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import { adminService } from "../../../services/adminService";

const RefundDecisions = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getDisputes();
        if (res.success) setDisputes(res.data.filter(d => d.status === "Resolved" && d.resolution?.includes("Refund")));
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { header: "Dispute", accessor: "id", render: (value, row) => (<div><p className="text-sm font-semibold text-slate-100">{value}</p><p className="text-xs text-slate-500">{row.createdAt}</p></div>) },
    { header: "Project", accessor: "projectTitle", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Client", accessor: "client", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
    { header: "Refund Amount", accessor: "amount", render: (value, row) => {
      const isPartial = row.resolution?.includes("Partial");
      const amount = isPartial ? value * 0.5 : value;
      return <span className="text-sm text-red-400 font-bold">PKR {amount?.toLocaleString()}</span>;
    }},
    { header: "Type", accessor: "resolution", render: (value) => <span className="text-xs px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-red-400">{value}</span> },
    { header: "Status", accessor: "status", render: () => <StatusBadge status="Refunded" /> },
  ];

  const totalRefunded = disputes.reduce((sum, d) => {
    const isPartial = d.resolution?.includes("Partial");
    return sum + (isPartial ? d.amount * 0.5 : d.amount);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Refund Decisions</motion.h1>
        <p className="text-slate-500 text-sm mt-1">Track all refund decisions and processed refunds</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#212631] rounded-xl border border-red-500/20 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-red-500/10"><RefreshCcw className="text-red-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-red-400">{disputes.length}</p><p className="text-xs text-slate-500 uppercase tracking-wider">Refunds Issued</p></div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-slate-700/50"><DollarSign className="text-slate-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-slate-100">PKR {(totalRefunded / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500 uppercase tracking-wider">Total Refunded</p></div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-yellow-500/10"><ArrowRightLeft className="text-yellow-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-yellow-400">{disputes.filter(d => d.resolution?.includes("Partial")).length}</p><p className="text-xs text-slate-500 uppercase tracking-wider">Partial Refunds</p></div>
        </div>
      </div>

      <DataTable columns={columns} data={disputes} loading={loading} searchPlaceholder="Search refunds..." />
    </div>
  );
};

export default RefundDecisions;
