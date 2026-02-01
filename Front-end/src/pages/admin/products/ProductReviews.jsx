import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Eye } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import Modal from "../../../Components/admin/Modal";
import { adminService } from "../../../services/adminService";

const ProductReviews = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getProducts("Approved");
        if (res.success) setProducts(res.data.filter(p => p.rating > 0));
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { header: "Product", accessor: "title", render: (value, row) => (<div><p className="text-sm font-semibold text-slate-100">{value}</p><p className="text-xs text-slate-500">{row.seller}</p></div>) },
    { header: "Category", accessor: "category", render: (value) => <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300">{value}</span> },
    { header: "Sales", accessor: "sales", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    {
      header: "Rating",
      accessor: "rating",
      render: (value) => (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} size={14} className={star <= Math.round(value) ? "text-yellow-400 fill-yellow-400" : "text-slate-600"} />
          ))}
          <span className="text-sm text-slate-300 ml-1">{value.toFixed(1)}</span>
        </div>
      ),
    },
  ];

  const avgRating = products.length ? (products.reduce((sum, p) => sum + p.rating, 0) / products.length).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Product Reviews</motion.h1>
        <p className="text-slate-500 text-sm mt-1">Monitor product ratings and customer feedback</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#212631] rounded-xl border border-yellow-500/20 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-yellow-500/10"><Star className="text-yellow-400 fill-yellow-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-yellow-400">{avgRating}</p><p className="text-xs text-slate-500 uppercase tracking-wider">Avg Rating</p></div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Products with Reviews</p>
          <p className="text-2xl font-bold text-slate-100">{products.length}</p>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Reviews</p>
          <p className="text-2xl font-bold text-slate-100">{products.reduce((sum, p) => sum + p.sales, 0)}</p>
        </div>
      </div>

      <DataTable columns={columns} data={products} loading={loading} searchPlaceholder="Search products..."
        actions={(row) => (<button onClick={() => { setSelectedProduct(row); setIsViewOpen(true); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors"><Eye size={16} /></button>)}
      />

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Product Review Details" size="md">
        {selectedProduct && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">{selectedProduct.title}</h3>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (<Star key={star} size={24} className={star <= Math.round(selectedProduct.rating) ? "text-yellow-400 fill-yellow-400" : "text-slate-600"} />))}
              <span className="text-xl font-bold text-slate-200 ml-2">{selectedProduct.rating.toFixed(1)}</span>
            </div>
            <p className="text-sm text-slate-400">Based on {selectedProduct.sales} purchases</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductReviews;
