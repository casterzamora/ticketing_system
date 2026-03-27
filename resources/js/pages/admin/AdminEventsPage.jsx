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

            // Fetch from the newly created admin-specific route
            const res = await axios.get(`/api/admin/events?${params}`);
            const body = res.data;
            const items = Array.isArray(body) ? body : (body?.data ?? []);
            setEvents(items);
            setLastPage(body?.last_page ?? 1);
            setTotal(body?.total ?? (body?.meta?.total) ?? items.length);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, page]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this event? This will notify all ticket holders.')) return;
        setActionLoading(id);
        try {
            await axios.patch(`/api/admin/events/${id}/cancel`);
            setMessage('Event cancelled successfully.');
            setTimeout(() => setMessage(''), 3000);
            fetchEvents();
        } catch {
            setMessage('Failed to cancel event.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this event? This action cannot be undone.')) return;
        setActionLoading(id);
        try {
            await axios.delete(`/api/admin/events/${id}`);
            setMessage('Event deleted successfully.');
            // Reset message after 3 seconds
            setTimeout(() => setMessage(''), 3000);
            fetchEvents();
        } catch {
            setMessage('Failed to delete event.');
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
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-500/80">
                                Event Management
                            </p>
                        </div>
                        <h1 className="font-display text-5xl sm:text-7xl font-black text-white leading-tight tracking-tighter uppercase">
                            Events List<span className="text-blue-500">.</span>
                        </h1>
                    </div>
                    
                    <div className="flex gap-3">
                        <Link 
                            to="/admin/events/create" 
                            className="px-5 py-2.5 bg-white text-black text-[11px] font-semibold uppercase tracking-wide rounded-full hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
                        >
                            + Create Event
                        </Link>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Total Events', value: total, color: 'text-blue-500', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                        { label: 'Public Events', value: events.filter(e => e.status === 'published').length, color: 'text-emerald-500', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
                        { label: 'Drafts', value: events.filter(e => e.status === 'draft').length, color: 'text-amber-500', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
                        { label: 'System Usage', value: `${((events.length / 50) * 100).toFixed(0)}%`, color: 'text-zinc-500', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                    ].map((kpi) => (
                        <div key={kpi.label} className="bg-[#101113]/92 border border-white/10 rounded-2xl p-6 backdrop-blur-sm group hover:bg-white/[0.04] transition-all duration-500 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 rounded-lg bg-[#1b1d20] border border-zinc-700 group-hover:border-white/20 transition-colors shadow-lg`}>
                                    <svg className={`w-4 h-4 ${kpi.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={kpi.icon} />
                                    </svg>
                                </div>
                                <div className="h-1 w-8 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${kpi.color.replace('text-', 'bg-')} w-2/3 animate-pulse`} />
                                </div>
                            </div>
                            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-zinc-500 mb-1">{kpi.label}</p>
                            <p className="text-3xl font-black text-white font-display uppercase tracking-tighter">{kpi.value.toString().padStart(2, '0')}</p>
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
                                    placeholder="Search by title or venue..."
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
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                                <option value="cancelled">Cancelled</option>
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
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500/60 italic">Event Information</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Location & Date</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 text-center">Inventory</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-32 text-center">
                                            <div className="inline-block w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Loading Events...</p>
                                        </td>
                                    </tr>
                                ) : events.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-32 text-center">
                                            <p className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-700 italic">No events found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    events.map((event) => {
                                        const soldOut = event.remaining_total === 0;
                                        const lowStock = !soldOut && event.remaining_total <= (event.max_capacity * 0.1);
                                        const fillPercentage = Math.min(100, Math.max(0, ((event.max_capacity - (event.remaining_total ?? 0)) / event.max_capacity) * 100));

                                        return (
                                            <tr key={event.id} className="hover:bg-blue-500/[0.02] transition-colors group">
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden flex-shrink-0 relative group-hover:border-blue-500/40 transition-all duration-500">
                                                            {event.image_url ? (
                                                                <img src={event.image_url} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-all duration-700 grayscale group-hover:grayscale-0 scale-110 group-hover:scale-100" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-black text-white italic tracking-tighter uppercase mb-2 group-hover:text-blue-400 transition-colors font-display">
                                                                {event.title}
                                                            </h3>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`text-[8px] font-black px-2 py-0.5 rounded border ${
                                                                    event.status === 'published' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]' :
                                                                    event.status === 'draft' ? 'bg-zinc-500/5 text-zinc-500 border-zinc-500/20' :
                                                                    'bg-red-500/5 text-red-500 border-red-500/20'
                                                                } uppercase tracking-widest`}>
                                                                    {event.status}
                                                                </div>
                                                                {event.is_featured && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="space-y-1.5">
                                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-white transition-colors">{event.venue}</p>
                                                        <div className="flex items-center gap-2 text-[9px] text-zinc-600 font-mono tracking-tighter">
                                                            <span className="w-3 h-[1px] bg-zinc-800" />
                                                            {new Date(event.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 border-x border-zinc-800/10">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-baseline gap-1.5 mb-2.5">
                                                            <span className={`text-xl font-black font-display leading-none tracking-tighter ${
                                                                soldOut ? 'text-red-500' : lowStock ? 'text-amber-500' : 'text-white'
                                                            }`}>
                                                                {event.remaining_total ?? 0}
                                                            </span>
                                                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">/ {event.max_capacity}</span>
                                                        </div>
                                                        <div className="w-32 h-1 bg-zinc-900/50 rounded-full overflow-hidden border border-zinc-800/30">
                                                            <div 
                                                                className={`h-full transition-all duration-1000 ${
                                                                    soldOut ? 'bg-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
                                                                    lowStock ? 'bg-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
                                                                    'bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                                                }`} 
                                                                style={{ width: `${fillPercentage}%` }}
                                                            />
                                                        </div>
                                                        <div className="mt-2 flex gap-1.5">
                                                            {soldOut && (
                                                                <span className="text-[7px] font-black bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-[0.2em] animate-pulse">
                                                                    Sold Out
                                                                </span>
                                                            )}
                                                            {lowStock && (
                                                                <span className="text-[7px] font-black bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded uppercase tracking-[0.2em]">
                                                                    Low Stock
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
                                                        <Link 
                                                            to={`/admin/events/${event.id}/edit`}
                                                            className="w-10 h-10 flex items-center justify-center bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white hover:border-blue-500/50 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                                            title="Edit Event"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </Link>
                                                        {event.status !== 'cancelled' && (
                                                            <button 
                                                                onClick={() => handleCancel(event.id)}
                                                                disabled={actionLoading === event.id}
                                                                className="w-10 h-10 flex items-center justify-center bg-zinc-950 border border-zinc-800 text-zinc-700 hover:text-amber-500 hover:border-amber-900/50 rounded-xl transition-all"
                                                                title="Cancel Event"
                                                            >
                                                                {actionLoading === event.id ? (
                                                                    <div className="w-4 h-4 border-2 border-zinc-800 border-t-amber-500 rounded-full animate-spin" />
                                                                ) : (
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleDelete(event.id)}
                                                            disabled={actionLoading === event.id}
                                                            className="w-10 h-10 flex items-center justify-center bg-zinc-950 border border-zinc-800 text-zinc-700 hover:text-red-500 hover:border-red-900/50 rounded-xl transition-all"
                                                            title="Delete Event"
                                                        >
                                                            {actionLoading === event.id ? (
                                                                <div className="w-4 h-4 border-2 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminEvents;
