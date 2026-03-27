import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Get CSRF cookie first (required for session-based auth)
            await axios.get('/api/csrf-cookie');

            const response = await axios.post('/api/login', { login, password });
            const userData = response.data;

            if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
                // Redirect based on role
                window.location.href = userData.is_admin ? '/admin/dashboard' : '/user/dashboard';
            }
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 422) {
                setError('Invalid email or password. Please try again.');
            } else if (err.response?.status === 419) {
                setError('Session expired. Please refresh the page and try again.');
            } else if (err.response?.status === 404) {
                setError('Login endpoint not found. Please verify backend routes are running.');
            } else {
                setError('Login failed. Please check your connection and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#141516] via-[#0f1011] to-[#0b0c0d] flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-5">
                <section className="lg:col-span-2 page-card p-6 hidden lg:flex flex-col justify-between">
                    <div>
                        <div className="inline-flex items-center space-x-2 mb-4">
                            <div className="bg-zinc-800 border border-zinc-600 px-3 py-1 rounded-sm shadow-lg">
                                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-white">LIVE TIX</span>
                            </div>
                        </div>
                        <h2 className="font-display text-5xl text-white leading-none">Your next live moment starts here.</h2>
                        <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                            Sign in to reserve tickets faster, manage active bookings, and monitor order status in one account.
                        </p>
                    </div>
                    <div className="space-y-2">
                        {[
                            'Real-time ticket inventory',
                            'Secure session-based account access',
                            'Booking history and refund tracking',
                        ].map((item) => (
                            <div key={item} className="kpi-chip text-xs text-zinc-300">{item}</div>
                        ))}
                    </div>
                </section>

                <div className="lg:col-span-3 max-w-md w-full mx-auto lg:max-w-none">
                    <div className="mb-8 text-center lg:text-left">
                        <div className="inline-flex items-center space-x-2 mb-3 lg:hidden">
                            <div className="bg-zinc-800 border border-zinc-600 px-3 py-1 rounded-sm shadow-lg">
                                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-white">
                                    LIVE TIX
                                </span>
                            </div>
                        </div>
                        <h2 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight leading-none">
                            Sign in to book events
                        </h2>
                        <div className="mt-4 flex items-center justify-center lg:justify-start gap-4">
                            <p className="text-xs text-zinc-400">
                                Use your account to access the full Event Booking and Ticketing System.
                            </p>
                            <Link 
                                to="/events" 
                                className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-300 hover:text-white border-b border-zinc-700 hover:border-white transition-all pb-0.5"
                            >
                                ← Back to events
                            </Link>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-900/30 border border-red-700 text-red-200 text-xs px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="bg-[#141618]/92 border border-white/10 rounded-xl p-6 space-y-4">
                        <div className="space-y-1">
                            <label
                                htmlFor="login"
                                className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-300"
                            >
                                Email or Username
                            </label>
                            <input
                                id="login"
                                name="login"
                                type="text"
                                autoComplete="username"
                                required
                                className="mt-1 block w-full rounded-md bg-[#1b1d20] border border-white/10 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
                                placeholder="you@example.com or @username"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label
                                htmlFor="password"
                                className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-300"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="mt-1 block w-full rounded-md bg-[#1b1d20] border border-white/10 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-3 w-full inline-flex justify-center items-center text-[11px] font-semibold tracking-[0.22em] uppercase px-4 py-2.5 rounded-full btn-primary-neutral disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>

                        <p className="text-center text-xs text-zinc-400 mt-2">
                            Don&apos;t have an account?{' '}
                            <Link to="/register" className="text-zinc-200 hover:text-white font-semibold">Create one</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
