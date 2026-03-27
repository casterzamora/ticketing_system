import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ isAdmin }) => {
    const [stats, setStats] = useState({
        events: 0,
        bookings: 0,
        refunds: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get('/api/dashboard/stats');
                if (response?.data) {
                    setStats({
                        events: response.data.events ?? 0,
                        bookings: response.data.bookings ?? 0,
                        refunds: response.data.refunds ?? 0,
                    });
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [isAdmin]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-[#16181a] to-[#0c0d0e]">
                <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-400">
                    Loading dashboard...
                </div>
            </div>
        );
    }

    const cards = isAdmin
        ? [
              {
                  label: 'Total Events',
                  value: stats.events,
                  color: 'from-stone-500 to-zinc-500',
              },
              {
                  label: 'Total Bookings',
                  value: stats.bookings,
                  color: 'from-zinc-500 to-zinc-700',
              },
              {
                  label: 'Pending Refunds',
                  value: stats.refunds,
                  color: 'from-amber-400 to-orange-500',
              },
          ]
        : [
              {
                  label: 'My Bookings',
                  value: stats.events,
                  color: 'from-stone-500 to-zinc-500',
              },
              {
                  label: 'Upcoming Events',
                  value: stats.bookings,
                  color: 'from-zinc-500 to-zinc-700',
              },
              {
                  label: 'Past Events',
                  value: stats.refunds,
                  color: 'from-emerald-400 to-teal-500',
              },
          ];

    return (
        <div className="py-8 sm:py-10 lg:py-12 bg-gradient-to-b from-[#151618] via-[#121315] to-[#0d0e0f]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-stone-300">
                            {isAdmin ? 'Admin Overview' : 'My Live Events'}
                        </p>
                        <h1 className="font-display mt-1 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[0.95]">
                            {isAdmin ? 'Control your events & sales' : 'Track your bookings & tickets'}
                        </h1>
                    </div>
                    <div className="text-[11px] text-zinc-400 max-w-xs">
                        Data is powered directly by your Laravel models (Event, Booking, RefundRequest)
                        and reflects real-time counts from the backend.
                    </div>
                </header>

                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
                    {cards.map((card) => (
                        <div
                            key={card.label}
                            className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl border border-white/10 overflow-hidden"
                        >
                            <div className={`h-1 w-full bg-gradient-to-r ${card.color}`} />
                            <div className="p-4 sm:p-5">
                                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-zinc-400">
                                    {card.label}
                                </p>
                                <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
                                    {card.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-panel rounded-xl p-5 animate-fade-up animate-delay-1">
                        <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-gray-300 mb-3">
                            Quick Actions
                        </h2>
                        <div className="space-y-3 text-sm">
                            {isAdmin ? (
                                <>
                                    <a
                                        href="/admin/events"
                                        className="block w-full text-left bg-gradient-to-r from-stone-500 to-zinc-500 text-white text-[11px] font-semibold tracking-[0.2em] uppercase text-center py-3 rounded-full hover:from-stone-400 hover:to-zinc-400 transition"
                                    >
                                        Manage Events
                                    </a>
                                    <a
                                        href="/admin/refund-requests"
                                        className="block w-full text-left border border-amber-400 text-amber-300 text-[11px] font-semibold tracking-[0.2em] uppercase text-center py-3 rounded-full hover:bg-amber-500 hover:text-black transition"
                                    >
                                        Review Refund Requests
                                    </a>
                                </>
                            ) : (
                                <>
                                    <a
                                        href="/events"
                                        className="block w-full text-left bg-gradient-to-r from-stone-500 to-zinc-500 text-white text-[11px] font-semibold tracking-[0.2em] uppercase text-center py-3 rounded-full hover:from-stone-400 hover:to-zinc-400 transition"
                                    >
                                        Browse Events
                                    </a>
                                    <a
                                        href="/user/bookings"
                                        className="block w-full text-left border border-zinc-500 text-zinc-300 text-[11px] font-semibold tracking-[0.2em] uppercase text-center py-3 rounded-full hover:bg-zinc-600 hover:text-black transition"
                                    >
                                        View My Bookings
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="glass-panel rounded-xl p-5 animate-fade-up animate-delay-2">
                        <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-zinc-300 mb-3">
                            {isAdmin ? 'Operations Snapshot' : 'Your Account Notes'}
                        </h2>
                        <ul className="text-xs text-zinc-300 space-y-2 list-disc list-inside">
                            {isAdmin ? (
                                <>
                                    <li>Track event pipeline from draft to published with centralized controls.</li>
                                    <li>Monitor booking volume and pending refund queue from one panel.</li>
                                    <li>Revenue, refund, and user management modules are connected via role-based permissions.</li>
                                    <li>All counts are loaded from your Laravel API so admin data stays synchronized.</li>
                                </>
                            ) : (
                                <>
                                    <li>Booking statuses are updated in real time from your transaction records.</li>
                                    <li>Refund requests follow the 48-hour rule and one-request-per-booking policy.</li>
                                    <li>Ticket availability is enforced by backend validation to avoid overselling.</li>
                                    <li>Your dashboard reflects only your bookings and account activity.</li>
                                </>
                            )}
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
