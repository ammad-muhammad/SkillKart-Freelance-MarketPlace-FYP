import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  FileText,
  Home,
  Users,
  Phone,
  HelpCircle,
  Shield,
  Scale,
  LogIn,
  UserPlus,
  Image,
  Settings,
  Layers,
  Menu as MenuIcon,
  Navigation,
  SquareStack,
  MousePointer,
  CreditCard,
  FormInput,
  Sliders,
  Megaphone,
  BarChart3
} from "lucide-react";

// ====================================================================
// CMS SIDEBAR - Navigation for CMS Dashboard
// Matches Admin Dashboard theme and structure
// ====================================================================

// Sidebar navigation items
const NAV_ITEMS = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    children: [
      { label: "Overview", path: "/cms", icon: LayoutDashboard },
      { label: "Content Stats", path: "/cms/stats", icon: BarChart3 }
    ]
  },
  {
    label: "Pages",
    icon: FileText,
    children: [
      { label: "Home", path: "/cms/pages/home", icon: Home },
      { label: "About", path: "/cms/pages/about", icon: Users },
      { label: "How It Works", path: "/cms/pages/howitworks", icon: HelpCircle },
      { label: "Contact", path: "/cms/pages/contact", icon: Phone },
      { label: "Privacy Policy", path: "/cms/pages/privacypolicy", icon: Shield },
      { label: "Terms of Service", path: "/cms/pages/termsofservice", icon: Scale },
      { label: "Login", path: "/cms/pages/login", icon: LogIn },
      { label: "Register", path: "/cms/pages/register", icon: UserPlus }
    ]
  },
  {
    label: "Components",
    icon: Layers,
    children: [
      { label: "Navbar", path: "/cms/components/navbar", icon: Navigation },
      { label: "Footer", path: "/cms/components/footer", icon: SquareStack },
      { label: "Buttons", path: "/cms/components/buttons", icon: MousePointer },
      { label: "Cards", path: "/cms/components/cards", icon: CreditCard },
      { label: "Forms", path: "/cms/components/forms", icon: FormInput },
      { label: "Sliders", path: "/cms/components/sliders", icon: Sliders },
      { label: "CTAs", path: "/cms/components/ctas", icon: Megaphone }
    ]
  },
  {
    label: "Media Manager",
    icon: Image,
    path: "/cms/media"
  },
  {
    label: "Forms",
    icon: FormInput,
    path: "/cms/forms"
  },
  {
    label: "Settings",
    icon: Settings,
    path: "/cms/settings"
  }
];

// Sidebar Item Component
const SidebarItem = ({ item, isSidebarOpen, location }) => {
  const hasChildren = item.children && item.children.length > 0;
  const isDirectActive = item.path === location.pathname;
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

  // For items without children (direct links)
  if (!hasChildren) {
    return (
      <div className="mb-1">
        <Link
          to={item.path}
          className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
          ${isDirectActive
            ? "bg-[#2a303d] text-white"
            : "text-slate-400 hover:bg-[#2a303d] hover:text-slate-200"
          }`}
          title={!isSidebarOpen ? item.label : ""}
        >
          <item.icon size={18} className={`shrink-0 ${isDirectActive ? "text-[#204ecf]" : "text-slate-500 group-hover:text-slate-300"}`} />

          {isSidebarOpen && (
            <span className="flex-1 text-left text-sm font-medium whitespace-nowrap">
              {item.label}
            </span>
          )}
        </Link>
      </div>
    );
  }

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
                    className={`flex items-center gap-2 py-2 px-2.5 text-xs font-medium rounded-md transition-all ${isActive
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

// Main Sidebar Component
const CMSSidebar = ({ isSidebarOpen, setIsSidebarOpen, isMobile = false, onClose }) => {
  const location = useLocation();

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50 bg-[#1b2029]">
        <Link to="/cms" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#204ecf] to-[#1a3db3] flex items-center justify-center text-white font-bold text-sm shadow-lg">
            S
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-wide text-white">
                SKILL<span className="text-[#204ecf]">KART</span>
              </span>
              <span className="text-[10px] text-slate-500 -mt-0.5">CMS Dashboard</span>
            </div>
          )}
        </Link>
        {isSidebarOpen && !isMobile && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronDown size={16} className="rotate-90" />
          </button>
        )}
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400"
          >
            <MenuIcon size={20} />
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
        <Link
          to="/"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors
            ${!isSidebarOpen ? "justify-center" : ""}`}
        >
          <Home size={16} className="shrink-0" />
          {isSidebarOpen && <span className="text-sm font-medium">Back to Website</span>}
        </Link>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        exit={{ x: -280 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#212631] border-r border-slate-700/50 flex flex-col"
      >
        {sidebarContent}
      </motion.aside>
    );
  }

  return (
    <aside
      className={`hidden lg:flex fixed inset-y-0 left-0 z-50 bg-[#212631] border-r border-slate-700/50 flex-col transition-all duration-300 
      ${isSidebarOpen ? "w-64" : "w-16"}`}
    >
      {sidebarContent}
    </aside>
  );
};

export default CMSSidebar;
