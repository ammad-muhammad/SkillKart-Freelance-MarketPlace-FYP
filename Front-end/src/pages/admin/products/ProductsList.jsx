import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, CheckCircle, XCircle, Trash2, Package } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal from "../../../Components/admin/Modal";
import ConfirmDialog from "../../../Components/admin/ConfirmDialog";
import { adminService } from "../../../services/adminService";

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getProducts();
        if (res.success) setProducts(res.data);
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
      const res = await adminService.approveProduct(id);
      if (res.success) setProducts(products.map(p => p.id === id ? res.data : p));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await adminService.rejectProduct(id);
      if (res.success) setProducts(products.map(p => p.id === id ? res.data : p));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await adminService.deleteProduct(selectedProduct.id);
      if (res.success) setProducts(products.filter(p => p.id !== selectedProduct.id));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const columns = [
    {
      header: "Product",
      accessor: "title",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1b2029] flex items-center justify-center">
            <Package size={18} className="text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">{value}</p>
            <p className="text-xs text-slate-500">{row.id}</p>
          </div>
        </div>
      ),
    },
    { header: "Seller", accessor: "seller", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Category", accessor: "category", render: (value) => <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300">{value}</span> },
    { header: "Price", accessor: "price", render: (value) => <span className="text-sm text-emerald-400 font-medium">PKR {value?.toLocaleString()}</span> },
    { header: "Sales", accessor: "sales", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
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

  const stats = {
    total: products.length,
    approved: products.filter(p => p.status === "Approved").length,
    pending: products.filter(p => p.status === "Pending" || p.status === "Under Review").length,
    revenue: products.reduce((sum, p) => sum + (p.price * p.sales), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">
          Products List
        </motion.h1>
        <p className="text-slate-500 text-sm mt-1">Manage all digital products on SkillKart</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: stats.total, color: "slate" },
          { label: "Approved", value: stats.approved, color: "emerald" },
          { label: "Pending Review", value: stats.pending, color: "yellow" },
          { label: "Total Revenue", value: `PKR ${(stats.revenue / 1000).toFixed(0)}K`, color: "blue" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#212631] rounded-xl border border-slate-700/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        searchPlaceholder="Search products..."
        actions={(row) => (
          <>
            <button onClick={() => { setSelectedProduct(row); setIsViewOpen(true); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors">
              <Eye size={16} />
            </button>
            {(row.status === "Pending" || row.status === "Under Review") && (
              <>
                <button onClick={() => handleApprove(row.id)} className="p-2 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors" title="Approve">
                  <CheckCircle size={16} />
                </button>
                <button onClick={() => handleReject(row.id)} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors" title="Reject">
                  <XCircle size={16} />
                </button>
              </>
            )}
            <button onClick={() => { setSelectedProduct(row); setIsDeleteOpen(true); }} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
          </>
        )}
      />

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Product Details" size="lg">
        {selectedProduct && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-[#1b2029] flex items-center justify-center">
                <Package size={32} className="text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">{selectedProduct.title}</h3>
                <p className="text-sm text-slate-400">by {selectedProduct.seller}</p>
                <StatusBadge status={selectedProduct.status} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Category", value: selectedProduct.category },
                { label: "Price", value: `PKR ${selectedProduct.price?.toLocaleString()}` },
                { label: "Total Sales", value: selectedProduct.sales },
                { label: "Rating", value: selectedProduct.rating > 0 ? `★ ${selectedProduct.rating.toFixed(1)}` : "No ratings" },
                { label: "Created", value: selectedProduct.createdAt },
                { label: "Total Revenue", value: `PKR ${(selectedProduct.price * selectedProduct.sales).toLocaleString()}` },
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

      <ConfirmDialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete} title="Delete Product" message={`Are you sure you want to delete "${selectedProduct?.title}"?`} />
    </div>
  );
};

export default ProductsList;
