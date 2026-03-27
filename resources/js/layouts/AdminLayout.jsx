import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

const AdminLayout = ({ user, onLogout, children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const navigate = useNavigate();

    const navItems = [
        { label: 'Dashboard', path: '/admin/dashboard', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
        { label: 'Manage Events', path: '/admin/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { label: 'Bookings List', path: '/admin/bookings', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
        { label: 'Refund Requests', path: '/admin/refund-requests', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { label: 'User Management', path: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        { label: 'My Settings', path: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-zinc-300 font-sans flex overflow-hidden">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} border-r border-zinc-800 bg-[#0d0d0f] transition-all duration-300 flex flex-col z-50`}>
                <div className="h-20 flex items-center px-6 border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/20">
                            <span className="text-black text-[12px] font-black italic">LT</span>
                        </div>
                        {sidebarOpen && (
                            <div className="flex flex-col -space-y-1">
                                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white truncate italic">Live Tix</span>
                                <span className="text-[8px] font-black tracking-[0.2em] uppercase text-emerald-500 truncate italic">Admin Portal</span>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center gap-4 px-3 py-3 rounded-xl transition-all group
                                ${isActive 
                                    ? 'bg-white/5 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.03)]' 
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent'}
                            `}
                        >
                            <svg className={`w-5 h-5 shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                            </svg>
                            {sidebarOpen && (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] truncate">{item.label}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-zinc-800/50">
                    <button 
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/5 text-zinc-600 hover:text-white transition-colors"
                    >
                        <svg className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Top Header */}
                <header className="h-20 border-b border-zinc-800 bg-[#0d0d0f]/50 backdrop-blur-xl flex items-center justify-between px-8 z-40 sticky top-0">
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500 italic">System Operational</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end leading-tight">
                            <span className="text-[11px] font-black text-white italic tracking-tighter uppercase">{user?.name}</span>
                            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500 italic">Administrator</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-zinc-600 hover:border-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Content Container */}
                <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {/* Background Detail */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] -z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] -z-10 pointer-events-none" />
                    
                    <div className="p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
