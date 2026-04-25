import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminSettingsPage = ({ onUpdateUser }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [policySaving, setPolicySaving] = useState(false);
    const [paymentSaving, setPaymentSaving] = useState(false);
    const [policy, setPolicy] = useState({
        refund_require_successful_payment: true,
        refund_allowed_event_status: 'cancelled',
        reschedule_refund_window_hours: 72,
        scanner_duplicate_window_seconds: 5,
        inventory_low_stock_threshold_pct: 85,
    });
    const [paymentMode, setPaymentMode] = useState('sandbox');
    const [paymentHealth, setPaymentHealth] = useState({
        mode: 'sandbox',
        ready: true,
        paymongo_configured: false,
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
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
                const [policyRes, paymentModeRes, paymentHealthRes] = await Promise.all([
                    axios.get('/api/admin/settings/policy'),
                    axios.get('/api/admin/settings/payment-mode'),
                    axios.get('/api/admin/payments/health'),
                ]);
                setUser(res.data);
                setPolicy(policyRes.data || {});
                setPaymentMode(paymentModeRes.data?.mode || 'sandbox');
                setPaymentHealth(paymentHealthRes.data || {});
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

    const handlePolicySubmit = async (e) => {
        e.preventDefault();
        setPolicySaving(true);
        setMessage('');
        try {
            await axios.put('/api/admin/settings/policy', policy);
            setMessage('Policy settings updated.');
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to update policy settings.');
        } finally {
            setPolicySaving(false);
        }
    };

    const handlePaymentModeSubmit = async (e) => {
        e.preventDefault();
        setPaymentSaving(true);
        setMessage('');
        try {
            await axios.put('/api/admin/settings/payment-mode', { mode: paymentMode });
            const healthRes = await axios.get('/api/admin/payments/health');
            setPaymentHealth(healthRes.data || {});
            setMessage('Payment provider mode updated.');
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to update payment mode.');
        } finally {
            setPaymentSaving(false);
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

                <div className="mt-10 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-sm">
                    <div className="p-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h2 className="text-[10px] tracking-[0.3em] font-black text-white uppercase">Advanced Controls</h2>
                                <p className="text-[11px] text-zinc-500 mt-2 max-w-2xl">
                                    System-wide controls for refund policy, scanner behavior, stock alerts, and payment gateway mode. These are connected to live admin APIs and should only be changed when operations policy truly changes.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAdvanced((prev) => !prev)}
                                className="w-full md:w-auto px-6 py-3 rounded-xl border border-zinc-700 text-zinc-200 text-[10px] font-black uppercase tracking-[0.2em] hover:border-emerald-500/40 hover:text-emerald-300 transition-all"
                            >
                                {showAdvanced ? 'Hide Advanced Controls' : 'Show Advanced Controls'}
                            </button>
                        </div>
                    </div>
                </div>

                {showAdvanced && (
                    <>
                <div className="mt-10 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-sm">
                    <form onSubmit={handlePolicySubmit} className="divide-y divide-zinc-800/50">
                        <div className="p-8 space-y-6">
                            <h2 className="text-[10px] tracking-[0.3em] font-black text-white uppercase">Operational Policy</h2>
                            <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-[10px] tracking-wide rounded-xl px-4 py-3">
                                These are platform-wide admin rules, not personal profile settings. Changes here affect booking, refund, scanner, and inventory behavior for all users.
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Refund Event Status</label>
                                    <select
                                        value={policy.refund_allowed_event_status}
                                        onChange={(e) => setPolicy({ ...policy, refund_allowed_event_status: e.target.value })}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50"
                                    >
                                        <option value="cancelled">Cancelled</option>
                                        <option value="rescheduled">Rescheduled</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                    <p className="text-[10px] text-zinc-500 mt-2">Refunds are allowed only when the event reaches this status.</p>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Require Successful Payment</label>
                                    <select
                                        value={policy.refund_require_successful_payment ? 'true' : 'false'}
                                        onChange={(e) => setPolicy({ ...policy, refund_require_successful_payment: e.target.value === 'true' })}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50"
                                    >
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </select>
                                    <p className="text-[10px] text-zinc-500 mt-2">If Yes, only bookings with a successful payment can be refunded.</p>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Reschedule Window (hours)</label>
                                    <input
                                        type="number"
                                        min={24}
                                        max={336}
                                        value={policy.reschedule_refund_window_hours}
                                        onChange={(e) => setPolicy({ ...policy, reschedule_refund_window_hours: Number(e.target.value) })}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50"
                                    />
                                    <p className="text-[10px] text-zinc-500 mt-2">Time limit for user decisions after a schedule change (example: 72 = 3 days).</p>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Scanner Duplicate Window (seconds)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={policy.scanner_duplicate_window_seconds}
                                        onChange={(e) => setPolicy({ ...policy, scanner_duplicate_window_seconds: Number(e.target.value) })}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50"
                                    />
                                    <p className="text-[10px] text-zinc-500 mt-2">Blocks rapid repeat scans of the same code to avoid accidental double check-in.</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Low Stock Alert Threshold (%)</label>
                                    <div className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3">
                                        {policy.inventory_low_stock_threshold_pct ?? 85}%
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-2">Fixed system policy. Alert visibility is shown across Dashboard, Events, and Inventory views.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-zinc-950/50">
                            <button
                                disabled={policySaving}
                                className="w-full md:w-auto px-12 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-emerald-500 transition-all duration-300 disabled:opacity-50"
                            >
                                {policySaving ? 'SAVING POLICY...' : 'SAVE POLICY'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-10 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-sm">
                    <form onSubmit={handlePaymentModeSubmit} className="divide-y divide-zinc-800/50">
                        <div className="p-8 space-y-6">
                            <h2 className="text-[10px] tracking-[0.3em] font-black text-white uppercase">Payment Provider Mode</h2>
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] tracking-wide rounded-xl px-4 py-3">
                                This controls how payments are processed system-wide. Use Sandbox for testing and PayMongo only when credentials are configured.
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Active Mode</label>
                                    <select
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value)}
                                        className="w-full bg-zinc-950/50 border border-zinc-800 text-[11px] font-bold text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50"
                                    >
                                        <option value="sandbox">Sandbox (Simulation)</option>
                                        <option value="paymongo">PayMongo</option>
                                    </select>
                                    <p className="text-[10px] text-zinc-500 mt-2">Sandbox = fake payments for testing. PayMongo = real gateway flow.</p>
                                </div>
                                <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3">
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Gateway Health</p>
                                    <p className={`text-[11px] font-bold uppercase tracking-widest ${paymentHealth.ready ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {paymentHealth.ready ? 'Ready' : 'Not Ready'}
                                    </p>
                                    <p className="text-[10px] text-zinc-500 mt-1">Current Mode: {String(paymentHealth.mode || paymentMode || 'sandbox').toUpperCase()}</p>
                                    <p className="text-[10px] text-zinc-500 mt-1">PayMongo Configured: {paymentHealth.paymongo_configured ? 'Yes' : 'No'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 bg-zinc-950/50">
                            <button
                                disabled={paymentSaving}
                                className="w-full md:w-auto px-12 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-emerald-500 transition-all duration-300 disabled:opacity-50"
                            >
                                {paymentSaving ? 'UPDATING MODE...' : 'UPDATE PAYMENT MODE'}
                            </button>
                        </div>
                    </form>
                </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminSettingsPage;