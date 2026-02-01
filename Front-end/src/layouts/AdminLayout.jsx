import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Settings, 
  LogOut, 
  Menu, 
  Bell, 
  Search,
  ChevronRight,
  ChevronDown,
  CreditCard,
  BarChart3,
  Shield,
  UserCheck,
  FileCheck,
  Package,
  Star,
  DollarSign,
  Wallet,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  Brain,
  TrendingUp,
  BadgeDollarSign,
  Gavel,
  ShoppingBag,
  ClipboardList,
  Award,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- SIDEBAR DATA (Comprehensive Navigation) ---
const NAV_ITEMS = [
  { 
    label: "Dashboard", 
    icon: LayoutDashboard, 
    children: [
      { label: "Overview", path: "/admin", icon: LayoutDashboard },
      { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    ]
  },
  { 
    label: "Freelancers", 
    icon: Users, 
    children: [
      { label: "All Freelancers", path: "/admin/freelancers", icon: Users },
      { label: "Verified Freelancers", path: "/admin/freelancers/verified", icon: UserCheck },
      { label: "Skill Tests", path: "/admin/freelancers/skill-tests", icon: FileCheck },
      { label: "Freelancer Gigs", path: "/admin/freelancers/gigs", icon: Briefcase },
      { label: "Freelancer Projects", path: "/admin/freelancers/projects", icon: ClipboardList },
      { label: "Rankings & Visibility", path: "/admin/freelancers/rankings", icon: Award },
      { label: "Freelancer Payments", path: "/admin/freelancers/payments", icon: DollarSign },
      { label: "Freelancer Disputes", path: "/admin/freelancers/disputes", icon: AlertTriangle },
    ]
  },
  { 
    label: "Clients", 
    icon: UserCheck, 
    children: [
      { label: "All Clients", path: "/admin/clients", icon: Users },
      { label: "Client Projects", path: "/admin/clients/projects", icon: ClipboardList },
      { label: "Payments", path: "/admin/clients/payments", icon: DollarSign },
      { label: "Client Disputes", path: "/admin/clients/disputes", icon: AlertTriangle },
    ]
  },
  { 
    label: "Product Sellers", 
    icon: ShoppingBag, 
    children: [
      { label: "Products List", path: "/admin/products", icon: Package },
      { label: "Product Reviews", path: "/admin/products/reviews", icon: Star },
      { label: "Product Approvals", path: "/admin/products/approvals", icon: CheckCircle },
      { label: "Product Payments", path: "/admin/products/payments", icon: DollarSign },
    ]
  },
  { 
    label: "Transactions", 
    icon: CreditCard, 
    children: [
      { label: "Freelance Payments", path: "/admin/transactions/freelance", icon: DollarSign },
      { label: "Product Payments", path: "/admin/transactions/products", icon: BadgeDollarSign },
      { label: "Withdrawals", path: "/admin/transactions/withdrawals", icon: Wallet },
    ]
  },
  { 
    label: "Disputes & Reviews", 
    icon: Gavel, 
    children: [
      { label: "Active Disputes", path: "/admin/disputes/active", icon: AlertTriangle },
      { label: "Resolved Disputes", path: "/admin/disputes/resolved", icon: CheckCircle },
      { label: "Refund Decisions", path: "/admin/disputes/refunds", icon: RefreshCcw },
    ]
  },
  { 
    label: "AI Assistance", 
    icon: Brain, 
    children: [
      { label: "AI Recommendations", path: "/admin/ai/recommendations", icon: Brain },
      { label: "Skill Demand", path: "/admin/ai/skill-demand", icon: TrendingUp },
      { label: "Pricing Suggestions", path: "/admin/ai/pricing", icon: BadgeDollarSign },
    ]
  },
  { 
    label: "System Settings", 
    icon: Settings, 
    children: [
      { label: "Platform Rules", path: "/admin/settings/platform", icon: Gavel },
      { label: "Verification Rules", path: "/admin/settings/verification", icon: Shield },
      { label: "Payment Rules", path: "/admin/settings/payments", icon: CreditCard },
    ]
  },
];

const SidebarItem = ({ item, isSidebarOpen, location }) => {
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children.some(child => location.pathname === child.path);
  const [isOpen, setIsOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) setIsOpen(true);
  }, [isChildActive]);

  const toggleOpen = (e) => {
    if (hasChildren) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="mb-1">
      <button
        onClick={toggleOpen}
        className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
        ${(hasChildren && isOpen) || isChildActive
          ? "bg-[#2a303d] text-white" 
          : "text-slate-400 hover:bg-[#2a303d] hover:text-slate-200"
        }`}
        title={!isSidebarOpen ? item.label : ""}
      >
        <item.icon size={18} className={`shrink-0 ${isChildActive ? "text-[#204ecf]" : "text-slate-500 group-hover:text-slate-300"}`} />
        
        {isSidebarOpen && (
          <span className="flex-1 text-left text-sm font-medium whitespace-nowrap">
            {item.label}
          </span>
        )}

        {hasChildren && isSidebarOpen && (
           <motion.div 
             animate={{ rotate: isOpen ? 90 : 0 }}
             transition={{ duration: 0.2 }}
             className="text-slate-500"
           >
             <ChevronRight size={14} />
           </motion.div>
        )}
      </button>

      {/* Submenu */}
      <AnimatePresence>
        {hasChildren && isOpen && isSidebarOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-3 border-l border-slate-700/50 mt-1 space-y-0.5">
              {item.children.map((child) => {
                const isActive = location.pathname === child.path;
                return (
                  <Link
                    key={child.label}
                    to={child.path}
                    className={`flex items-center gap-2 py-2 px-2.5 text-xs font-medium rounded-md transition-all ${
                      isActive 
                        ? "text-[#204ecf] bg-[#204ecf]/10 border-l-2 border-[#204ecf] -ml-[1px]" 
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <child.icon size={13} />
                    <span className="truncate">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#151b23] font-sans text-slate-100">
      
      {/* --- SIDEBAR (Desktop) --- */}
      <aside 
        className={`hidden lg:flex fixed inset-y-0 left-0 z-50 bg-[#212631] border-r border-slate-700/50 flex-col transition-all duration-300 
        ${isSidebarOpen ? "w-64" : "w-16"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50 bg-[#1b2029]">
          <Link to="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#204ecf] to-[#1a3db3] flex items-center justify-center text-white font-bold text-sm shadow-lg">
              S
            </div>
            {isSidebarOpen && (
              <span className="text-base font-bold tracking-wide text-white">
                SKILL<span className="text-[#204ecf]">KART</span>
              </span>
            )}
          </Link>
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronDown size={16} className="rotate-90" />
            </button>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {NAV_ITEMS.map((item) => (
            <SidebarItem 
              key={item.label} 
              item={item} 
              isSidebarOpen={isSidebarOpen} 
              location={location}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/50 bg-[#1b2029]">
          <button className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors
            ${!isSidebarOpen ? "justify-center" : ""}`}
          >
            <LogOut size={16} className="shrink-0" />
            {isSidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* --- MOBILE SIDEBAR --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            {/* Mobile Sidebar */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#212631] border-r border-slate-700/50 flex flex-col"
            >
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50 bg-[#1b2029]">
                <Link to="/admin" className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#204ecf] to-[#1a3db3] flex items-center justify-center text-white font-bold text-sm">
                    S
                  </div>
                  <span className="text-base font-bold tracking-wide text-white">
                    SKILL<span className="text-[#204ecf]">KART</span>
                  </span>
                </Link>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 py-3 px-2 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                  <SidebarItem 
                    key={item.label} 
                    item={item} 
                    isSidebarOpen={true} 
                    location={location}
                  />
                ))}
              </nav>

              {/* Footer */}
              <div className="p-3 border-t border-slate-700/50 bg-[#1b2029]">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                  <LogOut size={16} />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- MAIN CONTENT --- */}
      <div className={`lg:transition-all lg:duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
        
        {/* Header */}
        <header className="h-14 bg-[#212631] sticky top-0 z-40 border-b border-slate-700/50 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[#2a303d] text-slate-400"
            >
              <Menu size={20} />
            </button>

            {/* Desktop Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex p-2 -ml-2 rounded-lg hover:bg-[#2a303d] text-slate-400 transition-colors"
            >
              <Menu size={18} />
            </button>
            
            {/* Search Bar */}
            <div className="hidden md:flex items-center gap-2 bg-[#1b2029] px-3 py-1.5 rounded-lg border border-slate-700/50 focus-within:border-[#204ecf]/50 transition-all w-64 lg:w-72">
              <Search size={14} className="text-slate-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-xs w-full placeholder:text-slate-600 text-slate-200" 
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-[#2a303d] text-slate-400 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            {/* User */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-700/50">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-slate-200">Admin</p>
                <p className="text-[10px] text-slate-500">Super Admin</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#204ecf] to-[#1a3db3] flex items-center justify-center text-white font-bold text-xs">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 min-h-[calc(100vh-3.5rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
