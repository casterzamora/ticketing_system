import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = ({ isAdmin }) => {
    const [stats, setStats] = useState({
        events: 0,
        bookings: 0,
        refunds: 0,
        recentBookings: [],
        revenue: 0,
        grossRevenue: 0,
        refundedAmount: 0,
        lowStockAlerts: 0,
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/dashboard/stats');
            if (response?.data) {
                setStats({
                    events: response.data.events ?? 0,
                    bookings: response.data.bookings_total ?? 0,
                    refunds: response.data.refunds_total_count ?? response.data.refunds_pending_count ?? 0,
                    recentBookings: response.data.recent_bookings ?? [],
                    revenue: response.data.revenue ?? 0,
                    grossRevenue: response.data.gross_revenue ?? 0,
                    refundedAmount: response.data.refunded_amount ?? 0,
                    lowStockAlerts: response.data.low_stock_alerts_count ?? 0,
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [isAdmin, fetchStats]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#0a0a0b]">
                <div className="w-12 h-12 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin mb-4" />
                <div className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 animate-pulse font-bold">
                    Loading Dashboard...
                </div>
            </div>
        );
    }

    const cards = isAdmin
        ? [
              {
                  label: 'Net Revenue',
                  value: `₱${Number(stats.revenue || 0).toLocaleString()}`,
                  sub: `Gross: ₱${Number(stats.grossRevenue || 0).toLocaleString()}`,
                  icon: (
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  ),
                  glow: 'shadow-emerald-500/10'
              },
              {
                  label: 'Tickets Sold',
                  value: stats.bookings,
                  sub: `Refunded: ₱${Number(stats.refundedAmount || 0).toLocaleString()}`,
                  icon: (
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                      </svg>
                  ),
                  glow: 'shadow-blue-500/10'
              },
              {
                  label: 'Refund Ledger',
                  value: stats.refunds,
                  sub: 'Recorded Entries',
                  icon: (
                      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  ),
                  glow: 'shadow-amber-500/10'
              },
              {
                  label: 'Low Stock Alerts',
                  value: stats.lowStockAlerts,
                  sub: 'Inventory Watchlist',
                  icon: (
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
                      </svg>
                  ),
                  glow: 'shadow-red-500/10'
              },
          ]
        : [
              {
                  label: 'My Bookings',
                  value: stats.bookings,
                  sub: 'Active Tickets',
                  color: 'from-stone-500 to-zinc-500',
              },
              {
                  label: 'Available Events',
                  value: stats.events,
                  sub: 'Check them out',
                  color: 'from-zinc-500 to-zinc-700',
              },
              {
                  label: 'My Refunds',
                  value: stats.refunds,
                  sub: 'Processed',
                  color: 'from-emerald-400 to-teal-500',
              },
          ];

    return (
        <div className="page-shell bg-[#0a0a0b] min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-500">
                                Overview & Statistics
                            </p>
                        </div>
                        <h1 className="font-display text-5xl sm:text-6xl font-black text-white leading-tight tracking-tighter">
                            {isAdmin ? 'Admin Panel' : 'Dashboard'}<span className="text-zinc-600">.</span>
                        </h1>
                    </div>
                    
                    <div className="flex gap-3">
                        {isAdmin && (
                            <Link 
                                to="/admin/events/create" 
                                className="px-5 py-2.5 bg-white text-black text-[11px] font-semibold uppercase tracking-wide rounded-full hover:bg-zinc-200 transition-all active:scale-95 shadow-lg"
                            >
                                + Create Event
                            </Link>
                        )}
                        <button
                            onClick={fetchStats}
                            className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors"
                            title="Refresh dashboard"
                        >
                            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </header>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
                    {cards.map((card) => (
                        <div
                            key={card.label}
                            className={`group relative bg-[#101113]/92 border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/[0.04] shadow-2xl ${card.glow}`}
                        >
                            <div className="absolute top-6 right-6 font-display opacity-10 blur-sm group-hover:blur-none transition-all scale-150 rotate-12">
                                {card.icon || (
                                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-1">
                                {card.label}
                            </p>
                            <p className="text-4xl font-black text-white mb-2 font-display tracking-tight">
                                {card.value}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold font-mono">
                                {card.sub}
                            </p>
                        </div>
                    ))}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Real-time Activity Feed placeholder */}
                        <div className="bg-[#111113] border border-zinc-800 rounded-3xl p-8 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <svg className="w-32 h-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            
                            <h2 className="text-sm font-bold tracking-[0.3em] uppercase text-zinc-300 mb-8 flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                Recent Sales
                            </h2>
                            
                            {stats.recentBookings?.length > 0 ? (
                                <div className="space-y-4">
                                    {stats.recentBookings.map((booking, idx) => (
                                        <div key={booking.id} className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl hover:bg-zinc-800/40 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                                    #{idx+1}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white uppercase tracking-wider">{booking.customer_name}</p>
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{booking.event_title}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-emerald-400">₱{Number(booking.total_amount).toLocaleString()}</p>
                                                <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Paid</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center border border-dashed border-zinc-800 rounded-3xl">
                                    <p className="text-[11px] tracking-[0.2em] uppercase text-zinc-600 font-bold mb-2">No Recent Transactions</p>
                                    <p className="text-[9px] text-zinc-700 uppercase tracking-widest">Transactions will appear here as bookings are processed.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-[#111113] border border-zinc-800 rounded-3xl p-8">
                            <h2 className="text-sm font-bold tracking-[0.3em] uppercase text-zinc-300 mb-8 flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                Quick Actions
                            </h2>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { to: '/admin/events', label: 'Catalog', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                                    { to: '/admin/bookings', label: 'Bookings', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                                    { to: '/admin/refunds', label: 'Refunds', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                                    { to: '/admin/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
                                    { to: '/admin/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
                                ].map((item) => (
                                    <Link 
                                        key={item.label}
                                        to={item.to} 
                                        className="group flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-white hover:border-white transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                                                <svg className="w-4 h-4 text-zinc-400 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                                                </svg>
                                            </div>
                                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover:text-black">{item.label}</span>
                                        </div>
                                        <svg className="w-4 h-4 text-zinc-700 group-hover:text-black transform translate-x-0 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
