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
    const [statusFilter, setStatusFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const formatDateTime = (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString();
    };

    const toPhp = (value) => `₱${Number(value || 0).toLocaleString()}`;

    const fetchRefunds = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page) });
            if (statusFilter) params.append('status', statusFilter);
            if (search) params.append('search', search);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            const res = await axios.get(`/api/admin/refunds?${params}`);
            const body = res.data;
            const items = Array.isArray(body) ? body : (body?.data ?? []);
            setRefunds(items);
            setTotal(body?.total ?? items.length);
            setLastPage(body?.last_page ?? 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search, dateFrom, dateTo, page]);

    useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

    return (
        <div className="admin-page">
            <div className="admin-container">
                <header className="admin-header">
                    <div className="space-y-1">
                        <div className="admin-eyebrow">
                            <span className="admin-eyebrow-dot bg-amber-500 animate-pulse" />
                            <p className="admin-eyebrow-text">
                                Read-Only Financial Records
                            </p>
                        </div>
                        <h1 className="admin-title">
                            Refunds <span className="text-zinc-600">.</span>
                        </h1>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Pending (Page)', value: refunds.filter(r => r.status === 'pending').length, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { label: 'Approved (Page)', value: refunds.filter(r => r.status === 'approved').length, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { label: 'Rejected (Page)', value: refunds.filter(r => r.status === 'rejected').length, icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { label: 'Total Records', value: total, icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' },
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
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-black border border-zinc-800 text-[10px] font-bold tracking-[0.2em] uppercase text-white rounded-xl px-4 py-2.5"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-black border border-zinc-800 text-[10px] font-bold tracking-widest text-zinc-300 rounded-xl px-4 py-2.5"
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-black border border-zinc-800 text-[10px] font-bold tracking-widest text-zinc-300 rounded-xl px-4 py-2.5"
                            />
                        </div>

                        <div className="flex-1 max-w-2xl w-full flex gap-2">
                            <input
                                type="text"
                                placeholder="SEARCH BY REF, EMAIL, NAME OR EVENT..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setPage(1);
                                        setSearch(searchInput.trim());
                                    }
                                }}
                                className="w-full bg-black border border-zinc-800 text-[10px] font-bold tracking-widest text-white placeholder-zinc-700 rounded-xl px-5 py-2.5 focus:outline-none focus:border-white/20 transition-all uppercase"
                            />
                            <button
                                onClick={() => {
                                    setPage(1);
                                    setSearch(searchInput.trim());
                                }}
                                className="px-4 py-2.5 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest"
                            >
                                Apply
                            </button>
                            <button
                                onClick={() => {
                                    setStatusFilter('');
                                    setDateFrom('');
                                    setDateTo('');
                                    setSearch('');
                                    setSearchInput('');
                                    setPage(1);
                                }}
                                className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/40">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 italic">Petitioner</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Financials</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Reason</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Processing</th>
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
                                            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-600">No Ledger Records</p>
                                        </td>
                                    </tr>
                                ) : (
                                    refunds.map((refund) => (
                                        <tr key={refund.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-5">
                                                <div>
                                                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1 group-hover:text-amber-400 transition-colors">
                                                        {refund.booking?.user?.name || 'Unknown User'}
                                                    </h3>
                                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{refund.booking?.booking_reference || `#Ref-${refund.id}`}</p>
                                                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">{refund.booking?.user?.email || 'No email'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black text-white">{toPhp(refund.refund_amount ?? refund.booking?.total_amount)}</p>
                                                    <div className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${statusColors[refund.status]}`}>
                                                        {refund.status}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest max-w-[280px] whitespace-normal">{refund.reason || 'No justification provided.'}</p>
                                                <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-widest mt-1">
                                                    {refund.booking?.event?.title || 'Unknown Event'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Requested: {formatDateTime(refund.created_at)}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Processed: {formatDateTime(refund.processed_at)}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-400">By: {refund.approved_by?.name || 'Pending Admin'}</p>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-5 border-t border-zinc-800 flex items-center justify-between">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <p className="text-zinc-500 text-xs uppercase tracking-widest">Page {page} of {lastPage}</p>
                        <button
                            disabled={page >= lastPage}
                            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                            className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminRefunds;
