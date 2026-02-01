import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, Edit, Trash2, Eye, CheckCircle, XCircle } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal, { FormInput, FormSelect, Button } from "../../../Components/admin/Modal";
import ConfirmDialog from "../../../Components/admin/ConfirmDialog";
import { adminService } from "../../../services/adminService";

const AllFreelancers = () => {
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    skill: "",
    city: "",
    verificationStatus: "Pending",
  });

  const fetchFreelancers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getFreelancers();
      if (res.success) setFreelancers(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreelancers();
  }, []);

  const handleCreate = () => {
    setSelectedFreelancer(null);
    setFormData({ name: "", email: "", skill: "", city: "", verificationStatus: "Pending" });
    setIsModalOpen(true);
  };

  const handleEdit = (freelancer) => {
    setSelectedFreelancer(freelancer);
    setFormData({
      name: freelancer.name,
      email: freelancer.email,
      skill: freelancer.skill,
      city: freelancer.city,
      verificationStatus: freelancer.verificationStatus,
    });
    setIsModalOpen(true);
  };

  const handleView = (freelancer) => {
    setSelectedFreelancer(freelancer);
    setIsViewOpen(true);
  };

  const handleDelete = (freelancer) => {
    setSelectedFreelancer(freelancer);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (selectedFreelancer) {
        const res = await adminService.updateFreelancer(selectedFreelancer.id, formData);
        if (res.success) {
          setFreelancers(freelancers.map(f => f.id === selectedFreelancer.id ? res.data : f));
        }
      } else {
        const newFreelancer = {
          ...formData,
          avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
          joined: new Date().toISOString().split("T")[0],
          skillTestStatus: "Not Taken",
          activeProjects: 0,
          rating: 0,
          earnings: 0,
          completedProjects: 0,
        };
        const res = await adminService.createFreelancer(newFreelancer);
        if (res.success) {
          setFreelancers([...freelancers, res.data]);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await adminService.deleteFreelancer(selectedFreelancer.id);
      if (res.success) {
        setFreelancers(freelancers.filter(f => f.id !== selectedFreelancer.id));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleVerification = async (id, status) => {
    try {
      const res = await adminService.updateFreelancerVerification(id, status);
      if (res.success) {
        setFreelancers(freelancers.map(f => f.id === id ? res.data : f));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const columns = [
    {
      header: "Freelancer",
      accessor: "name",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <img src={row.avatar} alt={value} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
          <div>
            <p className="text-sm font-semibold text-slate-100">{value}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    { header: "Skill", accessor: "skill", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Verification", accessor: "verificationStatus", render: (value) => <StatusBadge status={value} /> },
    { header: "Skill Test", accessor: "skillTestStatus", render: (value) => <StatusBadge status={value} /> },
    { header: "Projects", accessor: "activeProjects", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
    {
      header: "Rating",
      accessor: "rating",
      render: (value) => (
        <div className="flex items-center gap-1">
          <span className="text-sm text-yellow-400">★</span>
          <span className="text-sm text-slate-300">{value > 0 ? value.toFixed(1) : "N/A"}</span>
        </div>
      ),
    },
  ];

  const skillOptions = [
    { value: "React Developer", label: "React Developer" },
    { value: "Node.js Developer", label: "Node.js Developer" },
    { value: "UI/UX Designer", label: "UI/UX Designer" },
    { value: "WordPress Expert", label: "WordPress Expert" },
    { value: "Python Developer", label: "Python Developer" },
    { value: "Mobile App Developer", label: "Mobile App Developer" },
    { value: "Graphic Designer", label: "Graphic Designer" },
    { value: "SEO Specialist", label: "SEO Specialist" },
    { value: "Video Editor", label: "Video Editor" },
    { value: "Content Writer", label: "Content Writer" },
  ];

  const statusOptions = [
    { value: "Pending", label: "Pending" },
    { value: "Verified", label: "Verified" },
    { value: "Rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-slate-100"
          >
            All Freelancers
          </motion.h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage all freelancers on the platform
          </p>
        </div>
        <Button onClick={handleCreate}>
          <UserPlus size={16} /> Add Freelancer
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={freelancers}
        loading={loading}
        searchPlaceholder="Search freelancers..."
        actions={(row) => (
          <>
            <button onClick={() => handleView(row)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors" title="View">
              <Eye size={16} />
            </button>
            {row.verificationStatus === "Pending" && (
              <>
                <button onClick={() => handleVerification(row.id, "Verified")} className="p-2 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors" title="Approve">
                  <CheckCircle size={16} />
                </button>
                <button onClick={() => handleVerification(row.id, "Rejected")} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors" title="Reject">
                  <XCircle size={16} />
                </button>
              </>
            )}
            <button onClick={() => handleEdit(row)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors" title="Edit">
              <Edit size={16} />
            </button>
            <button onClick={() => handleDelete(row)} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors" title="Delete">
              <Trash2 size={16} />
            </button>
          </>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedFreelancer ? "Edit Freelancer" : "Add New Freelancer"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{selectedFreelancer ? "Update" : "Create"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormInput
            label="Full Name"
            placeholder="Enter full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <FormInput
            label="Email"
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <FormSelect
            label="Primary Skill"
            value={formData.skill}
            onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
            options={[{ value: "", label: "Select skill" }, ...skillOptions]}
          />
          <FormInput
            label="City"
            placeholder="Enter city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <FormSelect
            label="Verification Status"
            value={formData.verificationStatus}
            onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
            options={statusOptions}
          />
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Freelancer Details"
        size="lg"
      >
        {selectedFreelancer && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img src={selectedFreelancer.avatar} alt={selectedFreelancer.name} className="w-20 h-20 rounded-full object-cover border-2 border-slate-700" />
              <div>
                <h3 className="text-lg font-bold text-slate-100">{selectedFreelancer.name}</h3>
                <p className="text-sm text-slate-400">{selectedFreelancer.email}</p>
                <div className="flex gap-2 mt-2">
                  <StatusBadge status={selectedFreelancer.verificationStatus} />
                  <StatusBadge status={selectedFreelancer.skillTestStatus} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1b2029] p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Skill</p>
                <p className="text-sm font-medium text-slate-200">{selectedFreelancer.skill}</p>
              </div>
              <div className="bg-[#1b2029] p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">City</p>
                <p className="text-sm font-medium text-slate-200">{selectedFreelancer.city}</p>
              </div>
              <div className="bg-[#1b2029] p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active Projects</p>
                <p className="text-sm font-medium text-slate-200">{selectedFreelancer.activeProjects}</p>
              </div>
              <div className="bg-[#1b2029] p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Completed Projects</p>
                <p className="text-sm font-medium text-slate-200">{selectedFreelancer.completedProjects}</p>
              </div>
              <div className="bg-[#1b2029] p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Earnings</p>
                <p className="text-sm font-medium text-emerald-400">PKR {selectedFreelancer.earnings?.toLocaleString()}</p>
              </div>
              <div className="bg-[#1b2029] p-4 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Rating</p>
                <p className="text-sm font-medium text-yellow-400">★ {selectedFreelancer.rating > 0 ? selectedFreelancer.rating.toFixed(1) : "N/A"}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Freelancer"
        message={`Are you sure you want to delete "${selectedFreelancer?.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
};

export default AllFreelancers;
