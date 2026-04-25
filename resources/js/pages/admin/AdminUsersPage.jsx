import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [actionLoading, setActionLoading] = useState(null);
    const [message, setMessage] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page });
            if (search) params.append('search', search);
            if (roleFilter) params.append('role', roleFilter);

            const res = await axios.get(`/api/admin/users?${params}`);
            const body = res.data;
            setUsers(Array.isArray(body) ? body : (body?.data ?? []));
            setLastPage(body?.last_page ?? 1);
            setTotal(body?.total ?? 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, page]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleToggleActive = async (userId) => {
        setActionLoading(`active-${userId}`);
        try {
            const res = await axios.post(`/api/admin/users/${userId}/toggle-active`);
            setMessage(res.data?.message || 'User updated.');
            fetchUsers();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to update user.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAssignRole = async (userId, role) => {
        setActionLoading(`role-${userId}`);
        try {
            await axios.post(`/api/admin/users/${userId}/assign-role`, { role });
            setMessage(`Role updated to '${role}'.`);
            fetchUsers();
        } catch {
            setMessage('Failed to update role.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-zinc-400 font-sans pb-20">
            <div className="max-w-7xl mx-auto px-6 pt-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-[1px] w-8 bg-emerald-500/50"></div>
                            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-emerald-500/80">
                                User Management
                            </span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.85] mb-6">
                            USERS<span className="text-emerald-500">.</span>
                        </h1>
                        <p className="text-zinc-500 max-w-md text-sm leading-relaxed border-l border-zinc-800 pl-4">
                            Manage system access, update credentials, and monitor user engagement metrics across the platform.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                        <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl backdrop-blur-sm min-w-[160px]">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Total Users</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white">{total}</span>
                                <span className="text-[10px] text-emerald-500 font-bold">LIVE</span>
                            </div>
                        </div>
                        <div className="bg-zinc-900/40 border border-zinc-800/50 p-6 rounded-2xl backdrop-blur-sm min-w-[160px]">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Active Users</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-white">{users.filter(u => u.is_active).length}</span>
                                <span className="text-[10px] text-zinc-600 font-bold">AUTH</span>
                            </div>
                        </div>
                    </div>
                </div>

                {message && (
                    <div className="mb-8 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[11px] uppercase tracking-widest font-bold px-6 py-4 rounded-xl flex items-center gap-3">
                        {message}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1 group">
                        <input
                            type="text"
                            placeholder="SEARCH BY NAME OR EMAIL..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-zinc-900/40 border border-zinc-800 text-[11px] font-bold tracking-widest text-white placeholder-zinc-600 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500/50 transition-all uppercase"
                        />
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-zinc-900/40 border border-zinc-800 text-[11px] font-bold tracking-widest text-white rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500/50 transition-all uppercase appearance-none min-w-[160px]"
                        >
                            <option value="">ALL ROLES</option>
                            <option value="admin">ADMINISTRATOR</option>
                            <option value="user">STANDARD USER</option>
                        </select>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-md">
                    {loading ? (
                        <div className="py-32 flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                            <p className="text-[10px] tracking-[0.3em] font-black text-zinc-500 uppercase">Synchronizing Data...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="py-32 text-center">
                            <p className="text-[10px] tracking-[0.3em] font-black text-zinc-600 uppercase">No Matches Found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800/50">
                                            {['User / Contact', 'Role', 'Status', 'Last Login', 'Bookings', 'Registered', 'Actions'].map((h, i) => (
                                                <th key={h} className={`px-8 py-6 text-left text-[10px] font-black tracking-[0.2em] uppercase text-zinc-500 ${i === 4 ? 'text-center' : ''}`}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/30">
                                        {users.map((u) => (
                                            <tr key={u.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div 
                                                                onClick={() => navigate(`/admin/users/${u.id}`)}
                                                                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center border border-zinc-800 group-hover:border-emerald-500/50 cursor-pointer transition-colors"
                                                            >
                                                                <span className="text-sm font-black text-white">{u.name?.[0] || 'U'}</span>
                                                            </div>
                                                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a0a0b] ${u.is_active ? 'bg-emerald-500' : 'bg-zinc-700'}`}></div>
                                                        </div>
                                                        <div>
                                                            <div 
                                                                onClick={() => navigate(`/admin/users/${u.id}`)}
                                                                className="text-[13px] font-black text-white tracking-tight leading-none mb-1 group-hover:text-emerald-400 cursor-pointer transition-colors uppercase italic font-display"
                                                            >
                                                                {u.name}
                                                            </div>
                                                            <div className="flex gap-2 text-[10px] font-bold text-zinc-500 tracking-wider font-mono">
                                                                <span className="text-emerald-500/50">@{u.username || 'unknown'}</span>
                                                                <span>•</span>
                                                                <span>{u.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <select
                                                        value={u.is_admin ? 'admin' : 'user'}
                                                        disabled={actionLoading === `role-${u.id}`}
                                                        onChange={(e) => handleAssignRole(u.id, e.target.value)}
                                                        className="bg-zinc-950 border border-zinc-800 text-[10px] font-black tracking-widest text-zinc-400 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500/50 transition-all uppercase appearance-none hover:border-zinc-600 cursor-pointer"
                                                    >
                                                        <option value="user">MEMBER</option>
                                                        <option value="admin">OFFICER</option>
                                                    </select>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`}></div>
                                                        <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${u.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                            {u.is_active ? 'Operational' : 'Restricted'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase italic font-mono">
                                                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'NEVER'}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="text-sm font-black text-white mb-0.5">{u.bookings_count ?? 0}</span>
                                                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">Orders</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                                                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <button
                                                        onClick={() => handleToggleActive(u.id)}
                                                        disabled={actionLoading === `active-${u.id}`}
                                                        className={`text-[10px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-xl transition-all duration-300 border ${
                                                            u.is_active 
                                                                ? 'text-zinc-400 border-zinc-800 hover:text-red-400 hover:border-red-900/50 hover:bg-red-950/20' 
                                                                : 'text-emerald-400 border-emerald-900/30 bg-emerald-950/10 hover:bg-emerald-500/20'
                                                        } disabled:opacity-20`}
                                                    >
                                                        {actionLoading === `active-${u.id}` ? 'PROCESSING...' : u.is_active ? 'DEACTIVATE' : 'AUTHORIZE'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {lastPage > 1 && (
                                <div className="p-8 border-t border-zinc-800/50 flex justify-between items-center">
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                        Page {page} of {lastPage}
                                    </p>
                                    <div className="flex gap-2">
                                        {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setPage(p)}
                                                className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all duration-300 flex items-center justify-center ${
                                                    p === page 
                                                        ? 'bg-white text-black' 
                                                        : 'bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800 border border-zinc-800/50'
                                                }`}
                                            >
                                                {p.toString().padStart(2, '0')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
