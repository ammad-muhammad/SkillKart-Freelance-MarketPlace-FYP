import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Edit, TrendingUp, TrendingDown, Award } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal, { FormSelect, Button } from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const Rankings = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRanking, setSelectedRanking] = useState(null);
  const [formData, setFormData] = useState({ visibility: "", priorityFor: "" });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getRankings();
        if (res.success) setRankings(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleEdit = (ranking) => {
    setSelectedRanking(ranking);
    setFormData({ visibility: ranking.visibility, priorityFor: ranking.priorityFor });
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    try {
      const res = await adminService.updateRanking(selectedRanking.id, formData);
      if (res.success) {
        setRankings(rankings.map(r => r.id === selectedRanking.id ? res.data : r));
        setIsEditOpen(false);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const columns = [
    {
      header: "Rank",
      accessor: "rank",
      render: (value) => (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
          value === 1 ? "bg-yellow-500/20 text-yellow-400" :
          value === 2 ? "bg-slate-500/20 text-slate-300" :
          value === 3 ? "bg-orange-500/20 text-orange-400" :
          "bg-slate-700/50 text-slate-400"
        }`}>
          {value}
        </div>
      ),
    },
    {
      header: "Freelancer",
      accessor: "freelancer",
      render: (value, row) => (
        <div>
          <p className="text-sm font-semibold text-slate-100">{value}</p>
          <p className="text-xs text-slate-500">{row.skill}</p>
        </div>
      ),
    },
    { header: "Score", accessor: "score", render: (value) => (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-[#204ecf] rounded-full" style={{ width: `${value}%` }} />
        </div>
        <span className="text-sm text-slate-300">{value}</span>
      </div>
    )},
    { header: "Visibility", accessor: "visibility", render: (value) => <StatusBadge status={value} /> },
    { header: "Priority For", accessor: "priorityFor", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">
          Rankings & Visibility
        </motion.h1>
        <p className="text-slate-500 text-sm mt-1">Control freelancer rankings and visibility in search results</p>
      </div>

      <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Award className="text-yellow-400" size={18} /> Ranking Algorithm Rules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-[#1b2029] p-4 rounded-lg">
            <p className="text-emerald-400 font-medium mb-1">Large Projects</p>
            <p className="text-slate-400">Prioritize experienced freelancers with 10+ completed projects</p>
          </div>
          <div className="bg-[#1b2029] p-4 rounded-lg">
            <p className="text-blue-400 font-medium mb-1">Medium Projects</p>
            <p className="text-slate-400">Balance between experience and availability</p>
          </div>
          <div className="bg-[#1b2029] p-4 rounded-lg">
            <p className="text-yellow-400 font-medium mb-1">Small Projects</p>
            <p className="text-slate-400">Prioritize beginners & students for opportunities</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rankings}
        loading={loading}
        searchPlaceholder="Search rankings..."
        actions={(row) => (
          <button onClick={() => handleEdit(row)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors">
            <Edit size={16} />
          </button>
        )}
      />

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Ranking Settings" size="md"
        footer={<><Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button><Button onClick={handleSave}>Save Changes</Button></>}
      >
        <div className="space-y-4">
          <div className="bg-[#1b2029] p-4 rounded-lg mb-4">
            <p className="text-sm font-medium text-slate-200">{selectedRanking?.freelancer}</p>
            <p className="text-xs text-slate-500">{selectedRanking?.skill}</p>
          </div>
          <FormSelect label="Visibility Level" value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
            options={[{ value: "High", label: "High" }, { value: "Medium", label: "Medium" }, { value: "Low", label: "Low" }]}
          />
          <FormSelect label="Priority For" value={formData.priorityFor} onChange={(e) => setFormData({ ...formData, priorityFor: e.target.value })}
            options={[{ value: "All Projects", label: "All Projects" }, { value: "Large Projects", label: "Large Projects" }, { value: "Small Projects", label: "Small Projects" }]}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Rankings;
