import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import DataTable from "../../../Components/admin/DataTable";
import StatusBadge from "../../../Components/admin/StatusBadge";
import { adminService } from "../../../services/adminService";

const ProductTransactions = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminService.getProductPayments();
        if (res.success) setPayments(res.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { header: "Transaction", accessor: "id", render: (value, row) => (<div><p className="text-sm font-semibold text-slate-100">{value}</p><p className="text-xs text-slate-500">{row.date}</p></div>) },
    { header: "Product", accessor: "productId", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Buyer", accessor: "from", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Seller", accessor: "to", render: (value) => <span className="text-sm text-slate-300">{value}</span> },
    { header: "Amount", accessor: "amount", render: (value) => <span className="text-sm text-emerald-400 font-bold">PKR {value.toLocaleString()}</span> },
    { header: "Status", accessor: "status", render: (value) => <StatusBadge status={value} /> },
  ];

  const stats = { total: payments.reduce((sum, p) => sum + p.amount, 0), count: payments.length };

  return (
    <div className="space-y-6">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-slate-100">Product Transactions</motion.h1>
        <p className="text-slate-500 text-sm mt-1">All digital product sales transactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#212631] rounded-xl border border-emerald-500/20 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10"><ShoppingBag className="text-emerald-400" size={24} /></div>
          <div><p className="text-2xl font-bold text-emerald-400">PKR {(stats.total / 1000).toFixed(0)}K</p><p className="text-xs text-slate-500 uppercase tracking-wider">Total Sales</p></div>
        </div>
        <div className="bg-[#212631] rounded-xl border border-slate-700/50 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Transactions</p>
          <p className="text-2xl font-bold text-slate-100">{stats.count}</p>
        </div>
      </div>

      <DataTable columns={columns} data={payments} loading={loading} searchPlaceholder="Search transactions..." />
    </div>
  );
};

export default ProductTransactions;
