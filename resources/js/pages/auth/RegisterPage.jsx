import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Register = () => {
    const [form, setForm] = useState({ 
        username: '',
        first_name: '', 
        last_name: '', 
        email: '', 
        phone: '',
        password: '', 
        password_confirmation: '',
        terms: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm({ ...form, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setErrors({});

        try {
            await axios.get('/api/csrf-cookie');
            const response = await axios.post('/api/register', form);
            if (response.data?.email) {
                window.location.href = '/user/dashboard';
            }
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
            } else if (err.response?.status === 419) {
                setError('Session expired. Please refresh the page and try again.');
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#141516] via-[#0f1011] to-[#0b0c0d] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-5">
                <section className="lg:col-span-2 page-card p-6 hidden lg:flex flex-col justify-between">
                    <div>
                        <div className="bg-zinc-800 border border-zinc-600 px-3 py-1 rounded-sm shadow-lg inline-flex">
                            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-white">LIVE TIX</span>
                        </div>
                        <h2 className="font-display text-5xl text-white leading-none mt-4">Create once, book faster forever.</h2>
                        <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                            Build your account to unlock quicker checkout, booking history, and real-time event access.
                        </p>
                    </div>
                    <div className="space-y-2">
                        {[
                            'Track every booking in one dashboard',
                            'Get clear status for confirmations and refunds',
                            'Use one identity across public and account pages',
                        ].map((item) => (
                            <div key={item} className="kpi-chip text-xs text-zinc-300">{item}</div>
                        ))}
                    </div>
                </section>

                <div className="lg:col-span-3 max-w-md w-full mx-auto lg:max-w-none">
                    <div className="mb-8 text-center lg:text-left">
                        <Link to="/events" className="inline-flex items-center space-x-2 mb-4 lg:hidden">
                            <div className="bg-zinc-800 border border-zinc-600 px-3 py-1 rounded-sm shadow-lg">
                                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-white">LIVE TIX</span>
                            </div>
                        </Link>
                        <h2 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight leading-none">Create your account</h2>
                        <div className="mt-4 flex items-center justify-center lg:justify-start gap-4">
                            <p className="text-xs text-zinc-400">Join thousands of fans booking events every day.</p>
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
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {[
                                { id: 'first_name', label: 'First Name', type: 'text', placeholder: 'Jane' },
                                { id: 'last_name', label: 'Last Name', type: 'text', placeholder: 'Doe' },
                                { id: 'username', label: 'Username', type: 'text', placeholder: 'janedoe' },
                            ].map(({ id, label, type, placeholder }) => (
                                <div key={id} className="space-y-1">
                                    <label htmlFor={id} className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-300">
                                        {label}
                                    </label>
                                    <input
                                        id={id}
                                        name={id}
                                        type={type}
                                        required
                                        placeholder={placeholder}
                                        value={form[id]}
                                        onChange={handleChange}
                                        className="block w-full rounded-md bg-[#1b1d20] border border-white/10 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
                                    />
                                    {errors[id] && (
                                        <p className="text-red-400 text-[11px]">{errors[id][0]}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {[
                            { id: 'email', label: 'Email Address', type: 'email', placeholder: 'jane@example.com' },
                            { id: 'phone', label: 'Phone Number (Optional)', type: 'text', placeholder: '+63 900 000 0000' },
                        ].map(({ id, label, type, placeholder }) => (
                            <div key={id} className="space-y-1">
                                <label htmlFor={id} className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-300">
                                    {label}
                                </label>
                                <input
                                    id={id}
                                    name={id}
                                    type={type}
                                    required={id === 'email'}
                                    placeholder={placeholder}
                                    value={form[id]}
                                    onChange={handleChange}
                                    className="block w-full rounded-md bg-[#1b1d20] border border-white/10 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
                                />
                                {errors[id] && (
                                    <p className="text-red-400 text-[11px]">{errors[id][0]}</p>
                                )}
                            </div>
                        ))}

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
                                { id: 'password_confirmation', label: 'Confirm', type: 'password', placeholder: '••••••••' },
                            ].map(({ id, label, type, placeholder }) => (
                                <div key={id} className="space-y-1">
                                    <label htmlFor={id} className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-300">
                                        {label}
                                    </label>
                                    <input
                                        id={id}
                                        name={id}
                                        type={type}
                                        required
                                        placeholder={placeholder}
                                        value={form[id]}
                                        onChange={handleChange}
                                        className="block w-full rounded-md bg-[#1b1d20] border border-white/10 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
                                    />
                                    {errors[id] && (
                                        <p className="text-red-400 text-[11px]">{errors[id][0]}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-start gap-3 py-2">
                            <input
                                type="checkbox"
                                id="terms"
                                name="terms"
                                checked={form.terms}
                                onChange={handleChange}
                                required
                                className="mt-1 w-4 h-4 rounded bg-zinc-800 border-white/10 text-zinc-500 focus:ring-0"
                            />
                            <label htmlFor="terms" className="text-[10px] sm:text-xs text-zinc-400 leading-tight">
                                I agree to the <span className="text-zinc-200 underline">Terms of Service</span> and acknowledge that all ticket sales are final and governed by the <span className="text-zinc-200 underline">Refund Policy</span>.
                            </label>
                        </div>

                        {errors.terms && (
                            <p className="text-red-400 text-[11px] -mt-2">{errors.terms[0]}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 btn-primary-neutral text-[11px] font-bold tracking-[0.2em] uppercase py-3 rounded-full transition disabled:opacity-50 shadow-lg shadow-zinc-950/50"
                        >
                            {loading ? 'Validating Experience...' : 'Create Account'}
                        </button>

                        <p className="text-center text-xs text-zinc-400 mt-2">
                            Already have an account?{' '}
                            <Link to="/login" className="text-zinc-200 hover:text-white font-semibold">Sign in</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
