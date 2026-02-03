import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Bell,
  Search,
  X,
  Save,
  Clock
} from "lucide-react";
import CMSSidebar from "./CMSSidebar";
import { CMSProvider, useCMS } from "../context/CMSContext";
import { formatDate } from "../utils/cmsHelpers";

// ====================================================================
// CMS LAYOUT - Main Layout Component for CMS Dashboard
// Matches Admin Dashboard theme with same colors and styling
// ====================================================================

// Header Component
const CMSHeader = ({ isSidebarOpen, setIsSidebarOpen, setIsMobileMenuOpen }) => {
  const { lastSaved } = useCMS();

  return (
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
            placeholder="Search content..."
            className="bg-transparent border-none outline-none text-xs w-full placeholder:text-slate-600 text-slate-200"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Last Saved Indicator */}
        {lastSaved && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} />
            <span>Saved {formatDate(lastSaved)}</span>
          </div>
        )}

        {/* Save Button */}
        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#204ecf] hover:bg-[#1a3db3] text-white text-xs font-medium rounded-lg transition-colors">
          <Save size={14} />
          <span className="hidden sm:inline">Save All</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-[#2a303d] text-slate-400 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-700/50">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-slate-200">CMS Editor</p>
            <p className="text-[10px] text-slate-500">Content Manager</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#204ecf] to-[#1a3db3] flex items-center justify-center text-white font-bold text-xs">
            CM
          </div>
        </div>
      </div>
    </header>
  );
};

// Main Layout Component (Inner)
const CMSLayoutInner = () => {
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
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#151b23] font-sans text-slate-100">
      {/* Desktop Sidebar */}
      <CMSSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Mobile Sidebar */}
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
            <CMSSidebar
              isSidebarOpen={true}
              setIsSidebarOpen={setIsSidebarOpen}
              isMobile={true}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`lg:transition-all lg:duration-300 ${isSidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>
        {/* Header */}
        <CMSHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* Page Content */}
        <main className="p-4 lg:p-6 min-h-[calc(100vh-3.5rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Wrapper with CMS Provider
const CMSLayout = () => {
  return (
    <CMSProvider>
      <CMSLayoutInner />
    </CMSProvider>
  );
};

export default CMSLayout;
