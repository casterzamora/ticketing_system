import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EventDetail = ({ isAuthenticated }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await axios.get(`/api/events/${id}`);
                setEvent(res.data?.data ?? res.data);
            } catch {
                setError('Event not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[11px] tracking-[0.3em] uppercase text-zinc-400">Loading event...</p>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <p className="text-red-400">{error || 'Event not found.'}</p>
                <Link to="/events" className="text-zinc-300 hover:text-white text-sm">Back to Events</Link>
            </div>
        );
    }

    const startDate = event.start_time ? new Date(event.start_time) : null;
    const endDate = event.end_time ? new Date(event.end_time) : null;
    const cheapest = event.ticket_types?.reduce((min, t) => t.price < min ? t.price : min, Infinity);

    return (
        <div className="min-h-screen">
            {/* Hero banner */}
            <div
                className="relative h-72 sm:h-80 lg:h-96 bg-cover bg-center border-b border-white/10"
                style={{ backgroundImage: event.image_url ? `url(${event.image_url})` : 'none', backgroundColor: '#15171a' }}
            >
                <div className="absolute inset-0 site-hero-shade" />
                <div className="absolute bottom-0 left-0 right-0 p-6 max-w-7xl mx-auto z-10">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {event.categories?.map((c) => (
                            <span key={c.id} className="text-[10px] font-bold tracking-widest uppercase bg-zinc-200 text-zinc-900 px-2 py-0.5 rounded-full">
                                {c.name}
                            </span>
                        ))}
                    </div>
                    {event.status === 'rescheduled' && (
                        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500 text-black rounded-lg shadow-xl">
                            <span className="text-[11px] font-black tracking-tighter uppercase whitespace-nowrap">Event Re-scheduled</span>
                        </div>
                    )}
                    <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">{event.title}</h1>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left – Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Rescheduled Notice */}
                    {event.status === 'rescheduled' && event.original_start_time && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top duration-500">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-emerald-400">📅</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-emerald-400 tracking-wide uppercase">Event Rescheduled</h3>
                                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                    The organizer has moved this event to a new date. 
                                    {event.original_start_time && (
                                        <span className="block mt-1 font-medium italic">
                                            Original date: {new Date(event.original_start_time).toLocaleDateString('en-PH', { 
                                                weekday: 'long', 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Info row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            {
                                label: 'Date & Time',
                                value: startDate
                                    ? startDate.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                                    : 'TBA',
                                sub: startDate
                                    ? `${startDate.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}${endDate ? ' – ' + endDate.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''}`
                                    : '',
                            },
                            { label: 'Venue',  value: event.venue, sub: event.address },
                            { 
                                label: 'Inventory', 
                                value: event.remaining_total > 0 ? `${event.remaining_total.toLocaleString()} Tickets` : 'SOLD OUT', 
                                sub: `${((event.max_capacity - event.remaining_total) / event.max_capacity * 100).toFixed(0)}% Reserved` 
                            },
                        ].map(({ label, value, sub }) => (
                            <div key={label} className="bg-[#141618]/90 border border-white/10 rounded-xl p-4">
                                <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400">{label}</p>
                                <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
                                {sub && <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Description */}
                    <div className="bg-[#141618]/90 border border-white/10 rounded-xl p-5">
                        <h2 className="font-display text-xl tracking-[0.08em] uppercase text-zinc-200 mb-3">About This Event</h2>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{event.description}</p>
                    </div>

                    {/* Video Embed */}
                    {event.video_url && getYouTubeId(event.video_url) && (
                        <div className="bg-[#141618]/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                            <div className="p-5 border-b border-white/5">
                                <h2 className="font-display text-xl tracking-[0.08em] uppercase text-zinc-200">Official Trailer</h2>
                            </div>
                            <div className="aspect-video">
                                <iframe
                                    className="w-full h-full"
                                    src={`https://www.youtube.com/embed/${getYouTubeId(event.video_url)}?autoplay=0&mute=0&rel=0`}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </div>
                    )}

                    {/* Ticket types */}
                    {event.ticket_types?.length > 0 && (
                        <div className="bg-[#141618]/90 border border-white/10 rounded-xl p-5">
                            <h2 className="font-display text-xl tracking-[0.08em] uppercase text-zinc-200 mb-4">Ticket Types</h2>
                            <div className="space-y-3">
                                {event.ticket_types.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between border border-white/10 rounded-lg px-4 py-3 bg-white/[0.02]">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-white">{t.name}</p>
                                                {t.remaining > 0 && t.remaining <= 10 && (
                                                    <span className="text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded animate-pulse">
                                                        🔥 ALMOST SOLD OUT
                                                    </span>
                                                )}
                                            </div>
                                            {t.description && <p className="text-[11px] text-zinc-400">{t.description}</p>}
                                            <p className="text-[11px] text-zinc-400 mt-0.5">
                                                {t.remaining > 0 ? (
                                                    <span>
                                                        {t.remaining.toLocaleString()} left / {t.quantity_available.toLocaleString()} total
                                                    </span>
                                                ) : (
                                                    <span className="text-red-400">Sold Out</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-extrabold text-stone-300">₱{t.price.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="soft-highlight-card p-5">
                        <h2 className="font-display text-xl tracking-[0.08em] uppercase text-zinc-200 mb-3">Event Experience</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300">
                            <div className="kpi-chip">Digital ticket confirmation and booking reference are issued instantly.</div>
                            <div className="kpi-chip">Seat allocation and ticket limits are validated in real time.</div>
                            <div className="kpi-chip">Ticket availability displayed here updates from active inventory counts.</div>
                            <div className="kpi-chip">Refund requests are supported through your booking history dashboard.</div>
                        </div>
                    </div>
                </div>

                {/* Right – CTA */}
                <div className="lg:col-span-1">
                    <div className="sticky top-20 bg-[#141618]/95 border border-white/10 rounded-xl p-5 space-y-4">
                        <h2 className="font-display text-xl tracking-[0.08em] uppercase text-zinc-200">Get Tickets</h2>
                        {cheapest < Infinity && (
                            <p className="text-3xl font-extrabold text-white">
                                ₱{cheapest.toLocaleString()}
                                <span className="text-sm text-zinc-400 font-normal ml-1">/ ticket</span>
                            </p>
                        )}
                        {event.status === 'published' && event.ticket_types?.some((t) => t.remaining > 0) ? (
                            isAuthenticated ? (
                                <button
                                    onClick={() => navigate(`/events/${event.id}/book`)}
                                    className="w-full btn-primary-neutral text-[11px] font-bold tracking-[0.2em] uppercase py-3.5 rounded-full transition"
                                >
                                    Book Now
                                </button>
                            ) : (
                                <Link
                                    to="/login"
                                    className="block w-full text-center btn-primary-neutral text-[11px] font-bold tracking-[0.2em] uppercase py-3.5 rounded-full transition"
                                >
                                    Sign in to Book
                                </Link>
                            )
                        ) : (
                            <div className="w-full text-center bg-zinc-800 text-zinc-500 text-[11px] font-bold tracking-[0.2em] uppercase py-3.5 rounded-full cursor-not-allowed">
                                {event.status !== 'published' ? 'Not Available' : 'Sold Out'}
                            </div>
                        )}
                        <div className="subtle-divider" />
                        <ul className="text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
                            <li className="flex gap-2">
                                <span className="text-zinc-300">•</span>
                                Secure checkout with session-based authentication.
                            </li>
                            <li className="flex gap-2">
                                <span className="text-zinc-300">•</span>
                                One booking reference per order for easy tracking.
                            </li>
                            <li className="flex gap-2 group">
                                <span className="text-zinc-300">•</span>
                                <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">Non-refundable by default. Full refunds only for cancelled events.</span>
                            </li>
                            <li className="flex gap-2 group">
                                <span className="text-zinc-300">•</span>
                                <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">Rescheduled events valid for the new date.</span>
                            </li>
                        </ul>
                        <Link to="/events" className="block text-center text-xs text-zinc-500 hover:text-zinc-300 transition">
                            Back to all events
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetail;
