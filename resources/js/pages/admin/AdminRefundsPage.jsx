import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const statusColors = {
    pending:  'bg-yellow-500/20 text-yellow-300 border-yellow-600',
    approved: 'bg-green-500/20 text-green-300 border-green-600',
    rejected: 'bg-red-500/20 text-red-300 border-red-600',
};

const AdminRefunds = () => {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState(null);
    const [message, setMessage] = useState('');
    const [noteModal, setNoteModal] = useState(null); // { id, action }
    const [note, setNote] = useState('');

    const fetchRefunds = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (search) params.append('search', search);
            const res = await axios.get(`/api/admin/refund-requests?${params}`);
            const body = res.data;
            const items = Array.isArray(body) ? body : (body?.data ?? []);
            setRefunds(items);
            setTotal(body?.total ?? items.length);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search]);

    useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

    const handleAction = async (id, action) => {
        setActionLoading(`${id}-${action}`);
        try {
            const payload = { 
                notes: note,
                // Default to 'original' payment method for industry standard compliance
                refund_method: action === 'approve' ? 'original' : undefined 
            };
            await axios.post(`/api/admin/refund-requests/${id}/${action}`, payload);
            setMessage(`Refund ${action}d successfully.`);
            setNoteModal(null);
            setNote('');
            fetchRefunds();
        } catch (err) {
            setMessage(err.response?.data?.message || `Failed to ${action} refund.`);
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
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-500">
                                Dispute Resolution Queue
                            </p>
                        </div>
                        <h1 className="font-display text-5xl sm:text-6xl font-black text-white leading-tight tracking-tighter">
                            Refunds<span className="text-zinc-600">.</span>
                        </h1>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Awaiting Review', value: refunds.filter(r => r.status === 'pending').length, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { label: 'Released Funds', value: refunds.filter(r => r.status === 'approved').length, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { label: 'Denied Requests', value: refunds.filter(r => r.status === 'rejected').length, icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { label: 'Focus Queue', value: statusFilter || 'Aggregate', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' },
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
                        <div className="flex flex-wrap gap-2">
                            {['pending', 'approved', 'rejected', ''].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`text-[10px] font-bold tracking-[0.2em] uppercase px-5 py-2.5 rounded-xl border transition-all duration-300 ${
                                        statusFilter === s 
                                        ? 'bg-white border-white text-black shadow-lg shadow-white/5' 
                                        : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                                    }`}
                                >
                                    {s === '' ? 'Omni-Queue' : s}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 max-w-md w-full">
                            <input
                                type="text"
                                placeholder="SEARCH BY REF, EMAIL, NAME OR EVENT..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-black border border-zinc-800 text-[10px] font-bold tracking-widest text-white placeholder-zinc-700 rounded-xl px-5 py-2.5 focus:outline-none focus:border-white/20 transition-all uppercase"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/40">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 italic">Petitioner</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Value & Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Logistics</th>
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
                                ) : refunds.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-600">Queue Clear</p>
                                        </td>
                                    </tr>
                                ) : (
                                    refunds.map((refund) => (
                                        <tr key={refund.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-5">
                                                <div>
                                                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 group-hover:text-amber-400 transition-colors">
                                                        {refund.booking?.user?.name || 'Petitioner Identity Lost'}
                                                    </h3>
                                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{refund.booking?.booking_reference || `#Ref-${refund.id}`}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black text-white">₱{Number(refund.booking?.total_amount || 0).toLocaleString()}</p>
                                                    <div className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${statusColors[refund.status]}`}>
                                                        {refund.status}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[200px]">{refund.reason || 'No justification provided.'}</p>
                                                <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-widest mt-1">
                                                    {refund.booking?.event?.title || 'Unknown Event'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                                    {refund.status === 'pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => { setNoteModal({ id: refund.id, action: 'approve' }); setNote(''); }}
                                                                className="px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
                                                            >
                                                                Authorize
                                                            </button>
                                                            <button 
                                                                onClick={() => { setNoteModal({ id: refund.id, action: 'reject' }); setNote(''); }}
                                                                className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:border-red-500/50 hover:text-red-500 transition-all"
                                                            >
                                                                Deny
                                                            </button>
                                                        </>
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

            {/* Note modal */}
            {noteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 px-4">
                    <div className="bg-[#111113] border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <span className={`w-2 h-2 rounded-full ${noteModal.action === 'approve' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                            <h3 className="text-[11px] font-bold tracking-[0.3em] uppercase text-white">
                                Finalizing {noteModal.action === 'approve' ? 'Credit' : 'Denial'}
                            </h3>
                        </div>
                        
                        <textarea
                            rows={4}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="State the justification for this action (Internal use only)..."
                            className="block w-full rounded-2xl bg-black border border-zinc-800 px-5 py-4 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-all resize-none mb-6"
                        />
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleAction(noteModal.id, noteModal.action)}
                                disabled={!!actionLoading}
                                className={`flex-1 text-[10px] font-black tracking-[0.2em] uppercase py-4 rounded-xl text-white transition-all shadow-xl active:scale-95 ${noteModal.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10' : 'bg-red-600 hover:bg-red-500 shadow-red-500/10'}`}
                            >
                                {actionLoading ? 'Synchronizing...' : `Submit ${noteModal.action}`}
                            </button>
                            <button
                                onClick={() => setNoteModal(null)}
                                className="px-6 text-[10px] font-black tracking-[0.2em] uppercase py-4 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
                            >
                                Abort
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRefunds;
