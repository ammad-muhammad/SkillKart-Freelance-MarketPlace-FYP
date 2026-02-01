import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Eye, Clock, Package } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import Modal, { Button } from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const ProductApprovals = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getProducts();
        if (res.success) setProducts(res.data.filter(p => p.status === "Pending" || p.status === "Under Review"));
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
      if (res.success) setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await adminService.rejectProduct(id);
      if (res.success) setProducts(products.filter(p => p.id !== id));
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
          <div className="w-10 h-10 rounded-lg bg-[#1b2029] flex items-center justify-center"><Package size={18} className="text-slate-400" /></div>
          <div><p className="text-sm font-semibold text-slate-100">{value}</p><p className="text-xs text-slate-500">{row.id}</p></div>
        </div>
      ),
    },
    { header: "Seller", accessor: "seller", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Category", accessor: "category", render: (value) => <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300">{value}</span> },
    { header: "Price", accessor: "price", render: (value) => <span className="text-sm text-emerald-400 font-medium">PKR {value?.toLocaleString()}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
    { header: "Submitted", accessor: "createdAt", render: (value) => <span className="text-sm text-slate-400">{value}</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Product Approvals</motion.h1>
        <p className="text-slate-500 text-sm mt-1">Review and approve product submissions</p>
      </div>

      <div className="bg-[#212631] rounded-xl border border-yellow-500/20 p-4 flex items-center gap-4">
        <div className="p-3 rounded-lg bg-yellow-500/10"><Clock className="text-yellow-400" size={24} /></div>
        <div><p className="text-2xl font-bold text-yellow-400">{products.length}</p><p className="text-xs text-slate-500 uppercase tracking-wider">Pending Approvals</p></div>
      </div>

      {products.length === 0 && !loading ? (
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-12 text-center">
          <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-100 mb-2">All Caught Up!</h3>
          <p className="text-slate-400">No products pending approval at the moment.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={products} loading={loading} searchPlaceholder="Search pending products..."
          actions={(row) => (
            <>
              <button onClick={() => { setSelectedProduct(row); setIsViewOpen(true); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"><Eye size={16} /></button>
              <button onClick={() => handleApprove(row.id)} className="p-2 hover:bg-emerald-500/20 rounded text-slate-400 hover:text-emerald-400 transition-colors" title="Approve"><CheckCircle size={16} /></button>
              <button onClick={() => handleReject(row.id)} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors" title="Reject"><XCircle size={16} /></button>
            </>
          )}
        />
      )}

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Review Product" size="lg"
        footer={<><Button variant="danger" onClick={() => { handleReject(selectedProduct?.id); setIsViewOpen(false); }}>Reject</Button><Button onClick={() => { handleApprove(selectedProduct?.id); setIsViewOpen(false); }}>Approve</Button></>}
      >
        {selectedProduct && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">{selectedProduct.title}</h3>
            <div className="grid grid-cols-2 gap-4">
              {[{ label: "Seller", value: selectedProduct.seller }, { label: "Category", value: selectedProduct.category }, { label: "Price", value: `PKR ${selectedProduct.price?.toLocaleString()}` }, { label: "Submitted", value: selectedProduct.createdAt }].map((item) => (
                <div key={item.label} className="bg-[#1b2029] p-4 rounded-lg"><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{item.label}</p><p className="text-sm font-medium text-slate-200">{item.value}</p></div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductApprovals;
