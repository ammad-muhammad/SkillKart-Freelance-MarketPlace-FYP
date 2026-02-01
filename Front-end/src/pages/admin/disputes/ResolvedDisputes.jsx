import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Eye } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const ResolvedDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getDisputes();
        if (res.success) setDisputes(res.data.filter(d => d.status === "Resolved"));
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
    { header: "Freelancer", accessor: "freelancer", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
    { header: "Amount", accessor: "amount", render: (value) => <span className="text-sm text-emerald-400 font-medium">PKR {value?.toLocaleString()}</span> },
    { header: "Resolution", accessor: "resolution", render: (value) => <span className="text-xs px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">{value}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Resolved Disputes</motion.h1>
        <p className="text-slate-500 text-sm mt-1">History of all resolved disputes</p>
      </div>

      <div className="bg-[#212631] rounded-xl border border-emerald-500/20 p-4 flex items-center gap-4">
        <div className="p-3 rounded-lg bg-emerald-500/10"><CheckCircle className="text-emerald-400" size={24} /></div>
        <div><p className="text-2xl font-bold text-emerald-400">{disputes.length}</p><p className="text-xs text-slate-500 uppercase tracking-wider">Total Resolved</p></div>
      </div>

      <DataTable columns={columns} data={disputes} loading={loading} searchPlaceholder="Search resolved disputes..."
        actions={(row) => (<button onClick={() => { setSelectedDispute(row); setIsViewOpen(true); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"><Eye size={16} /></button>)}
      />

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Dispute Resolution Details" size="lg">
        {selectedDispute && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-100">{selectedDispute.projectTitle}</h3><StatusBadge status={selectedDispute.status} /></div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
              <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Resolution</p>
              <p className="text-sm font-medium text-emerald-300">{selectedDispute.resolution}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[{ label: "Client", value: selectedDispute.client }, { label: "Freelancer", value: selectedDispute.freelancer }, { label: "Amount", value: `PKR ${selectedDispute.amount?.toLocaleString()}` }, { label: "Reason", value: selectedDispute.reason }].map((item) => (
                <div key={item.label} className="bg-[#1b2029] p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</p><p className="text-sm font-medium text-slate-200">{item.value}</p></div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ResolvedDisputes;
