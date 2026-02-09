
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCMSAuth } from "../../auth/CMSAuthContext";
import { Layers, FileEdit, AlertCircle } from 'lucide-react';

const CMSLogin = () => {
    const { loginCMS } = useCMSAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/cms";

    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const res = loginCMS(formData.username, formData.password);
        if (res.success) {
            navigate(from, { replace: true });
        } else {
            setError("Access Denied: Invalid Content Manager Credentials");
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700/50">
                        <Layers className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Content Core Access</h1>
                    <p className="text-zinc-500 text-sm mt-2">SkillKart Content Management System</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase tracking-wider">Editor ID</label>
                        <input 
                            type="text" 
                            className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700"
                            placeholder="cms_editor"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase tracking-wider">Access Key</label>
                        <input 
                            type="password" 
                            className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700"
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
                        <FileEdit size={18} />
                        Access Dashboard
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-zinc-600 font-mono">
                        SYSTEM ID: X91-CONTENT-NODE <br/>
                        SECURE SESSION
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CMSLogin;
