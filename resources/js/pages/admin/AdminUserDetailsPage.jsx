import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminUserDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        is_admin: false,
        is_active: true
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`/api/admin/users/${id}`);
                setUser(res.data);
                setFormData({
                    name: res.data.name || '',
                    email: res.data.email || '',
                    phone: res.data.phone || '',
                    is_admin: res.data.is_admin || false,
                    is_active: res.data.is_active || false
                });
            } catch (err) {
                console.error(err);
                setMessage('Failed to load user data.');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await axios.put(`/api/admin/users/${id}`, formData);
            setMessage('Profile updated successfully.');
            // Refresh local user data
            const res = await axios.get(`/api/admin/users/${id}`);
            setUser(res.data);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-[10px] tracking-[0.3em] font-black text-zinc-500 uppercase">Accessing Files...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center gap-4">
                <p className="text-[10px] tracking-[0.3em] font-black text-zinc-500 uppercase">User Not Found</p>
                <button onClick={() => navigate('/admin/users')} className="text-emerald-500 text-xs font-bold uppercase tracking-widest hover:underline">Return to Registry</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-zinc-400 font-sans pb-20">
            <div className="max-w-7xl mx-auto px-6 pt-12">
                {/* Header Section */}
                <div className="mb-12">
                    <button 
                        onClick={() => navigate('/admin/users')}
                        className="group flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase text-zinc-600 hover:text-emerald-500 transition-colors mb-8"
                    >
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="15 19l-7-7 7-7" />
                        </svg>
                        Back to Registry
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-[1px] w-8 bg-emerald-500/50"></div>
                                <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-emerald-500/80">
                                    User Profile #{user.id}
                                </span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.85] mb-6 uppercase">
                                {user.name}<span className="text-emerald-500">.</span>
                            </h1>
                            <div className="flex items-center gap-4 border-l border-zinc-800 pl-4">
                                <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border ${user.is_admin ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-zinc-800 text-zinc-500'}`}>
                                    {user.is_admin ? 'Admin' : 'User'}
                                </span>
                                <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border ${user.is_active ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' : 'border-red-900 text-red-500 bg-red-500/5'}`}>
                                    {user.is_active ? 'Active' : 'Deactivated'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className="mb-8 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[11px] uppercase tracking-widest font-bold px-6 py-4 rounded-xl flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        {message}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Edit Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-3xl backdrop-blur-sm sticky top-8">
                            <h2 className="text-[10px] tracking-[0.3em] font-black text-white uppercase mb-8 pb-4 border-b border-zinc-800">USER INFORMATION</h2>
                            <form className="space-y-6">
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        readOnly
                                        className="w-full bg-zinc-950/20 border border-zinc-800/30 text-[11px] font-bold text-zinc-500 rounded-xl px-4 py-3 cursor-not-allowed select-none transition-all"
                                    />
                                    <p className="mt-2 text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] leading-relaxed italic">
                                        Personal details are locked for data integrity.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        readOnly
                                        className="w-full bg-zinc-950/20 border border-zinc-800/30 text-[11px] font-bold text-zinc-500 rounded-xl px-4 py-3 cursor-not-allowed select-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        readOnly
                                        className="w-full bg-zinc-950/20 border border-zinc-800/30 text-[11px] font-bold text-zinc-500 rounded-xl px-4 py-3 cursor-not-allowed select-none transition-all"
                                        placeholder="NOT SET"
                                    />
                                </div>
                                
                                <div className="pt-4 space-y-4">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Account Access</h3>
                                    
                                    <div className="flex flex-col gap-3">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const newRole = user.is_admin ? 'user' : 'admin';
                                                try {
                                                    await axios.post(`/api/admin/users/${id}/assign-role`, { role: newRole });
                                                    window.location.reload();
                                                } catch (err) {
                                                    setMessage(err.response?.data?.message || 'Failed to update role.');
                                                }
                                            }}
                                            className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                user.is_admin 
                                                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white' 
                                                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black'
                                            }`}
                                        >
                                            {user.is_admin ? 'DEMOTE TO MEMBER' : 'PROMOTE TO OFFICER'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await axios.post(`/api/admin/users/${id}/toggle-active`);
                                                    window.location.reload();
                                                } catch (err) {
                                                    setMessage(err.response?.data?.message || 'Failed to update status.');
                                                }
                                            }}
                                            className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                user.is_active 
                                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                                                    : 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white'
                                            }`}
                                        >
                                            {user.is_active ? 'SUSPEND ACCESS' : 'RESTORE ACCESS'}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-zinc-800/50">
                                    <p className="text-[9px] font-bold text-zinc-600 leading-relaxed uppercase tracking-widest italic">
                                        Admins may exclusively manage system permissions and operational status. Profile identity must be managed by the owner.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Activity Logs & Stats */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl">
                                <p className="text-[9px] uppercase tracking-widest font-black text-zinc-600 mb-1">Total Bookings</p>
                                <div className="text-2xl font-black text-white">{user.bookings_count || 0}</div>
                            </div>
                            <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl text-center">
                                <p className="text-[9px] uppercase tracking-widest font-black text-zinc-600 mb-1">Status</p>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${user.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {user.is_active ? 'Operational' : 'Restricted'}
                                </span>
                            </div>
                            <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl hidden md:block">
                                <p className="text-[9px] uppercase tracking-widest font-black text-zinc-600 mb-1">System Joined</p>
                                <div className="text-sm font-black text-white uppercase tracking-tighter">
                                    {new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-sm">
                            <div className="px-8 py-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/20">
                                <h2 className="text-[10px] tracking-[0.3em] font-black text-white uppercase">ACTIVITY AUDIT LOG</h2>
                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Latest Transactions</span>
                            </div>
                            <div className="divide-y divide-zinc-800/50">
                                {user.activity_logs && user.activity_logs.length > 0 ? (
                                    user.activity_logs.map((log) => (
                                        <div key={log.id} className="px-8 py-6 hover:bg-white/[0.01] transition-all">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <p className="text-[11px] font-black text-white tracking-widest uppercase italic">
                                                    {log.action.replace('_', ' ')}
                                                </p>
                                                <span className="text-[9px] font-bold text-zinc-600 font-mono tracking-tighter uppercase whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString('en-PH')}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 leading-relaxed font-mono uppercase tracking-tight">
                                                {log.details || 'NO ADDITIONAL METADATA RECORDED'}
                                            </p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Entry ID:</span>
                                                <span className="text-[8px] font-mono text-zinc-800">#{log.id.toString().padStart(6, '0')}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <p className="text-[10px] tracking-[0.3em] font-black text-zinc-700 uppercase">NO RECENT ACTIVITY RECORDED</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminUserDetails;