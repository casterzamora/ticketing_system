import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AdminUsers = () => {
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
        <div className="page-shell">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="page-card p-5 sm:p-6 mb-6">
                    <header className="mb-4">
                        <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-stone-300">Admin</p>
                        <h1 className="font-display mt-1 text-4xl sm:text-5xl font-bold text-white leading-none">User Management</h1>
                        <p className="text-xs text-gray-400 mt-1">{total} registered users</p>
                    </header>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="kpi-chip"><p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Total</p><p className="font-display text-2xl text-white mt-0.5">{total}</p></div>
                        <div className="kpi-chip"><p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Active</p><p className="font-display text-2xl text-white mt-0.5">{users.filter((u) => u.is_active).length}</p></div>
                        <div className="kpi-chip"><p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Admins</p><p className="font-display text-2xl text-white mt-0.5">{users.filter((u) => u.is_admin).length}</p></div>
                        <div className="kpi-chip"><p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Page</p><p className="font-display text-2xl text-white mt-0.5">{page}</p></div>
                    </div>
                </div>

                {message && (
                    <div className="mb-4 bg-green-900/30 border border-green-600 text-green-300 text-xs px-4 py-3 rounded-xl">{message}</div>
                )}

                <div className="page-card p-4 flex flex-wrap gap-3 mb-6">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-black/60 border border-gray-700 text-sm text-gray-100 placeholder-gray-500 rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-400 w-64"
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-black/60 border border-gray-700 text-sm text-gray-100 rounded-full px-4 py-2 focus:outline-none"
                    >
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>
                </div>

                {loading ? (
                    <div className="page-card p-10 text-center text-[11px] tracking-widest uppercase text-zinc-400">Loading users...</div>
                ) : users.length === 0 ? (
                    <div className="page-card text-center py-20">
                        <p className="text-zinc-400">No users found.</p>
                    </div>
                ) : (
                    <>
                        <div className="table-shell overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-black/80 text-[11px] text-gray-400 font-bold tracking-widest uppercase">
                                    <tr>
                                        {['User', 'Role', 'Status', 'Bookings', 'Joined', 'Actions'].map((h) => (
                                            <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} className="border-t border-gray-800 hover:bg-white/[0.03] transition">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-500 to-zinc-600 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                                                        {u.name?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white">{u.name}</p>
                                                        <p className="text-[10px] text-gray-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={u.is_admin ? 'admin' : 'user'}
                                                    disabled={actionLoading === `role-${u.id}`}
                                                    onChange={(e) => handleAssignRole(u.id, e.target.value)}
                                                    className="bg-black/60 border border-gray-700 text-xs text-gray-100 rounded-full px-2 py-1 focus:outline-none"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${u.is_active ? 'bg-green-500/20 text-green-300 border-green-600' : 'bg-gray-500/20 text-gray-400 border-gray-600'}`}>
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 text-center">{u.bookings_count ?? '—'}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleToggleActive(u.id)}
                                                    disabled={actionLoading === `active-${u.id}`}
                                                    className={`text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 ${u.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                                                >
                                                    {actionLoading === `active-${u.id}` ? '...' : u.is_active ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

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

export default AdminUsers;
