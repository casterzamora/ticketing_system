import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminInventoryPage = () => {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({
        total_orders: 0,
        paid_orders: 0,
        refunded_orders: 0,
        pending_orders: 0,
        paid_sales: 0,
    });
    const [eventBreakdown, setEventBreakdown] = useState([]);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [lowStockThreshold, setLowStockThreshold] = useState(85);
    const [filters, setFilters] = useState({ events: [], ticket_types: [] });
    const [query, setQuery] = useState({
        search: '',
        event_id: '',
        ticket_type_id: '',
        status: '',
        page: 1,
    });
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (query.search) params.set('search', query.search);
            if (query.event_id) params.set('event_id', query.event_id);
            if (query.ticket_type_id) params.set('ticket_type_id', query.ticket_type_id);
            if (query.status) params.set('status', query.status);
            params.set('page', String(query.page));

            const res = await axios.get(`/api/admin/inventory?${params.toString()}`);
            setRows(res.data?.data ?? []);
            setSummary(res.data?.summary ?? summary);
            setEventBreakdown(res.data?.event_breakdown ?? []);
            setLowStockAlerts(res.data?.low_stock_alerts ?? []);
            setLowStockThreshold(res.data?.low_stock_threshold_pct ?? 85);
            setFilters(res.data?.filters ?? filters);
            setPagination(res.data?.pagination ?? pagination);
        } catch (err) {
            console.error('Inventory fetch failed', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, [query.page, query.status, query.event_id, query.ticket_type_id]);

    const onSearchSubmit = (e) => {
        e.preventDefault();
        setQuery((prev) => ({ ...prev, page: 1 }));
        fetchInventory();
    };

    return (
        <div className="admin-page">
            <div className="admin-container">
                <header className="mb-10">
                    <div className="admin-eyebrow mb-3">
                        <span className="admin-eyebrow-dot bg-emerald-500" />
                        <p className="admin-eyebrow-text">Operations</p>
                    </div>
                    <h1 className="admin-title">Inventory & Sales.</h1>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Total Orders</p>
                        <p className="text-2xl font-display text-white mt-1">{summary.total_orders}</p>
                    </div>
                    <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Paid</p>
                        <p className="text-2xl font-display text-emerald-400 mt-1">{summary.paid_orders}</p>
                    </div>
                    <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Pending</p>
                        <p className="text-2xl font-display text-amber-400 mt-1">{summary.pending_orders}</p>
                    </div>
                    <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Refunded</p>
                        <p className="text-2xl font-display text-blue-400 mt-1">{summary.refunded_orders}</p>
                    </div>
                    <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-4">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Paid Sales</p>
                        <p className="text-xl font-display text-white mt-1">PHP {Number(summary.paid_sales).toLocaleString()}</p>
                    </div>
                </div>

                {lowStockAlerts.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 mb-8">
                        <h2 className="text-[11px] uppercase tracking-[0.2em] text-amber-300 font-bold mb-3">
                            Low Stock Alerts ({lowStockThreshold}% sold threshold)
                        </h2>
                        <div className="space-y-2">
                            {lowStockAlerts.slice(0, 6).map((alert) => (
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
                    <form onSubmit={onSearchSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <input
                            type="text"
                            placeholder="Search booking/customer"
                            value={query.search}
                            onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value }))}
                            className="md:col-span-2 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600"
                        />
                        <select
                            value={query.event_id}
                            onChange={(e) => setQuery((prev) => ({ ...prev, event_id: e.target.value, page: 1 }))}
                            className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white"
                        >
                            <option value="">All Events</option>
                            {filters.events.map((event) => (
                                <option key={event.id} value={event.id}>{event.title}</option>
                            ))}
                        </select>
                        <select
                            value={query.ticket_type_id}
                            onChange={(e) => setQuery((prev) => ({ ...prev, ticket_type_id: e.target.value, page: 1 }))}
                            className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white"
                        >
                            <option value="">All Ticket Types</option>
                            {filters.ticket_types.map((ticketType) => (
                                <option key={ticketType.id} value={ticketType.id}>{ticketType.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <select
                                value={query.status}
                                onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
                                className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white"
                            >
                                <option value="">All Status</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="refunded">Refunded</option>
                                <option value="failed">Failed</option>
                            </select>
                            <button type="submit" className="px-4 py-3 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest">Apply</button>
                        </div>
                    </form>
                </div>

                <div className="bg-[#111113] border border-zinc-800 rounded-3xl overflow-hidden mb-8">
                    <table className="w-full text-left">
                        <thead className="bg-black/40 text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-4 py-3">Reference</th>
                                <th className="px-4 py-3">Event</th>
                                <th className="px-4 py-3">Ticket Types</th>
                                <th className="px-4 py-3">Ticket Numbers</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500 text-sm">Loading inventory...</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-600 text-sm">No records found.</td></tr>
                            ) : rows.map((row) => (
                                <tr key={row.id} className="text-xs">
                                    <td className="px-4 py-3">
                                        <p className="text-white font-bold">{row.booking_reference}</p>
                                        <p className="text-zinc-500">{row.customer_name}</p>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-300">{row.event?.title ?? 'N/A'}</td>
                                    <td className="px-4 py-3 text-zinc-400">{row.ticket_types?.join(', ') || 'N/A'}</td>
                                    <td className="px-4 py-3 text-zinc-400">{row.ticket_codes?.join(', ') || 'Pending issuance'}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded border border-zinc-700 text-zinc-300 uppercase tracking-widest text-[9px]">{row.order_status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-white font-bold">PHP {Number(row.total_amount).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#111113] border border-zinc-800 rounded-3xl p-5">
                        <h2 className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-4">Sales by Event</h2>
                        <div className="space-y-2">
                            {eventBreakdown.length === 0 ? (
                                <p className="text-zinc-600 text-sm">No event sales data yet.</p>
                            ) : eventBreakdown.map((item) => (
                                <div key={item.event_id} className="flex items-center justify-between rounded-xl border border-zinc-800 p-3 text-xs">
                                    <div>
                                        <p className="text-white font-bold">{item.event_title}</p>
                                        <p className="text-zinc-500">{item.total_orders} orders</p>
                                    </div>
                                    <p className="text-emerald-400 font-bold">PHP {Number(item.gross_sales).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#111113] border border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
                        <button
                            disabled={pagination.current_page <= 1}
                            onClick={() => setQuery((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <p className="text-zinc-500 text-xs uppercase tracking-widest">Page {pagination.current_page} of {pagination.last_page}</p>
                        <button
                            disabled={pagination.current_page >= pagination.last_page}
                            onClick={() => setQuery((prev) => ({ ...prev, page: Math.min(pagination.last_page, prev.page + 1) }))}
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

export default AdminInventoryPage;
