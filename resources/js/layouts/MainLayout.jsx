import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const linkClass = ({ isActive }) =>
    `text-[11px] font-semibold tracking-[0.16em] uppercase px-2 py-1 rounded-md transition ${
        isActive
            ? 'text-white bg-white/[0.08]'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
    }`;

const MainLayout = ({ user, isAdmin, onLogout, children }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen text-white flex flex-col bg-grid-lines">
            <div className="bg-[#121315] border-b border-white/10 text-[10px] tracking-[0.18em] uppercase text-zinc-400">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between">
                    <span>Event Ticketing</span>
                    <span className="hidden sm:inline">Secure · Real-time · Role-based</span>
                </div>
            </div>

            <nav className="bg-[#101113]/92 border-b border-white/10 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 gap-4">
                        <Link to="/events" className="flex items-center gap-2 shrink-0">
                            <div className="bg-[#1b1d20] border border-zinc-700 px-3 py-1 rounded-sm shadow-lg">
                                <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white">LIVE TIX</span>
                            </div>
                            <span className="hidden sm:inline text-xs font-semibold tracking-[0.22em] uppercase text-zinc-300">
                                Live Events Network
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-xl px-2 py-1">
                            {user && <NavLink to="/events" className={linkClass}>Events & Concerts</NavLink>}
                            {isAdmin ? (
                                <>
                                    <NavLink to="/admin/dashboard" className={linkClass}>Dashboard</NavLink>
                                    <NavLink to="/admin/events" className={linkClass}>Events</NavLink>
                                    <NavLink to="/admin/bookings" className={linkClass}>Bookings</NavLink>
                                    <NavLink to="/admin/refund-requests" className={linkClass}>Refunds</NavLink>
                                    <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
                                </>
                            ) : user ? (
                                <>
                                    <NavLink to="/user/dashboard" className={linkClass}>Dashboard</NavLink>
                                    <NavLink to="/user/bookings" className={linkClass}>My Bookings</NavLink>
                                    <NavLink to="/user/settings" className={linkClass}>Profile</NavLink>
                                </>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((prev) => !prev)}
                            className="md:hidden text-[10px] font-bold uppercase tracking-[0.2em] border border-zinc-600 rounded-full px-3 py-1.5 text-zinc-300 hover:text-white hover:border-zinc-400 transition"
                        >
                            Menu
                        </button>

                        <div className="flex items-center gap-3 shrink-0">
                            {user ? (
                                <>
                                    <div className="hidden sm:flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-500 flex items-center justify-center text-xs font-bold uppercase">
                                            {user.name?.[0] || 'U'}
                                        </div>
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-xs font-semibold">{user.name || user.email}</span>
                                            <span className="text-[10px] uppercase tracking-wide text-zinc-500">{isAdmin ? 'Event Manager' : 'Ticket Holder'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onLogout}
                                        className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-zinc-600 hover:border-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-zinc-600 hover:border-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="text-[11px] font-semibold uppercase tracking-wide px-5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 transition"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {mobileMenuOpen && (
                        <div className="md:hidden pb-3 animate-fade-up">
                            <div className="rounded-xl border border-zinc-800 bg-[#121315]/95 px-3 py-3 space-y-3">
                                <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-500">Navigation</p>
                                <div className="flex flex-col gap-2">
                                    <Link to="/events" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white">Concerts & Events</Link>
                                {isAdmin ? (
                                    <>
                                        <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white">Dashboard</Link>
                                        <Link to="/admin/events" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white">Events</Link>
                                        <Link to="/admin/bookings" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white">Bookings</Link>
                                        <Link to="/admin/refund-requests" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white">Refunds</Link>
                                        <Link to="/admin/users" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white">Users</Link>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/user/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white">Dashboard</Link>
                                        <Link to="/user/bookings" onClick={() => setMobileMenuOpen(false)} className="text-xs uppercase tracking-[0.2em] text-zinc-300 hover:text-white">My Bookings</Link>
                                    </>
                                )}
                                </div>
                                <div className="subtle-divider" />
                                <p className="text-[10px] text-zinc-500">Use dashboard tools to manage bookings, refunds, and event activity.</p>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <main className="flex-1 bg-gradient-to-b from-transparent via-transparent to-black/30">{children}</main>

            <footer className="bg-[#0c0d0e] border-t border-white/10 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-[11px] text-zinc-500">
                    <div className="space-y-3 md:col-span-2">
                        <div className="inline-flex items-center gap-2">
                            <div className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-sm">
                                <span className="text-[9px] font-black tracking-widest uppercase text-white">LIVE TIX</span>
                            </div>
                            <span className="text-zinc-300 uppercase tracking-[0.16em]">Ticket Platform</span>
                        </div>
                        <p className="max-w-md">Browse, book, manage events seamlessly.</p>
                        <div className="flex flex-wrap gap-2">
                            <span className="kpi-chip text-[10px]">Secure</span>
                            <span className="kpi-chip text-[10px]">Real-time</span>
                            <span className="kpi-chip text-[10px]">Refunds</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-zinc-300 uppercase tracking-[0.16em]">Explore</p>
                        <Link to="/events" className="block hover:text-zinc-300">Browse Events</Link>
                        <Link to={isAdmin ? '/admin/dashboard' : '/user/dashboard'} className="block hover:text-zinc-300">Dashboard</Link>
                        <Link to={isAdmin ? '/admin/bookings' : '/user/bookings'} className="block hover:text-zinc-300">
                            {isAdmin ? 'Bookings Admin' : 'My Bookings'}
                        </Link>
                    </div>

                    <div className="space-y-2 md:text-right">
                        <p className="text-zinc-300 uppercase tracking-[0.16em]">Support</p>
                        <p>help@livetix.local</p>
                        <p>Mon-Sun · 9AM-10PM</p>
                        <p>© {new Date().getFullYear()} LiveTix. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
