import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';

const AdminBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState(null);
    const [message, setMessage] = useState('');
    const [voidModal, setVoidModal] = useState({ show: false, id: null, type: 'user_fault', reason: '' });

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page });
            if (search) params.append('search', search);
            if (statusFilter) params.append('status', statusFilter);

            const res = await axios.get(`/api/admin/bookings?${params}`);
            const body = res.data;
            setBookings(Array.isArray(body) ? body : (body?.data ?? []));
            setLastPage(body?.last_page ?? 1);
            setTotal(body?.total ?? 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, page]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const handleApprove = async (id) => {
        if (!window.confirm('Approve this pending booking?')) return;
        setActionLoading(id);
        try {
            await axios.post(`/api/admin/bookings/${id}/approve`);
            setMessage('Booking approved and payment confirmed.');
            fetchBookings();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to approve booking.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Reject this pending booking?')) return;
        setActionLoading(id);
        try {
            await axios.post(`/api/admin/bookings/${id}/reject`);
            setMessage('Booking rejected.');
            fetchBookings();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to reject booking.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = async (id) => {
        setVoidModal({ show: true, id, type: 'user_fault', reason: '' });
    };

    const submitVoid = async () => {
        if (!voidModal.reason.trim()) {
            alert('A reason is required to void this order.');
            return;
        }

        setActionLoading(voidModal.id);
        try {
            const res = await axios.post(`/api/admin/bookings/${voidModal.id}/cancel`, { 
                void_type: voidModal.type,
                reason: voidModal.reason 
            });
            setMessage(res.data.message);
            setVoidModal({ show: false, id: null, type: 'user_fault', reason: '' });
            fetchBookings();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to void booking.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="page-shell bg-[#0a0a0b] min-h-screen pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-500">
                                Transaction Ledger
                            </p>
                        </div>
                        <h1 className="font-display text-5xl sm:text-6xl font-black text-white leading-tight tracking-tighter">
                            Bookings<span className="text-zinc-600">.</span>
                        </h1>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Volume', value: total, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                        { label: 'Active Page', value: page, icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
                        { label: 'Displaying', value: bookings.length, icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
                        { label: 'Criteria', value: statusFilter || 'System wide', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' },
                    ].map((kpi) => (
                        <div key={kpi.label} className="bg-[#111113] border border-zinc-800 rounded-2xl p-4">
                            <div className="flex items-center gap-3 mb-2">
                                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={kpi.icon} />
                                </svg>
                                <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500">{kpi.label}</p>
                            </div>
                            <p className="text-2xl font-black text-white font-display uppercase tracking-tight">{kpi.value}</p>
                        </div>
                    ))}
                </div>

                {message && (
                    <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest px-6 py-4 rounded-xl flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {message}
                    </div>
                )}

                <div className="bg-[#111113] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-zinc-800 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by name or code..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-black border border-zinc-800 text-[11px] font-bold uppercase tracking-widest text-white placeholder-zinc-600 rounded-xl px-5 py-3 focus:outline-none focus:border-zinc-600 w-72 transition-colors"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-black border border-zinc-800 text-[11px] font-bold uppercase tracking-widest text-white rounded-xl px-5 py-3 focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2">Step</span>
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="text-[11px] font-black text-white px-2">{page}</span>
                            <button 
                                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                                disabled={page === lastPage}
                                className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/40">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 italic">Attendee Detail</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Economic Value</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Transaction Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <div className="inline-block w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                                        </td>
                                    </tr>
                                ) : bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-600">Zero records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    bookings.map((b) => (
                                        <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-5">
                                                <div>
                                                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 group-hover:text-emerald-400 transition-colors">
                                                        {b.customer_name}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{b.booking_reference || `#${b.id}`}</span>
                                                        <span className="text-[9px] text-zinc-700 font-bold px-1 border border-zinc-800 rounded">VIA {b.payment_method?.replace('_',' ') || 'SYSTEM'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                                                        <p className="text-[10px] text-zinc-200 font-bold uppercase tracking-widest leading-none">
                                                            {b.event?.title || 'Unknown Event'}
                                                        </p>
                                                    </div>
                                                    <p className="text-xs font-black text-white pl-2.5">₱{Number(b.total_amount).toLocaleString()}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <StatusBadge status={b.status} />
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                                    {b.status === 'pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleApprove(b.id)}
                                                                disabled={actionLoading === b.id}
                                                                className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                                                            >
                                                                {actionLoading === b.id ? 'Wait...' : 'Approve'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleReject(b.id)}
                                                                disabled={actionLoading === b.id}
                                                                className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                                            >
                                                                {actionLoading === b.id ? 'Wait...' : 'Reject'}
                                                            </button>
                                                        </>
                                                    )}
                                                    {b.status === 'confirmed' && (
                                                        <button 
                                                            onClick={() => handleCancel(b.id)}
                                                            disabled={actionLoading === b.id}
                                                            className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-red-500 hover:border-red-500/50 rounded-lg transition-all"
                                                        >
                                                            {actionLoading === b.id ? 'Wait...' : 'Void Order'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Void Modal */}
            {voidModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="bg-[#111113] border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-white font-display">Administrative Void</h2>
                        </div>
                        
                        <p className="text-zinc-500 text-xs mb-8 leading-relaxed">
                            You are about to invalidate this booking. This will restore ticket inventory and notify the user.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[9px] font-black tracking-[0.2em] uppercase text-zinc-500 mb-2 ml-1">Classification Target</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'admin_fault', label: 'Admin Error (Refund Required)' },
                                        { id: 'system_fault', label: 'System Glitch (Refund Required)' },
                                        { id: 'user_fault', label: 'User Fault (No Refund Policy)' },
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setVoidModal(prev => ({ ...prev, type: type.id }))}
                                            className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest text-left transition-all ${
                                                voidModal.type === type.id 
                                                    ? 'bg-zinc-800 border-zinc-600 text-white' 
                                                    : 'bg-black border-zinc-900 text-zinc-600 hover:border-zinc-800'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black tracking-[0.2em] uppercase text-zinc-500 mb-2 ml-1">Internal Log Reason</label>
                                <textarea
                                    value={voidModal.reason}
                                    onChange={(e) => setVoidModal(prev => ({ ...prev, reason: e.target.value }))}
                                    className="block w-full rounded-2xl bg-black border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-red-500/50 transition-all font-medium resize-none"
                                    rows={4}
                                    placeholder="Explain why this order is being voided..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setVoidModal({ show: false, id: null, type: 'user_fault', reason: '' })}
                                    className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white border border-zinc-900 hover:border-zinc-800 rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitVoid}
                                    disabled={actionLoading}
                                    className="flex-1 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-500 shadow-lg shadow-red-900/20 active:translate-y-0.5 transition-all disabled:opacity-50"
                                >
                                    {actionLoading ? 'Voiding...' : 'Confirm Void'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBookings;
