import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Mail, Award } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const VerifiedFreelancers = () => {
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getFreelancers("Verified");
        if (res.success) setFreelancers(res.data);
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
      header: "Freelancer",
      accessor: "name",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={row.avatar} alt={value} className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/50" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
              <Award size={10} className="text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">{value}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    { header: "Skill", accessor: "skill", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "City", accessor: "city", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
    { header: "Completed", accessor: "completedProjects", render: (value) => <span className="text-sm text-slate-300">{value} projects</span> },
    {
      header: "Earnings",
      accessor: "earnings",
      render: (value) => <span className="text-sm text-emerald-400 font-medium">PKR {value?.toLocaleString()}</span>,
    },
    {
      header: "Rating",
      accessor: "rating",
      render: (value) => (
        <div className="flex items-center gap-1">
          <span className="text-yellow-400">★</span>
          <span className="text-sm text-slate-300 font-medium">{value.toFixed(1)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">
          Verified Freelancers
        </motion.h1>
        <p className="text-slate-500 text-sm mt-1">All verified and trusted freelancers on SkillKart</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Verified</p>
          <p className="text-2xl font-bold text-emerald-400">{freelancers.length}</p>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg Rating</p>
          <p className="text-2xl font-bold text-yellow-400">
            {freelancers.length ? (freelancers.reduce((sum, f) => sum + f.rating, 0) / freelancers.length).toFixed(1) : "0"}
          </p>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-slate-100">
            PKR {freelancers.reduce((sum, f) => sum + (f.earnings || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={freelancers}
        loading={loading}
        searchPlaceholder="Search verified freelancers..."
        actions={(row) => (
          <>
            <button onClick={() => { setSelectedFreelancer(row); setIsViewOpen(true); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors">
              <Eye size={16} />
            </button>
            <a href={`mailto:${row.email}`} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-emerald-400 transition-colors">
              <Mail size={16} />
            </a>
          </>
        )}
      />

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Verified Freelancer Profile" size="lg">
        {selectedFreelancer && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={selectedFreelancer.avatar} alt={selectedFreelancer.name} className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500/30" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Award size={14} className="text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">{selectedFreelancer.name}</h3>
                <p className="text-sm text-slate-400">{selectedFreelancer.skill}</p>
                <StatusBadge status="Verified" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Email", value: selectedFreelancer.email },
                { label: "City", value: selectedFreelancer.city },
                { label: "Joined", value: selectedFreelancer.joined },
                { label: "Rating", value: `★ ${selectedFreelancer.rating?.toFixed(1)}` },
                { label: "Active Projects", value: selectedFreelancer.activeProjects },
                { label: "Completed Projects", value: selectedFreelancer.completedProjects },
              ].map((item) => (
                <div key={item.label} className="bg-[#1b2029] p-4 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="text-sm font-medium text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VerifiedFreelancers;
