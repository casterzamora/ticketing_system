import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const UserNotificationsPage = () => {
    const [rows, setRows] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/user/notifications?limit=50');
            setRows(res.data?.data || []);
            setUnreadCount(Number(res.data?.unread_count || 0));
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markRead = async (id) => {
        setBusyId(id);
        try {
            await axios.patch(`/api/user/notifications/${id}/read`);
            setRows((prev) =>
                prev.map((row) =>
                    row.id === id ? { ...row, read_at: row.read_at || new Date().toISOString() } : row
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        } finally {
            setBusyId(null);
        }
    };

    const markAllRead = async () => {
        setMarkingAll(true);
        try {
            await axios.patch('/api/user/notifications/read-all');
            const nowIso = new Date().toISOString();
            setRows((prev) => prev.map((row) => (row.read_at ? row : { ...row, read_at: nowIso })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all notifications as read', error);
        } finally {
            setMarkingAll(false);
        }
    };

    return (
        <div className="page-shell min-h-screen bg-[#0a0a0b] pb-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mb-2">Account Feed</p>
                        <h1 className="font-display text-5xl sm:text-6xl font-black text-white tracking-tighter">Notifications.</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">
                            Unread: <span className="text-emerald-400">{unreadCount}</span>
                        </div>
                        <button
                            type="button"
                            disabled={unreadCount === 0 || markingAll}
                            onClick={markAllRead}
                            className="px-3 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-widest hover:border-zinc-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {markingAll ? 'Saving...' : 'Mark All Read'}
                        </button>
                    </div>
                </header>

                <div className="bg-[#111113] border border-zinc-800 rounded-3xl overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-zinc-500 text-sm">Loading notifications...</div>
                    ) : rows.length === 0 ? (
                        <div className="p-8 text-zinc-500 text-sm">No notifications yet.</div>
                    ) : (
                        <div className="divide-y divide-zinc-800/60">
                            {rows.map((row) => {
                                const unread = !row.read_at;
                                return (
                                    <div key={row.id} className={`p-5 ${unread ? 'bg-emerald-500/5' : 'bg-transparent'}`}>
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-white uppercase tracking-wide">{row.title}</p>
                                                    {unread && (
                                                        <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-400/40 text-emerald-300">
                                                            New
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-300">{row.body}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                                    {new Date(row.created_at).toLocaleString()}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {row.booking_id && (
                                                    <Link
                                                        to={`/user/bookings/${row.booking_id}`}
                                                        className="px-3 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-[10px] font-bold uppercase tracking-widest hover:border-zinc-500 hover:text-white"
                                                    >
                                                        Open Booking
                                                    </Link>
                                                )}
                                                {unread && (
                                                    <button
                                                        onClick={() => markRead(row.id)}
                                                        disabled={busyId === row.id}
                                                        className="px-3 py-2 rounded-xl bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest disabled:opacity-60"
                                                    >
                                                        {busyId === row.id ? 'Saving...' : 'Mark Read'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserNotificationsPage;
