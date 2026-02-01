import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const ClientProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getProjects();
        if (res.success) setProjects(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { header: "Project", accessor: "title", render: (value, row) => (<div><p className="text-sm font-semibold text-slate-100">{value}</p><p className="text-xs text-slate-500">{row.id}</p></div>) },
    { header: "Client", accessor: "client", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Freelancer", accessor: "freelancer", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
    { header: "Budget", accessor: "budget", render: (value) => <span className="text-sm text-emerald-400 font-medium">PKR {value?.toLocaleString()}</span> },
    { header: "Deadline", accessor: "deadline", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Client Projects</motion.h1>
        <p className="text-slate-500 text-sm mt-1">View all projects posted by clients</p>
      </div>

      <DataTable columns={columns} data={projects} loading={loading} searchPlaceholder="Search projects..."
        actions={(row) => (<button onClick={() => { setSelectedProject(row); setIsViewOpen(true); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"><Eye size={16} /></button>)}
      />

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Project Details" size="lg">
        {selectedProject && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">{selectedProject.title}</h3>
            <StatusBadge status={selectedProject.status} />
            <div className="grid grid-cols-2 gap-4">
              {[{ label: "Client", value: selectedProject.client }, { label: "Freelancer", value: selectedProject.freelancer }, { label: "Budget", value: `PKR ${selectedProject.budget?.toLocaleString()}` }, { label: "Payment Type", value: selectedProject.paymentType }, { label: "Deadline", value: selectedProject.deadline }, { label: "Created", value: selectedProject.createdAt }].map((item) => (
                <div key={item.label} className="bg-[#1b2029] p-4 rounded-lg"><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</p><p className="text-sm font-medium text-slate-200">{item.value}</p></div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClientProjects;
