import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, Edit, Trash2, Eye, Ban } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal, { FormInput, FormSelect, Button } from "../../../Components/admin/Modal";
import ConfirmDialog from "../../../Components/admin/ConfirmDialog";
import { adminService } from "../../../services/adminService";

const AllClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", city: "", type: "Individual", status: "Active" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminService.getClients();
      if (res.success) setClients(res.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = () => {
    setSelectedClient(null);
    setFormData({ name: "", email: "", city: "", type: "Individual", status: "Active" });
    setIsModalOpen(true);
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setFormData({ name: client.name, email: client.email, city: client.city, type: client.type, status: client.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (selectedClient) {
        const res = await adminService.updateClient(selectedClient.id, formData);
        if (res.success) setClients(clients.map(c => c.id === selectedClient.id ? res.data : c));
      } else {
        const newClient = { ...formData, avatar: `https://i.pravatar.cc/150?u=${Date.now()}`, joined: new Date().toISOString().split("T")[0], projectsPosted: 0, paymentsMade: 0 };
        const res = await adminService.createClient(newClient);
        if (res.success) setClients([...clients, res.data]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await adminService.deleteClient(selectedClient.id);
      if (res.success) setClients(clients.filter(c => c.id !== selectedClient.id));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleStatusToggle = async (client) => {
    const newStatus = client.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await adminService.updateClient(client.id, { status: newStatus });
      if (res.success) setClients(clients.map(c => c.id === client.id ? res.data : c));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const columns = [
    {
      header: "Client",
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
    { header: "Type", accessor: "type", render: (value) => <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300">{value}</span> },
    { header: "Projects", accessor: "projectsPosted", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Payments", accessor: "paymentsMade", render: (value) => <span className="text-sm text-emerald-400 font-medium">PKR {value?.toLocaleString()}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
    { header: "City", accessor: "city", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">All Clients</motion.h1>
          <p className="text-slate-500 text-sm mt-1">Manage all clients on SkillKart</p>
        </div>
        <Button onClick={handleCreate}><UserPlus size={16} /> Add Client</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: clients.length },
          { label: "Active", value: clients.filter(c => c.status === "Active").length },
          { label: "Premium", value: clients.filter(c => c.status === "Premium").length },
          { label: "Total Spent", value: `PKR ${(clients.reduce((sum, c) => sum + (c.paymentsMade || 0), 0) / 1000).toFixed(0)}K` },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#212631] rounded-xl border border-slate-700/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={clients}
        loading={loading}
        searchPlaceholder="Search clients..."
        actions={(row) => (
          <>
            <button onClick={() => { setSelectedClient(row); setIsViewOpen(true); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"><Eye size={16} /></button>
            <button onClick={() => handleStatusToggle(row)} className={`p-2 rounded text-slate-400 transition-colors ${row.status === "Active" ? "hover:bg-red-500/20 hover:text-red-400" : "hover:bg-emerald-500/20 hover:text-emerald-400"}`}><Ban size={16} /></button>
            <button onClick={() => handleEdit(row)} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"><Edit size={16} /></button>
            <button onClick={() => { setSelectedClient(row); setIsDeleteOpen(true); }} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
          </>
        )}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedClient ? "Edit Client" : "Add New Client"} size="md"
        footer={<><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit}>{selectedClient ? "Update" : "Create"}</Button></>}
      >
        <div className="space-y-4">
          <FormInput label="Name" placeholder="Enter name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <FormInput label="Email" type="email" placeholder="Enter email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <FormInput label="City" placeholder="Enter city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
          <FormSelect label="Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} options={[{ value: "Individual", label: "Individual" }, { value: "Business", label: "Business" }, { value: "Agency", label: "Agency" }, { value: "Startup", label: "Startup" }]} />
          <FormSelect label="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={[{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }, { value: "Premium", label: "Premium" }]} />
        </div>
      </Modal>

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Client Details" size="lg">
        {selectedClient && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img src={selectedClient.avatar} alt={selectedClient.name} className="w-20 h-20 rounded-full object-cover border-2 border-slate-700" />
              <div>
                <h3 className="text-lg font-bold text-slate-100">{selectedClient.name}</h3>
                <p className="text-sm text-slate-400">{selectedClient.email}</p>
                <div className="flex gap-2 mt-2">
                  <StatusBadge status={selectedClient.status} />
                  <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300">{selectedClient.type}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "City", value: selectedClient.city },
                { label: "Joined", value: selectedClient.joined },
                { label: "Projects Posted", value: selectedClient.projectsPosted },
                { label: "Total Payments", value: `PKR ${selectedClient.paymentsMade?.toLocaleString()}` },
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

      <ConfirmDialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete} title="Delete Client" message={`Are you sure you want to delete "${selectedClient?.name}"?`} />
    </div>
  );
};

export default AllClients;
