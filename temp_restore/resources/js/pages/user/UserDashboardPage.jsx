import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

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
            <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-[#050816] to-black">
                <div className="text-[11px] tracking-[0.3em] uppercase text-gray-400">
                    Loading your {isAdmin ? 'admin' : 'member'} dashboard...
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
        <div className="page-shell">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="page-card p-5 sm:p-6 mb-6">
                    <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-stone-300">
                        Member Dashboard
                    </p>
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">
                            Your events at a glance
                        </h1>
                        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                            Track active bookings, manage upcoming plans, and handle refunds from one
                            organized account center.
                        </p>
                    </div>
                </header>

                <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                    {cards.map((card) => (
                        <div
                            key={card.label}
                            className="page-card overflow-hidden"
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
                    <div className="page-card p-5 animate-fade-up animate-delay-1">
                        <h2 className="section-title mb-3">Quick Actions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Link to="/events" className="kpi-chip hover:bg-white/[0.04] transition">
                                <p className="text-xs tracking-[0.18em] uppercase text-zinc-400">Explore</p>
                                <p className="font-display text-2xl text-white mt-0.5">Browse Events</p>
                            </Link>
                            <Link to="/user/bookings" className="kpi-chip hover:bg-white/[0.04] transition">
                                <p className="text-xs tracking-[0.18em] uppercase text-zinc-400">Orders</p>
                                <p className="font-display text-2xl text-white mt-0.5">My Bookings</p>
                            </Link>
                            <div className="kpi-chip">
                                <p className="text-xs tracking-[0.18em] uppercase text-zinc-400">Policy</p>
                                <p className="font-display text-2xl text-white mt-0.5">48h Refund Window</p>
                            </div>
                            <div className="kpi-chip">
                                <p className="text-xs tracking-[0.18em] uppercase text-zinc-400">Support</p>
                                <p className="font-display text-2xl text-white mt-0.5">help@livetix.local</p>
                            </div>
                        </div>
                    </div>

                    <div className="page-card p-5 animate-fade-up animate-delay-2">
                        <h2 className="section-title mb-3">Account Notes</h2>
                        <ul className="text-xs text-zinc-300 space-y-2">
                            <li className="kpi-chip">Booking statuses update directly from your latest transactions.</li>
                            <li className="kpi-chip">Refund requests are limited to one request per booking.</li>
                            <li className="kpi-chip">Ticket availability is validated server-side to prevent overselling.</li>
                            <li className="kpi-chip">Booking history includes itemized ticket breakdown and payment details.</li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
