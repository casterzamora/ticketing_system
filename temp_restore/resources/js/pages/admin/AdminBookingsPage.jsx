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

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this booking?')) return;
        setActionLoading(id);
        try {
            await axios.post(`/api/admin/bookings/${id}/cancel`);
            setMessage('Booking cancelled.');
            fetchBookings();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to cancel booking.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="page-shell">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="page-card p-5 sm:p-6 mb-6">
                    <PageHeader eyebrow="Admin" title="Booking Management" subtitle={`${total} bookings total`} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[['Total', total], ['Page', page], ['Shown', bookings.length], ['Status', statusFilter || 'all']].map(([k, v]) => (
                            <div key={k} className="kpi-chip">
                                <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">{k}</p>
                                <p className="font-display text-2xl text-white mt-0.5">{v}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {message && (
                    <div className="mb-4 bg-green-900/30 border border-green-600 text-green-300 text-xs px-4 py-3 rounded-xl">{message}</div>
                )}

                <div className="page-card p-4 flex flex-wrap gap-3 mb-6">
                    <input
                        type="text"
                        placeholder="Search bookings..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-black/60 border border-gray-700 text-sm text-gray-100 placeholder-gray-500 rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-400 w-72"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-black/60 border border-gray-700 text-sm text-gray-100 rounded-full px-4 py-2 focus:outline-none"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                    </select>
                </div>

                {loading ? (
                    <div className="page-card p-10 text-center text-[11px] tracking-widest uppercase text-zinc-400">Loading booking records...</div>
                ) : bookings.length === 0 ? (
                    <div className="page-card text-center py-20">
                        <p className="text-zinc-400">No bookings found for this view.</p>
                    </div>
                ) : (
                    <>
                        <div className="table-shell overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-black/80 text-[11px] text-gray-400 font-bold tracking-widest uppercase">
                                    <tr>
                                        {['Reference', 'Customer', 'Event', 'Tickets', 'Amount', 'Status', 'Payment', 'Date', 'Actions'].map((h) => (
                                            <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map((b) => (
                                        <tr key={b.id} className="border-t border-gray-800 hover:bg-white/[0.03] transition">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-300 whitespace-nowrap">{b.booking_reference}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-white">{b.customer_name}</p>
                                                <p className="text-[10px] text-gray-400">{b.customer_email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{b.event?.title ?? '—'}</td>
                                            <td className="px-4 py-3 text-gray-300 text-center">{b.total_tickets}</td>
                                            <td className="px-4 py-3 text-stone-300 font-semibold whitespace-nowrap">₱{Number(b.total_amount).toLocaleString()}</td>
                                            <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                                            <td className="px-4 py-3 text-gray-400 text-xs capitalize">{b.payment_status ?? '—'}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                                {b.created_at ? new Date(b.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {['pending', 'confirmed'].includes(b.status) && (
                                                    <button
                                                        onClick={() => handleCancel(b.id)}
                                                        disabled={actionLoading === b.id}
                                                        className="text-[10px] text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider disabled:opacity-50"
                                                    >
                                                        {actionLoading === b.id ? '...' : 'Cancel'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {lastPage > 1 && (
                            <div className="flex gap-2 mt-4 justify-end">
                                {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded-full text-xs font-semibold transition ${p === page ? 'bg-zinc-700 text-white' : 'bg-black/60 border border-gray-700 text-gray-400 hover:border-zinc-400'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminBookings;
