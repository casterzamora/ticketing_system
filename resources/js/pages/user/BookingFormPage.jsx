import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const BookingForm = ({ user }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [quantities, setQuantities] = useState({});
    const [form, setForm] = useState({
        customer_name: user?.name || '',
        customer_email: user?.email || '',
        customer_phone: '',
        special_requirements: '',
    });

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await axios.get(`/api/events/${id}`);
                const ev = res.data?.data ?? res.data;
                setEvent(ev);
                // Init quantities to 0 for each ticket type
                const init = {};
                (ev.ticket_types || []).forEach((t) => { init[t.id] = 0; });
                setQuantities(init);
            } catch {
                setError('Event not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const totalAmount = event?.ticket_types?.reduce((sum, t) => sum + t.price * (quantities[t.id] || 0), 0) ?? 0;
    const totalTickets = Object.values(quantities).reduce((s, v) => s + v, 0);

    const handleQuantityChange = (ticketTypeId, delta) => {
        setQuantities((prev) => {
            const ticket = event.ticket_types.find((t) => t.id === ticketTypeId);
            const max = Math.min(ticket?.remaining ?? 10, 10);
            const next = Math.max(0, Math.min(max, (prev[ticketTypeId] || 0) + delta));
            return { ...prev, [ticketTypeId]: next };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setErrors({});

        if (totalTickets === 0) {
            setError('Please select at least one ticket.');
            return;
        }

        setSubmitting(true);
        try {
            // Only send ticket types with a quantity > 0 to avoid validation errors
            const filteredTickets = {};
            Object.entries(quantities).forEach(([id, qty]) => {
                if (qty > 0) {
                    filteredTickets[id] = qty;
                }
            });

            const payload = {
                event_id: event.id,
                ...form,
                tickets: filteredTickets,
            };

            const res = await axios.post('/api/user/bookings', payload);
            navigate(`/user/checkout/${res.data?.data?.id ?? res.data?.id}`);
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
                setError(err.response.data.message || 'Validation error.');
            } else {
                setError(err.response?.data?.message || 'Booking failed. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400">Loading...</p>
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <p className="text-red-400">{error}</p>
                <Link to="/events" className="text-stone-300 text-sm">← Back to Events</Link>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to={`/events/${id}`} className="text-xs text-gray-400 hover:text-gray-200 mb-6 inline-block">
                    ← Back to event
                </Link>

                <div className="page-card p-5 sm:p-6 mb-6">
                    <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">{event?.title}</h1>
                    <p className="text-xs text-gray-400 mt-2">
                        {event?.venue} &bull; {event?.start_time ? new Date(event.start_time).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-900/40 border border-red-500 text-red-200 text-xs px-4 py-3 rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left – ticket selection + contact */}
                    <div className="lg:col-span-3 space-y-5">
                        {/* Ticket selection */}
                        <div className="page-card p-5">
                            <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300 mb-4">Select Tickets</h2>
                            {event?.ticket_types?.length === 0 ? (
                                <p className="text-gray-400 text-sm">No tickets available.</p>
                            ) : (
                                <div className="space-y-4">
                                    {event?.ticket_types?.map((t) => (
                                        <div key={t.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-white">{t.name}</p>
                                                <p className="text-[11px] text-gray-400">
                                                    ₱{t.price.toLocaleString()} each &bull; {t.remaining > 0 ? `${t.remaining} left` : <span className="text-red-400">Sold out</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuantityChange(t.id, -1)}
                                                    disabled={!quantities[t.id]}
                                                    className="w-7 h-7 rounded-full bg-gray-800 text-white text-lg flex items-center justify-center hover:bg-gray-700 disabled:opacity-30"
                                                >−</button>
                                                <span className="w-6 text-center text-sm font-bold text-white">{quantities[t.id] || 0}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuantityChange(t.id, 1)}
                                                    disabled={t.remaining === 0 || quantities[t.id] >= Math.min(t.remaining, 10)}
                                                    className="w-7 h-7 rounded-full bg-zinc-700 text-white text-lg flex items-center justify-center hover:bg-zinc-600 disabled:opacity-30"
                                                >+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Contact info */}
                        <div className="page-card p-5 space-y-4">
                            <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300">Contact Information</h2>
                            {[
                                { id: 'customer_name', label: 'Name', type: 'text', required: true },
                                { id: 'customer_email', label: 'Email', type: 'email', required: true },
                                { id: 'customer_phone', label: 'Phone', type: 'tel', required: false },
                            ].map(({ id, label, type, required }) => (
                                <div key={id}>
                                    <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-300 mb-1">{label}</label>
                                    <input
                                        type={type}
                                        required={required}
                                        value={form[id]}
                                        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
                                        className="block w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
                                    />
                                    {errors[id] && <p className="text-red-400 text-[11px] mt-0.5">{errors[id][0]}</p>}
                                </div>
                            ))}
                            <div>
                                <label className="block text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-300 mb-1">Special Requirements</label>
                                <textarea
                                    rows={3}
                                    value={form.special_requirements}
                                    onChange={(e) => setForm({ ...form, special_requirements: e.target.value })}
                                    className="block w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 resize-none"
                                    placeholder="Special requests..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right – summary */}
                    <div className="lg:col-span-2">
                        <div className="sticky top-20 page-card p-5 space-y-4">
                            <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300">Order Summary</h2>
                            {event?.ticket_types?.filter((t) => quantities[t.id] > 0).map((t) => (
                                <div key={t.id} className="flex justify-between text-xs text-gray-300">
                                    <span>{quantities[t.id]}× {t.name}</span>
                                    <span>₱{(t.price * quantities[t.id]).toLocaleString()}</span>
                                </div>
                            ))}
                            {totalTickets === 0 && (
                                <p className="text-xs text-gray-500">No tickets selected yet.</p>
                            )}
                            <div className="border-t border-gray-700 pt-3 flex justify-between font-bold text-white">
                                <span className="text-sm">Total</span>
                                <span className="text-lg text-stone-300">₱{totalAmount.toLocaleString()}</span>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || totalTickets === 0}
                                className="w-full bg-gradient-to-r from-stone-500 to-zinc-500 hover:from-stone-400 hover:to-zinc-400 text-white text-[11px] font-bold tracking-[0.2em] uppercase py-3.5 rounded-full transition disabled:opacity-40"
                            >
                                {submitting ? 'Processing...' : 'Confirm Booking'}
                            </button>
                            
                            <div className="mt-4 p-5 rounded-3xl bg-[#1b1d20] border border-white/10 shadow-inner group">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-orange-500/10 rounded-full">
                                        <svg className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-300">Default Non-Refundable Policy</h3>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-tighter shrink-0">01.</span>
                                        <p className="text-[10px] leading-relaxed text-zinc-400">
                                            All sales are <span className="text-orange-300 font-bold uppercase tracking-widest text-[9px]">final</span>. Tickets are non-refundable by default.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-tighter shrink-0">02.</span>
                                        <p className="text-[10px] leading-relaxed text-zinc-400">
                                            Refunds are only issued if the event is officially <span className="text-white font-bold underline decoration-blue-500 underline-offset-2 tracking-wide">cancelled</span>.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-tighter shrink-0">03.</span>
                                        <p className="text-[10px] leading-relaxed text-zinc-400 italic">
                                            Service fees may be non-refundable. Booking confirms acceptance of these terms.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-500 text-center mt-4">By booking you agree to our terms & conditions.</p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookingForm;
