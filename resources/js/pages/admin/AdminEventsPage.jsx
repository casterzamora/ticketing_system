import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';

const AdminEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState(null);
    const [message, setMessage] = useState('');

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page });
            if (search) params.append('search', search);
            if (statusFilter) params.append('status', statusFilter);

            const res = await axios.get(`/api/admin/events?${params}`);
            const body = res.data;
            const items = Array.isArray(body) ? body : (body?.data ?? []);
            setEvents(items);
            setLastPage(body?.last_page ?? 1);
            setTotal(body?.total ?? items.length);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, page]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this event? This action cannot be undone.')) return;
        setActionLoading(id);
        try {
            await axios.delete(`/api/admin/events/${id}`);
            setMessage('Event deleted.');
            fetchEvents();
        } catch {
            setMessage('Failed to delete event.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="page-shell">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="page-card p-5 sm:p-6 mb-6">
                    <PageHeader
                        eyebrow="Admin"
                        title="Event Management"
                        subtitle={`${total} events in catalog`}
                        right={(
                            <Link
                                to="/admin/events/create"
                                className="btn-primary-neutral text-[11px] font-bold tracking-[0.2em] uppercase px-5 py-2.5 rounded-full transition"
                            >
                                + Create Event
                            </Link>
                        )}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[['Total', total], ['Page', page], ['Filtered', events.length], ['Status', statusFilter || 'all']].map(([k, v]) => (
                            <div key={k} className="kpi-chip">
                                <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">{k}</p>
                                <p className="font-display text-2xl text-white mt-0.5">{v}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {message && (
                    <div className="mb-4 bg-green-900/30 border border-green-600 text-green-300 text-xs px-4 py-3 rounded-xl">
                        {message}
                    </div>
                )}

                <div className="page-card p-4 mb-6 flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-black/60 border border-gray-700 text-sm text-gray-100 placeholder-gray-500 rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-400 w-64"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-black/60 border border-gray-700 text-sm text-gray-100 rounded-full px-4 py-2 focus:outline-none"
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                {loading ? (
                    <div className="page-card p-10 text-center text-[11px] tracking-widest uppercase text-zinc-400">Loading event catalog...</div>
                ) : events.length === 0 ? (
                    <div className="page-card text-center py-20">
                        <p className="text-zinc-400">No events found for the current filter.</p>
                    </div>
                ) : (
                    <>
                        <div className="table-shell overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-black/80 text-[11px] text-gray-400 font-bold tracking-widest uppercase">
                                    <tr>
                                        {['Event', 'Venue', 'Date', 'Status', 'Tickets', 'Revenue', 'Actions'].map((h) => (
                                            <th key={h} className="text-left px-4 py-3">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((ev) => {
                                        const startDate = ev.start_time ? new Date(ev.start_time) : null;
                                        return (
                                            <tr key={ev.id} className="border-t border-gray-800 hover:bg-white/[0.03] transition">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-md bg-cover bg-center shrink-0"
                                                            style={{ backgroundImage: ev.image_url ? `url(${ev.image_url})` : 'none', backgroundColor: '#1a1a3e' }}
                                                        />
                                                        <div>
                                                            <p className="font-semibold text-white">{ev.title}</p>
                                                            <p className="text-[10px] text-gray-400">{ev.categories?.map((c) => c.name).join(', ')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{ev.venue}</td>
                                                <td className="px-4 py-3 text-gray-300 whitespace-nowrap text-xs">
                                                    {startDate ? startDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={ev.status} />
                                                </td>
                                                <td className="px-4 py-3 text-gray-300">{ev.tickets_sold ?? '—'}</td>
                                                <td className="px-4 py-3 text-stone-300 font-semibold">
                                                    {ev.revenue != null ? `₱${Number(ev.revenue).toLocaleString()}` : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Link to={`/admin/events/${ev.id}/edit`} className="text-[10px] text-zinc-300 hover:text-zinc-300 font-semibold uppercase tracking-wider">Edit</Link>
                                                        <button
                                                            onClick={() => handleDelete(ev.id)}
                                                            disabled={actionLoading === ev.id}
                                                            className="text-[10px] text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider disabled:opacity-50"
                                                        >
                                                            {actionLoading === ev.id ? '...' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
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

export default AdminEvents;
