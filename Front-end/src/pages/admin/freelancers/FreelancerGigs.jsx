import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import ConfirmDialog from "../../../Components/admin/ConfirmDialog";
import { adminService } from "../../../services/adminService";

const FreelancerGigs = () => {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getGigs();
        if (res.success) setGigs(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      const res = await adminService.updateGig(id, { status });
      if (res.success) setGigs(gigs.map(g => g.id === id ? res.data : g));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await adminService.deleteGig(selectedGig.id);
      if (res.success) setGigs(gigs.filter(g => g.id !== selectedGig.id));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const columns = [
    {
      header: "Gig Title",
      accessor: "title",
      render: (value, row) => (
        <div>
          <p className="text-sm font-semibold text-slate-100">{value}</p>
          <p className="text-xs text-slate-500">{row.id}</p>
        </div>
      ),
    },
    { header: "Freelancer", accessor: "freelancer", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Skill", accessor: "skill", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
    {
      header: "Price",
      accessor: "price",
      render: (value, row) => <span className="text-sm text-emerald-400 font-medium">PKR {value.toLocaleString()} <span className="text-slate-500">/{row.priceUnit?.replace("per ", "")}</span></span>,
    },
    { header: "Orders", accessor: "orders", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
    {
      header: "Rating",
      accessor: "rating",
      render: (value) => value > 0 ? (
        <div className="flex items-center gap-1">
          <span className="text-yellow-400">★</span>
          <span className="text-sm text-slate-300">{value.toFixed(1)}</span>
        </div>
      ) : <span className="text-sm text-slate-500">N/A</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">
          Freelancer Gigs
        </motion.h1>
        <p className="text-slate-500 text-sm mt-1">Manage all gigs created by freelancers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Gigs", value: gigs.length, color: "blue" },
          { label: "Active", value: gigs.filter(g => g.status === "Active").length, color: "green" },
          { label: "Pending", value: gigs.filter(g => g.status === "Pending").length, color: "yellow" },
          { label: "Total Orders", value: gigs.reduce((sum, g) => sum + g.orders, 0), color: "purple" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#212631] rounded-xl border border-slate-700/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={gigs}
        loading={loading}
        searchPlaceholder="Search gigs..."
        actions={(row) => (
          <>
            {row.status === "Pending" && (
              <button onClick={() => handleStatusChange(row.id, "Active")} className="p-2 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors" title="Approve">
                <CheckCircle size={16} />
              </button>
            )}
            {row.status === "Active" && (
              <button onClick={() => handleStatusChange(row.id, "Pending")} className="p-2 hover:bg-yellow-500/20 rounded text-slate-400 hover:text-yellow-400 transition-colors" title="Suspend">
                <XCircle size={16} />
              </button>
            )}
            <button onClick={() => { setSelectedGig(row); setIsDeleteOpen(true); }} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors" title="Delete">
              <Trash2 size={16} />
            </button>
          </>
        )}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Gig"
        message={`Are you sure you want to delete "${selectedGig?.title}"?`}
      />
    </div>
  );
};

export default FreelancerGigs;
