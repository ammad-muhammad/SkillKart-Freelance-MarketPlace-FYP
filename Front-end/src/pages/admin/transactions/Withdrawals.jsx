import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal, { Button } from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getWithdrawals();
        if (res.success) setWithdrawals(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await adminService.processWithdrawal(id, "Completed");
      if (res.success) setWithdrawals(withdrawals.map(w => w.id === id ? res.data : w));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await adminService.processWithdrawal(id, "Rejected");
      if (res.success) setWithdrawals(withdrawals.map(w => w.id === id ? res.data : w));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const columns = [
    { header: "Request", accessor: "id", render: (value, row) => (<div><p className="text-sm font-semibold text-slate-100">{value}</p><p className="text-xs text-slate-500">{row.date}</p></div>) },
    { header: "Freelancer", accessor: "to", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Amount", accessor: "amount", render: (value) => <span className="text-sm text-emerald-400 font-bold">PKR {value.toLocaleString()}</span> },
    { header: "Method", accessor: "method", render: (value) => <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300">{value}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
  ];

  const stats = {
    pending: withdrawals.filter(w => w.status === "Pending").length,
    pendingAmount: withdrawals.filter(w => w.status === "Pending").reduce((sum, w) => sum + w.amount, 0),
    completed: withdrawals.filter(w => w.status === "Completed").reduce((sum, w) => sum + w.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Withdrawals</motion.h1>
        <p className="text-slate-500 text-sm mt-1">Process freelancer withdrawal requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#212631] rounded-xl border border-yellow-500/20 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-yellow-500/10"><Clock className="text-yellow-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-yellow-400">{stats.pending}</p><p className="text-xs text-slate-500 uppercase tracking-wider">Pending Requests</p></div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-red-500/20 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-red-500/10"><Wallet className="text-red-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-red-400">PKR {(stats.pendingAmount / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500 uppercase tracking-wider">Pending Amount</p></div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-emerald-500/20 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10"><CheckCircle className="text-emerald-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-emerald-400">PKR {(stats.completed / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500 uppercase tracking-wider">Total Withdrawn</p></div>
        </div>
      </div>

      <DataTable columns={columns} data={withdrawals} loading={loading} searchPlaceholder="Search withdrawals..."
        actions={(row) => (
          <>
            <button onClick={() => { setSelectedWithdrawal(row); setIsViewOpen(true); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"><Eye size={16} /></button>
            {row.status === "Pending" && (
              <>
                <button onClick={() => handleApprove(row.id)} className="p-2 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors" title="Approve"><CheckCircle size={16} /></button>
                <button onClick={() => handleReject(row.id)} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors" title="Reject"><XCircle size={16} /></button>
              </>
            )}
          </>
        )}
      />

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Withdrawal Request" size="md"
        footer={selectedWithdrawal?.status === "Pending" && (<><Button variant="danger" onClick={() => { handleReject(selectedWithdrawal.id); setIsViewOpen(false); }}>Reject</Button><Button onClick={() => { handleApprove(selectedWithdrawal.id); setIsViewOpen(false); }}>Approve</Button></>)}
      >
        {selectedWithdrawal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-emerald-400">PKR {selectedWithdrawal.amount?.toLocaleString()}</h3><StatusBadge status={selectedWithdrawal.status} /></div>
            <div className="grid grid-cols-2 gap-4">
              {[{ label: "Freelancer", value: selectedWithdrawal.to }, { label: "Method", value: selectedWithdrawal.method }, { label: "Account", value: selectedWithdrawal.accountDetails }, { label: "Request Date", value: selectedWithdrawal.date }].map((item) => (
                <div key={item.label} className="bg-[#1b2029] p-4 rounded-lg"><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</p><p className="text-sm font-medium text-slate-200">{item.value}</p></div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Withdrawals;
