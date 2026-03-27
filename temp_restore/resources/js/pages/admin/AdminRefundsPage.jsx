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
    }, [statusFilter]);

    useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

    const handleAction = async (id, action) => {
        setActionLoading(`${id}-${action}`);
        try {
            await axios.post(`/api/admin/refund-requests/${id}/${action}`, { notes: note });
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
        <div className="page-shell">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="page-card p-5 sm:p-6 mb-6">
                    <header className="mb-4">
                        <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-stone-300">Admin</p>
                        <h1 className="font-display mt-1 text-4xl sm:text-5xl font-bold text-white leading-none">Refund Requests</h1>
                        <p className="text-xs text-gray-400 mt-1">{total} requests in this queue</p>
                    </header>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="kpi-chip"><p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Pending</p><p className="font-display text-2xl text-white mt-0.5">{refunds.filter((r) => r.status === 'pending').length}</p></div>
                        <div className="kpi-chip"><p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Approved</p><p className="font-display text-2xl text-white mt-0.5">{refunds.filter((r) => r.status === 'approved').length}</p></div>
                        <div className="kpi-chip"><p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Rejected</p><p className="font-display text-2xl text-white mt-0.5">{refunds.filter((r) => r.status === 'rejected').length}</p></div>
                        <div className="kpi-chip"><p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">View</p><p className="font-display text-2xl text-white mt-0.5">{statusFilter || 'all'}</p></div>
                    </div>
                </div>

                {message && (
                    <div className="mb-4 bg-green-900/30 border border-green-600 text-green-300 text-xs px-4 py-3 rounded-xl">{message}</div>
                )}

                <div className="page-card p-4 flex gap-2 mb-6">
                    {['pending', 'approved', 'rejected', ''].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full border transition ${statusFilter === s ? 'bg-zinc-700 border-zinc-500 text-white' : 'border-gray-700 text-gray-400 hover:border-zinc-400'}`}
                        >
                            {s === '' ? 'All' : s}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="page-card p-10 text-center text-[11px] tracking-widest uppercase text-zinc-400">Loading refund queue...</div>
                ) : refunds.length === 0 ? (
                    <div className="page-card text-center py-20">
                        <p className="text-zinc-400">No {statusFilter || ''} refund requests.</p>
                    </div>
                ) : (
                    <div className="table-shell overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-black/80 text-[11px] text-gray-400 font-bold tracking-widest uppercase">
                                <tr>
                                    {['Customer', 'Event', 'Booking Ref', 'Amount', 'Reason', 'Status', 'Requested', 'Actions'].map((h) => (
                                        <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {refunds.map((r) => (
                                    <tr key={r.id} className="border-t border-gray-800 hover:bg-white/[0.03] transition">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-white">{r.booking?.user?.name ?? '—'}</p>
                                            <p className="text-[10px] text-gray-400">{r.booking?.user?.email ?? ''}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{r.booking?.event?.title ?? '—'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-300">{r.booking?.booking_reference ?? '—'}</td>
                                        <td className="px-4 py-3 text-stone-300 font-semibold whitespace-nowrap">
                                            {r.booking?.total_amount ? `₱${Number(r.booking.total_amount).toLocaleString()}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300 max-w-xs">
                                            <p className="text-xs line-clamp-2">{r.reason}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${statusColors[r.status] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                            {r.created_at ? new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setNoteModal({ id: r.id, action: 'approve' }); setNote(''); }}
                                                        disabled={!!actionLoading}
                                                        className="text-[10px] font-bold uppercase tracking-wider text-green-400 hover:text-green-300 disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => { setNoteModal({ id: r.id, action: 'reject' }); setNote(''); }}
                                                        disabled={!!actionLoading}
                                                        className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Note modal */}
            {noteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                    <div className="bg-[#131518] border border-gray-700 rounded-xl p-6 max-w-md w-full space-y-4">
                        <h3 className="text-sm font-bold tracking-widest uppercase text-white">
                            {noteModal.action === 'approve' ? 'Approve' : 'Reject'} Refund
                        </h3>
                        <textarea
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional note..."
                            className="block w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleAction(noteModal.id, noteModal.action)}
                                disabled={actionLoading === `${noteModal.id}-${noteModal.action}`}
                                className={`text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-full text-white transition disabled:opacity-50 ${noteModal.action === 'approve' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
                            >
                                {actionLoading ? 'Processing...' : `Confirm ${noteModal.action}`}
                            </button>
                            <button
                                onClick={() => setNoteModal(null)}
                                className="text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-full border border-gray-600 text-gray-400 hover:text-white transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRefunds;
