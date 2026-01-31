import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Eye, MessageSquare } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal, { FormSelect, FormTextarea, Button } from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const ActiveDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [resolution, setResolution] = useState({ decision: "", notes: "" });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getDisputes();
        if (res.success) setDisputes(res.data.filter(d => d.status === "Active" || d.status === "Under Review"));
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleResolve = async () => {
    try {
      const res = await adminService.resolveDispute(selectedDispute.id, { status: "Resolved", resolution: resolution.decision, notes: resolution.notes });
      if (res.success) setDisputes(disputes.filter(d => d.id !== selectedDispute.id));
      setIsViewOpen(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const columns = [
    { header: "Dispute", accessor: "id", render: (value, row) => (<div><p className="text-sm font-semibold text-slate-100">{value}</p><p className="text-xs text-slate-500">{row.createdAt}</p></div>) },
    { header: "Project", accessor: "projectTitle", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Client", accessor: "client", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
    { header: "Freelancer", accessor: "freelancer", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
    { header: "Amount", accessor: "amount", render: (value) => <span className="text-sm text-emerald-400 font-medium">PKR {value?.toLocaleString()}</span> },
    { header: "Reason", accessor: "reason", render: (value) => <span className="text-sm text-slate-400 truncate block max-w-[200px]">{value}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Active Disputes</motion.h1>
        <p className="text-slate-500 text-sm mt-1">Resolve ongoing disputes between clients and freelancers</p>
      </div>

      <div className="bg-[#212631] rounded-xl border border-red-500/20 p-4 flex items-center gap-4">
        <div className="p-3 rounded-lg bg-red-500/10"><AlertTriangle className="text-red-400" size={24} /></div>
        <div><p className="text-2xl font-bold text-red-400">{disputes.length}</p><p className="text-xs text-slate-500 uppercase tracking-wider">Active Disputes Requiring Attention</p></div>
      </div>

      {disputes.length === 0 && !loading ? (
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-12 text-center">
          <MessageSquare size={48} className="text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-100 mb-2">No Active Disputes</h3>
          <p className="text-slate-400">All disputes have been resolved.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={disputes} loading={loading} searchPlaceholder="Search disputes..."
          actions={(row) => (<button onClick={() => { setSelectedDispute(row); setResolution({ decision: "", notes: "" }); setIsViewOpen(true); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"><Eye size={16} /></button>)}
        />
      )}

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Resolve Dispute" size="lg"
        footer={<><Button variant="ghost" onClick={() => setIsViewOpen(false)}>Cancel</Button><Button onClick={handleResolve} disabled={!resolution.decision}>Resolve Dispute</Button></>}
      >
        {selectedDispute && (
          <div className="space-y-4">
            <div className="bg-[#1b2029] p-4 rounded-lg">
              <h3 className="text-lg font-bold text-slate-100 mb-2">{selectedDispute.projectTitle}</h3>
              <p className="text-sm text-slate-400"><strong>Reason:</strong> {selectedDispute.reason}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[{ label: "Client", value: selectedDispute.client }, { label: "Freelancer", value: selectedDispute.freelancer }, { label: "Disputed Amount", value: `PKR ${selectedDispute.amount?.toLocaleString()}` }, { label: "Time Spent", value: selectedDispute.timeSpent }].map((item) => (
                <div key={item.label} className="bg-[#1b2029] p-3 rounded-lg"><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</p><p className="text-sm font-medium text-slate-200">{item.value}</p></div>
              ))}
            </div>
            <hr className="border-slate-700/50" />
            <FormSelect label="Resolution Decision" value={resolution.decision} onChange={(e) => setResolution({ ...resolution, decision: e.target.value })}
              options={[{ value: "", label: "Select decision" }, { value: "Full Refund to Client", label: "Full Refund to Client" }, { value: "Partial Refund (50%)", label: "Partial Refund (50%)" }, { value: "Pay Freelancer", label: "Pay Freelancer" }, { value: "Split Payment", label: "Split Payment (50/50)" }]}
            />
            <FormTextarea label="Resolution Notes" placeholder="Add notes about this resolution..." value={resolution.notes} onChange={(e) => setResolution({ ...resolution, notes: e.target.value })} rows={3} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ActiveDisputes;
