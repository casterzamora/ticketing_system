import React, { useEffect, useState } from 'react';
import axios from 'axios';

const channelStyles = {
    in_app: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    email: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    email_failed: 'bg-red-500/15 text-red-300 border-red-500/40',
};

const AdminNotificationsPage = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [lowStockThreshold, setLowStockThreshold] = useState(85);
    const [filters, setFilters] = useState({ search: '', channel: '', event_key: '', page: 1 });
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    const fetchRows = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.set('search', filters.search);
            if (filters.channel) params.set('channel', filters.channel);
            if (filters.event_key) params.set('event_key', filters.event_key);
            params.set('page', String(filters.page));

            const res = await axios.get(`/api/admin/notifications?${params.toString()}`);
            setRows(res.data?.data ?? []);
            setPagination(res.data?.pagination ?? { current_page: 1, last_page: 1, total: 0 });

            const inventoryRes = await axios.get('/api/admin/inventory?page=1');
            setLowStockAlerts(inventoryRes.data?.low_stock_alerts ?? []);
            setLowStockThreshold(inventoryRes.data?.low_stock_threshold_pct ?? 85);
        } catch (error) {
            console.error('Failed to fetch notification logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, [filters.page, filters.channel, filters.event_key]);

    const onSubmit = (e) => {
        e.preventDefault();
        setFilters((prev) => ({ ...prev, page: 1 }));
        fetchRows();
    };

    const counts = rows.reduce(
        (acc, row) => {
            acc.total += 1;
            if (row.channel === 'email') acc.email += 1;
            if (row.channel === 'email_failed') acc.failed += 1;
            return acc;
        },
        { total: 0, email: 0, failed: 0 }
    );

    return (
        <div className="admin-page">
            <div className="admin-container">
                <header className="mb-10">
                    <div className="admin-eyebrow mb-3">
                        <span className="admin-eyebrow-dot bg-cyan-500" />
                        <p className="admin-eyebrow-text">Messaging Ops</p>
                    </div>
                    <h1 className="admin-title">Notification Monitor.</h1>
                </header>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Total</p>
                        <p className="text-2xl font-display text-white mt-1">{pagination.total}</p>
                    </div>
                    <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Email Sent</p>
                        <p className="text-2xl font-display text-emerald-400 mt-1">{counts.email}</p>
                    </div>
                    <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Email Failed</p>
                        <p className="text-2xl font-display text-red-400 mt-1">{counts.failed}</p>
                    </div>
                </div>

                {lowStockAlerts.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 mb-8">
                        <h2 className="text-[11px] uppercase tracking-[0.2em] text-amber-300 font-bold mb-3">
                            Low Stock Alerts ({lowStockThreshold}% sold threshold)
                        </h2>
                        <div className="space-y-2">
                            {lowStockAlerts.slice(0, 5).map((alert) => (
                                <div key={alert.ticket_type_id} className="flex items-center justify-between rounded-xl border border-amber-500/20 p-3 text-xs bg-black/20">
                                    <div>
                                        <p className="text-amber-100 font-bold">{alert.ticket_type_name} - {alert.event_title || 'Unknown Event'}</p>
                                        <p className="text-amber-200/70">{alert.sold} sold / {alert.capacity} capacity</p>
                                    </div>
                                    <p className="text-amber-300 font-bold">{alert.sold_pct}% sold</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-[#111113] border border-zinc-800 rounded-3xl p-5 mb-8">
                    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                            type="text"
                            placeholder="Search title, event key, user, booking"
                            value={filters.search}
                            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                            className="md:col-span-2 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600"
                        />
                        <select
                            value={filters.channel}
                            onChange={(e) => setFilters((prev) => ({ ...prev, channel: e.target.value, page: 1 }))}
                            className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white"
                        >
                            <option value="">All Channels</option>
                            <option value="in_app">In-App</option>
                            <option value="email">Email Sent</option>
                            <option value="email_failed">Email Failed</option>
                        </select>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="event key"
                                value={filters.event_key}
                                onChange={(e) => setFilters((prev) => ({ ...prev, event_key: e.target.value }))}
                                className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600"
                            />
                            <button type="submit" className="px-4 py-3 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest">Apply</button>
                        </div>
                    </form>
                </div>

                <div className="bg-[#111113] border border-zinc-800 rounded-3xl overflow-hidden mb-8">
                    <table className="w-full text-left">
                        <thead className="bg-black/40 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-4 py-3">When</th>
                                <th className="px-4 py-3">Channel</th>
                                <th className="px-4 py-3">Event Key</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Booking Ref</th>
                                <th className="px-4 py-3">Title</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500 text-sm">Loading notification logs...</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-600 text-sm">No records found.</td></tr>
                            ) : rows.map((row) => (
                                <tr key={row.id} className="text-xs">
                                    <td className="px-4 py-3 text-zinc-400">{row.sent_at ? new Date(row.sent_at).toLocaleString() : '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded border text-[9px] uppercase tracking-widest ${channelStyles[row.channel] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                                            {row.channel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-300 font-mono">{row.event_key}</td>
                                    <td className="px-4 py-3 text-zinc-300">{row.user?.name || row.user?.email || 'System'}</td>
                                    <td className="px-4 py-3 text-zinc-400 font-mono">{row.booking?.booking_reference || '-'}</td>
                                    <td className="px-4 py-3 text-white">{row.title}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-[#111113] border border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
                    <button
                        disabled={pagination.current_page <= 1}
                        onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest">Page {pagination.current_page} of {pagination.last_page}</p>
                    <button
                        disabled={pagination.current_page >= pagination.last_page}
                        onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(pagination.last_page, prev.page + 1) }))}
                        className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminNotificationsPage;
