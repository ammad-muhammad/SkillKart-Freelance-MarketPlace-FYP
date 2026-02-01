import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  CheckCircle, 
  XCircle,
  Loader2,
  ChevronDown,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminService } from "../../services/adminService";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null); // For dropdown actions

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers(roleFilter);
      if (res.success) {
        setUsers(res.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  // Handle Delete
  const handleDelete = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
       const res = await adminService.deleteUser(userId);
       if (res.success) {
         setUsers(users.filter(u => u.id !== userId));
       }
    }
  };

  // Filtered Data
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-wide">User Management</h1>
          <p className="text-slate-500 text-sm">Manage freelancers, clients, and administrators.</p>
        </div>
        <button className="px-4 py-2 bg-[#204ecf] text-white rounded-md text-sm font-medium hover:bg-blue-600 flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
             <UserPlus size={16} /> Add New User
        </button>
      </div>

      {/* 2. Controls */}
      <div className="bg-[#212631] p-4 rounded-lg border border-slate-700/50 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-96">
           <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
           <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1b2029] border border-slate-700/50 rounded pl-10 pr-4 py-2 text-slate-200 placeholder:text-slate-600 focus:border-[#204ecf] outline-none transition-colors"
           />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="relative group">
              <button className="px-4 py-2 bg-[#1b2029] border border-slate-700/50 rounded text-slate-300 flex items-center gap-2 text-sm font-medium hover:border-slate-600 transition-colors">
                 <Filter size={16} /> {roleFilter} Roles <ChevronDown size={14} />
              </button>
              {/* Dropdown */}
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#212631] border border-slate-700/50 rounded shadow-xl z-20 hidden group-hover:block animate-fade-in">
                 {['All', 'Freelancer', 'Client', 'Admin'].map(role => (
                    <button 
                      key={role}
                      onClick={() => setRoleFilter(role)}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-[#2a303d] transition-colors"
                    >
                      {role}
                    </button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-[#212631] rounded-lg border border-slate-700/50 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
           <div className="flex flex-col items-center justify-center h-[400px] text-slate-500">
              <Loader2 size={40} className="animate-spin mb-4" />
              <p>Loading Users...</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#2a303d] text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-700/50">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Current Projects</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                <AnimatePresence>
                  {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                           No users found matching your search.
                        </td>
                      </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <motion.tr 
                        key={user.id} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-[#2a303d]/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                            <div>
                              <p className="text-sm font-bold text-slate-100">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                              ${user.role === 'Freelancer' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                                user.role === 'Client' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                              {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             {user.status === 'Verified' && <CheckCircle size={14} className="text-green-500" />}
                             {user.status === 'Suspended' && <XCircle size={14} className="text-red-500" />}
                             {user.status === 'Pending' && <div className="w-3.5 h-3.5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>}
                             <span className={`text-sm ${
                               user.status === 'Verified' ? 'text-green-400' : 
                               user.status === 'Suspended' ? 'text-red-400' : 'text-yellow-400'
                             }`}>{user.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="w-full max-w-[100px] h-1.5 bg-[#1b2029] rounded-full overflow-hidden">
                              <div className="h-full bg-slate-500 w-[60%] rounded-full"></div>
                           </div>
                           <span className="text-[10px] text-slate-500 mt-1 block">3 Active Jobs</span>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400 transition-colors" title="Edit">
                                <Edit size={16} />
                             </button>
                             <button 
                                onClick={() => handleDelete(user.id)}
                                className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors" 
                                title="Delete"
                              >
                                <Trash2 size={16} />
                             </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;