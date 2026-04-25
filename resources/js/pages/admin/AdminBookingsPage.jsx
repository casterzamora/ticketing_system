import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import StatusBadge from '../../components/common/StatusBadge';

const AdminBookings = () => {
    const readOnlyMode = true;
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const pageMetrics = useMemo(() => {
        const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
        const checkedIn = bookings.filter((b) => !!b.checked_in_at).length;
        const pending = bookings.filter((b) => b.status === 'pending').length;

        return { confirmed, checkedIn, pending };
    }, [bookings]);

    const formatDateTime = (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString();
    };

    const formatPaymentStatus = (value) => {
        const normalized = String(value || 'none').toLowerCase();
        return normalized.replace(/_/g, ' ');
    };

    const paymentClasses = (value) => {
        const normalized = String(value || 'none').toLowerCase();
        if (normalized === 'successful') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
        if (normalized === 'pending') return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
        if (normalized === 'failed' || normalized === 'expired') return 'bg-red-500/10 border-red-500/30 text-red-300';
        return 'bg-zinc-800/60 border-zinc-700 text-zinc-400';
    };

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString() });
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);

            const res = await axios.get(`/api/admin/bookings?${params.toString()}`);
            const body = res.data;
            
            // Handle both paginated and plain array responses
            const data = Array.isArray(body) ? body : (body?.data ?? []);
            setBookings(data);
            setLastPage(body?.last_page ?? 1);
            setTotal(body?.total ?? data.length);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, page]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    return (
        <div className="admin-page">
            <div className="admin-container">
                <header className="admin-header">
                    <div className="space-y-1">
                        <div className="admin-eyebrow">
                            <span className="admin-eyebrow-dot bg-emerald-500 animate-pulse" />
                            <p className="admin-eyebrow-text">
                                Booking Operations View
                            </p>
                        </div>
                        <h1 className="admin-title">
                            Bookings List<span className="text-zinc-600">.</span>
                        </h1>
                    </div>
                </header>

                {readOnlyMode && (
                    <div className="mb-6 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-widest px-6 py-4 rounded-xl flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Read-only mode: this page shows full booking data (names, references, event, amount, status). Use Inventory and Scanner for operational actions.
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-white">
                    {[
                        { label: 'Total Volume', value: total, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                        { label: 'Confirmed (Page)', value: pageMetrics.confirmed, icon: 'M5 13l4 4L19 7' },
                        { label: 'Checked In (Page)', value: pageMetrics.checkedIn, icon: 'M9 12h6m-6 4h6M7 8h10' },
                        { label: 'Pending (Page)', value: pageMetrics.pending, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
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

                <div className="admin-panel">
                    <div className="p-6 border-b border-zinc-800 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by name or code..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setPage(1);
                                            setSearch(searchInput.trim());
                                        }
                                    }}
                                    className="bg-black border border-zinc-800 text-[11px] font-bold uppercase tracking-widest text-white placeholder-zinc-600 rounded-xl px-5 py-3 focus:outline-none focus:border-zinc-600 w-72 transition-colors"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-black border border-zinc-800 text-[11px] font-bold uppercase tracking-widest text-white rounded-xl px-5 py-3 focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <optgroup label="Booking Status" className="bg-zinc-900">
                                    <option value="pending">Pending Booking</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="refunded">Refunded</option>
                                </optgroup>
                                <optgroup label="Payment Status" className="bg-zinc-900 text-zinc-400">
                                    <option value="pending_payment">Pending Payment</option>
                                    <option value="paid">Paid</option>
                                    <option value="failed">Failed</option>
                                    <option value="expired">Expired</option>
                                </optgroup>
                            </select>
                            <button
                                onClick={() => {
                                    setPage(1);
                                    setSearch(searchInput.trim());
                                }}
                                className="bg-white text-black border border-white text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-3 hover:bg-zinc-200 transition-colors"
                            >
                                Apply
                            </button>
                            <button
                                onClick={() => {
                                    setStatusFilter('');
                                    setSearchInput('');
                                    setSearch('');
                                    setPage(1);
                                }}
                                className="bg-black border border-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-3 hover:border-zinc-600 transition-colors"
                            >
                                Reset
                            </button>
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
                            <span className="text-[11px] font-black text-white px-2">{page} / {lastPage || 1}</span>
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
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Event</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Amount</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Timeline</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center">
                                            <div className="inline-block w-6 h-6 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                                        </td>
                                    </tr>
                                ) : bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center">
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
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{b.booking_reference || `#${b.id}`}</span>
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 border rounded uppercase tracking-widest ${paymentClasses(b.payment_status)}`}>
                                                            Payment {formatPaymentStatus(b.payment_status)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-zinc-600 mt-2 uppercase tracking-widest">{b.customer_email || 'No email'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[10px] text-zinc-200 font-bold uppercase tracking-widest leading-none">
                                                    {b.event?.title || 'Unknown Event'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-xs font-black text-white">₱{Number(b.total_amount).toLocaleString()}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge status={b.status} />
                                                    {b.status === 'confirmed' && (
                                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${b.checked_in_at ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-800/50 border-zinc-700'}`}>
                                                            <div className={`w-1 h-1 rounded-full ${b.checked_in_at ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                                            <span className={`text-[8px] font-black uppercase tracking-widest ${b.checked_in_at ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                                {b.checked_in_at ? 'Checked In' : 'Pending Entry'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Booked: {formatDateTime(b.created_at)}</p>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                                                        Gate: {b.checked_in_at ? formatDateTime(b.checked_in_at) : 'Not Checked In'}
                                                    </p>
                                                    {typeof b.checked_in_tickets === 'number' && typeof b.issued_tickets === 'number' && (
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                                                            Ticket Entry: {b.checked_in_tickets}/{b.issued_tickets}
                                                        </p>
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
        </div>
    );
};

export default AdminBookings;
