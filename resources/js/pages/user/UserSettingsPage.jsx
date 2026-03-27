import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserSettingsPage = ({ onUpdateUser }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});
    
    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
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
                    username: res.data.username || '',
                    first_name: res.data.first_name || '',
                    last_name: res.data.last_name || '',
                    email: res.data.email || '',
                    phone: res.data.phone || ''
                }));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        setErrors({});
        
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
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {});
                setMessage('Please fix the errors below.');
            } else {
                setMessage(err.response?.data?.message || 'Failed to update profile.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-[11px] tracking-[0.3em] uppercase text-gray-400">
                    Loading your profile details...
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="page-card p-5 sm:p-6 mb-8">
                    <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-stone-300">
                        Account Settings
                    </p>
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none uppercase tracking-tight">
                            Personal Profile
                        </h1>
                        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                            Manage your public identity, contact information, and security preferences from one dashboard.
                        </p>
                    </div>
                </header>

                {message && (
                    <div className={`mb-8 p-4 rounded-md border text-sm ${
                        errors && Object.keys(errors).length > 0 
                        ? 'bg-red-900/10 border-red-500/20 text-red-400' 
                        : 'bg-emerald-900/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                        {message}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar / Identity Summary */}
                    <aside className="lg:col-span-1 space-y-6">
                        <div className="page-card p-6 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-4xl font-black text-white mb-4">
                                {user.first_name?.[0] || user.name?.[0] || 'U'}
                            </div>
                            <h3 className="text-xl font-bold text-white text-center">
                                {user.first_name || ''} {user.last_name || ''}
                            </h3>
                            <p className="text-xs text-zinc-500 font-mono mt-1 italic">
                                @{user.username || 'user'}
                            </p>
                            <div className="mt-6 w-full pt-6 border-t border-white/5">
                                <span className="block text-[10px] uppercase font-bold text-zinc-600 tracking-widest mb-3">Identity Status</span>
                                <div className="inline-flex px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                                    {user.roles?.[0]?.name || 'Member'}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Form Area */}
                    <div className="lg:col-span-3">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Section: Basic Identity */}
                            <section className="page-card p-6 sm:p-8">
                                <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-stone-300 mb-6 pb-2 border-b border-white/5">
                                    Public Identity
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">First Name</label>
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            className="w-full bg-[#1b1d20] border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                        />
                                        {errors.first_name && <p className="text-red-400 text-[10px] mt-1 italic">{errors.first_name[0]}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Last Name</label>
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            className="w-full bg-[#1b1d20] border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                        />
                                        {errors.last_name && <p className="text-red-400 text-[10px] mt-1 italic">{errors.last_name[0]}</p>}
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Username Handle</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                                            <input
                                                type="text"
                                                name="username"
                                                value={formData.username}
                                                onChange={handleChange}
                                                className="w-full bg-[#1b1d20] border border-white/10 rounded-md pl-8 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                            />
                                        </div>
                                        {errors.username && <p className="text-red-400 text-[10px] mt-1 italic">{errors.username[0]}</p>}
                                    </div>
                                </div>
                            </section>

                            {/* Section: Contact */}
                            <section className="page-card p-6 sm:p-8">
                                <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-stone-300 mb-6 pb-2 border-b border-white/5">
                                    Contact Information
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full bg-[#1b1d20] border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                        />
                                        {errors.email && <p className="text-red-400 text-[10px] mt-1 italic">{errors.email[0]}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Phone Number</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full bg-[#1b1d20] border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                        />
                                        {errors.phone && <p className="text-red-400 text-[10px] mt-1 italic">{errors.phone[0]}</p>}
                                    </div>
                                </div>
                            </section>

                            {/* Section: Security */}
                            <section className="page-card p-6 sm:p-8 bg-black/20">
                                <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-stone-300 mb-6 pb-2 border-b border-white/5">
                                    Security & Password
                                </h2>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Current Password</label>
                                        <input
                                            type="password"
                                            name="current_password"
                                            value={formData.current_password}
                                            onChange={handleChange}
                                            placeholder="Verify identity to change password"
                                            className="w-full bg-zinc-900 border border-white/5 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">New Password</label>
                                            <input
                                                type="password"
                                                name="new_password"
                                                value={formData.new_password}
                                                onChange={handleChange}
                                                className="w-full bg-zinc-900 border border-white/5 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Confirm Password</label>
                                            <input
                                                type="password"
                                                name="new_password_confirmation"
                                                value={formData.new_password_confirmation}
                                                onChange={handleChange}
                                                className="w-full bg-zinc-900 border border-white/5 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                            />
                                        </div>
                                    </div>
                                    {errors.new_password && <p className="text-red-400 text-[10px] mt-1 italic">{errors.new_password[0]}</p>}
                                </div>
                            </section>

                            {/* Action Row */}
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-10 py-3 rounded-full btn-primary-neutral text-[11px] font-bold tracking-[0.2em] uppercase disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                                >
                                    {saving ? 'Updating...' : 'Save Profile Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserSettingsPage;