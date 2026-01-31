import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, RotateCcw } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal, { Button } from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const SkillTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getSkillTests();
        if (res.success) setTests(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAction = async (id, status, score = null) => {
    try {
      const updates = {
        status,
        score: score || (status === "Passed" ? 85 : status === "Failed" ? 40 : null),
        takenAt: status !== "Not Taken" && status !== "Pending" ? new Date().toISOString().split("T")[0] : null,
        expiresAt: status === "Passed" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : null,
      };
      const res = await adminService.updateSkillTest(id, updates);
      if (res.success) {
        setTests(tests.map(t => t.id === id ? res.data : t));
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const columns = [
    {
      header: "Freelancer",
      accessor: "freelancer",
      render: (value, row) => (
        <div>
          <p className="text-sm font-semibold text-slate-100">{value}</p>
          <p className="text-xs text-slate-500">{row.freelancerId}</p>
        </div>
      ),
    },
    { header: "Skill", accessor: "skill", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
    {
      header: "Score",
      accessor: "score",
      render: (value) => (
        <span className={`text-sm font-medium ${value >= 70 ? "text-emerald-400" : value ? "text-red-400" : "text-slate-500"}`}>
          {value ? `${value}%` : "N/A"}
        </span>
      ),
    },
    { header: "Taken At", accessor: "takenAt", render: (value) => <span className="text-sm text-slate-400">{value || "—"}</span> },
    { header: "Expires", accessor: "expiresAt", render: (value) => <span className="text-sm text-slate-400">{value || "—"}</span> },
  ];

  const stats = {
    passed: tests.filter(t => t.status === "Passed").length,
    failed: tests.filter(t => t.status === "Failed").length,
    pending: tests.filter(t => t.status === "Pending" || t.status === "Not Taken").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">
          Skill Tests Management
        </motion.h1>
        <p className="text-slate-500 text-sm mt-1">Manage and review freelancer skill assessments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#212631] rounded-xl border border-emerald-500/20 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10"><CheckCircle className="text-emerald-400" size={24} /></div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{stats.passed}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Passed</p>
          </div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-red-500/20 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-red-500/10"><XCircle className="text-red-400" size={24} /></div>
          <div>
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Failed</p>
          </div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-yellow-500/20 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-yellow-500/10"><Clock className="text-yellow-400" size={24} /></div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Pending</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tests}
        loading={loading}
        searchPlaceholder="Search skill tests..."
        actions={(row) => (
          <>
            {row.status === "Pending" && (
              <>
                <button onClick={() => handleAction(row.id, "Passed", 85)} className="p-2 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors" title="Mark Passed">
                  <CheckCircle size={16} />
                </button>
                <button onClick={() => handleAction(row.id, "Failed", 40)} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors" title="Mark Failed">
                  <XCircle size={16} />
                </button>
              </>
            )}
            {row.status === "Not Taken" && (
              <button onClick={() => handleAction(row.id, "Pending")} className="p-2 hover:bg-blue-500/20 rounded text-slate-400 hover:text-blue-400 transition-colors" title="Send Test Invite">
                <Clock size={16} />
              </button>
            )}
            {(row.status === "Passed" || row.status === "Failed") && (
              <button onClick={() => handleAction(row.id, "Pending")} className="p-2 hover:bg-yellow-500/20 rounded text-slate-400 hover:text-yellow-400 transition-colors" title="Reset Test">
                <RotateCcw size={16} />
              </button>
            )}
          </>
        )}
      />
    </div>
  );
};

export default SkillTests;
