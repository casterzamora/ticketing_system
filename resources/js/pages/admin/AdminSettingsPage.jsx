import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminSettingsPage = ({ onUpdateUser }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get('/api/user');
                setUser(res.data);
                setFormData(prev => ({
                    ...prev,
                    name: res.data.name || '',
                    username: res.data.username || '',
                    first_name: res.data.first_name || '',
                    last_name: res.data.last_name || '',
                    email: res.data.email || ''
                }));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await axios.put('/api/user/profile', formData);
            setMessage('Profile updated successfully.');
            
            const res = await axios.get('/api/user');
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
            if (onUpdateUser) onUpdateUser(res.data);

            setFormData(prev => ({
                ...prev,
                current_password: '',
                new_password: '',
                new_password_confirmation: ''
            }));
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
                <p className="text-[10px] tracking-[0.3em] font-black text-zinc-500 uppercase">Loading Profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-zinc-400 font-sans pb-20">
            <div className="max-w-4xl mx-auto px-6 pt-12">
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-[1px] w-8 bg-emerald-500/50"></div>
                        <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-emerald-500/80">
                            Account Settings
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.85] mb-6">
                        MY PROFILE<span className="text-emerald-500">.</span>
                    </h1>
                </div>

                {message && (
                    <div className="mb-8 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[11px] uppercase tracking-widest font-bold px-6 py-4 rounded-xl">
                        {message}
                    </div>
                )}

                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="divide-y divide-zinc-800/50">
                        {/* Basic Info */}
                        <div className="p-8 space-y-6">
                            <h2 className="text-[10px] tracking-[0.3em] font-black text-white uppercase">Profile Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Username (Handle)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50 font-mono text-[11px]">@</span>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                                            className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 pl-8 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                                            placeholder="username"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Display Name (Full Name)</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">First Name</label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Password Update */}
                        <div className="p-8 space-y-6">
                            <h2 className="text-[10px] tracking-[0.3em] font-black text-white uppercase">Security Update</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Current Password</label>
                                    <input
                                        type="password"
                                        value={formData.current_password}
                                        onChange={(e) => setFormData({...formData, current_password: e.target.value})}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">New Password</label>
                                        <input
                                            type="password"
                                            value={formData.new_password}
                                            onChange={(e) => setFormData({...formData, new_password: e.target.value})}
                                            className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={formData.new_password_confirmation}
                                            onChange={(e) => setFormData({...formData, new_password_confirmation: e.target.value})}
                                            className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-zinc-950/50">
                            <button
                                disabled={saving}
                                className="w-full md:w-auto px-12 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-emerald-500 transition-all duration-300 disabled:opacity-50"
                            >
                                {saving ? 'SAVING CHANGES...' : 'SAVE SETTINGS'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsPage;