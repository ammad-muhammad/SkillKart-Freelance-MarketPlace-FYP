
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCMSAuth } from "../../auth/CMSAuthContext";
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

const AdminLogin = () => {
    const { loginAdmin } = useCMSAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/admin";

    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const res = loginAdmin(formData.username, formData.password);
        if (res.success) {
            navigate(from, { replace: true });
        } else {
            setError("Access Denied: Invalid Credentials");
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
                
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal Access</h1>
                    <p className="text-zinc-500 text-sm mt-2">Restricted Area. Authorized Personnel Only.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase tracking-wider">Username ID</label>
                        <input 
                            type="text" 
                            className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors placeholder:text-zinc-700"
                            placeholder="Enter system ID"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase tracking-wider">Secure Key</label>
                        <input 
                            type="password" 
                            className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors placeholder:text-zinc-700"
                            placeholder="••••••••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors mt-4 flex items-center justify-center gap-2"
                    >
                        <ShieldCheck size={18} />
                        Authenticate
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-zinc-600 font-mono">
                        SYSTEM ID: 92X-SECURE-NODE <br/>
                        IP LOGGING ENABLED
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
