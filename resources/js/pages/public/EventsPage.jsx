import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Events = ({ isAuthenticated }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (category) params.append('category', category);

            const response = await axios.get(`/api/events?${params.toString()}`);

            // Laravel API resources typically return { data: [...] }
            const payload = response?.data;
            const items = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                    ? payload.data
                    : [];

            setEvents(items);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    }, [search, category]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchEvents();
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-b from-[#151618] to-[#0f1011]">
                <div className="text-[11px] tracking-[0.3em] uppercase text-zinc-400">
                    Loading shows...
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="ambient-orb ambient-orb-warm w-48 h-48 top-20 -left-8 opacity-70" />
            <div className="ambient-orb ambient-orb-metal w-56 h-56 top-40 right-0 opacity-70" />
            <section className="site-hero-shade border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
                            <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-stone-300">
                                Live This Week
                            </p>
                            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] text-white">
                                Discover concerts & events
                            </h1>
                            <p className="text-sm sm:text-base text-zinc-300 max-w-xl">
                                Browse shows, reserve seats, manage bookings.
                            </p>

                            <form
                                onSubmit={handleSearch}
                                className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3 sm:items-center bg-[#111315]/85 border border-white/10 rounded-2xl px-4 py-4"
                            >
                                <input
                                    type="text"
                                    placeholder="Search events"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="sm:col-span-3 bg-[#17191c] border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                />
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="sm:col-span-1 bg-[#17191c] border border-white/10 text-xs text-zinc-100 rounded-xl px-3 py-3 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                >
                                    <option value="">All Categories</option>
                                    <option value="concerts">Concerts</option>
                                    <option value="sports">Sports</option>
                                    <option value="theater">Theater</option>
                                    <option value="comedy">Comedy</option>
                                    <option value="conferences">Conferences</option>
                                    <option value="workshops">Workshops</option>
                                </select>
                                <button
                                    type="submit"
                                    className="sm:col-span-1 mt-1 sm:mt-0 text-[11px] font-semibold tracking-[0.22em] uppercase btn-primary-neutral px-5 py-3 rounded-xl transition"
                                >
                                    Find Events
                                </button>
                            </form>

                            <div className="pt-2 grid grid-cols-3 gap-3 max-w-xl">
                                {[
                                    ['250+', 'ANNUAL EVENTS'],
                                    ['98%', 'BOOKING SUCCESS'],
                                    ['24/7', 'TICKET ACCESS'],
                                ].map(([value, label]) => (
                                    <div key={label} className="border border-white/10 bg-white/[0.02] rounded-lg px-3 py-2">
                                        <p className="font-display text-2xl font-semibold text-white">{value}</p>
                                        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400">{label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="subtle-divider max-w-xl" />

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                                {[
                                    ['Verified Inventory', 'Real-time seat count from your backend'],
                                    ['Secure Checkout', 'Session-based login and CSRF-protected booking flow'],
                                    ['Fast Support', 'Refund reviews and status updates in one dashboard'],
                                ].map(([title, desc]) => (
                                    <div key={title} className="soft-highlight-card p-3">
                                        <p className="text-xs tracking-[0.16em] uppercase text-zinc-300">{title}</p>
                                        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="hidden lg:block">
                            <div className="rounded-2xl border border-white/10 bg-[#15171a] shadow-xl">
                                <div className="rounded-2xl p-5 h-full flex flex-col justify-between">
                                    <div>
                                        <p className="text-[11px] tracking-[0.25em] uppercase text-zinc-400">
                                            Featured
                                        </p>
                                        <p className="mt-1 text-base font-semibold text-white">
                                            {events[0]?.title || 'No upcoming shows'}
                                        </p>
                                        {events[0] && (
                                            <p className="mt-1 text-xs text-zinc-400">
                                                {new Date(events[0].start_time).toLocaleDateString()} ·{' '}
                                                {events[0].venue}
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-4 text-[11px] text-zinc-500 leading-relaxed">
                                        Real-time seat inventory and booking updates.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-10 sm:py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
                        <h2 className="content-section-title">How It Works</h2>
                        <p className="text-xs text-zinc-400 max-w-md">Discover, book, and manage events.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            ['1. Discover', 'Search and find events.'],
                            ['2. Reserve', 'Select tickets and confirm.'],
                            ['3. Manage', 'Track bookings and request refunds.'],
                        ].map(([title, body]) => (
                            <article key={title} className="soft-highlight-card p-5">
                                <h3 className="font-display text-3xl text-white leading-none">{title}</h3>
                                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Events grid */}
            <section className="bg-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-[0.08em] uppercase text-zinc-100">
                            Upcoming Shows
                        </h2>
                        <span className="text-[11px] text-zinc-500">
                            {events.length} {events.length === 1 ? 'event' : 'events'} found
                        </span>
                    </div>

                    {events.length === 0 ? (
                        <div className="py-16 text-center text-zinc-400 text-sm border border-white/10 bg-white/[0.02] rounded-xl">
                            No events match your filters right now. Try clearing your search or checking
                            back later.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {events.map((event, index) => {
                                const start = event.start_time
                                    ? new Date(event.start_time)
                                    : null;

                                const dateLabel = start
                                    ? start.toLocaleDateString(undefined, {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                      })
                                    : 'TBA';

                                const price =
                                    typeof event.base_price !== 'undefined'
                                        ? Number(event.base_price)
                                        : null;

                                const ticketsLeft =
                                    typeof event.available_capacity !== 'undefined'
                                        ? Number(event.available_capacity)
                                        : null;

                                const soldOut = ticketsLeft !== null && ticketsLeft <= 0;

                                return (
                                    <article
                                        key={event.id}
                                        className="group bg-[#141517]/92 border border-white/10 rounded-xl overflow-hidden flex flex-col hover:border-zinc-400/50 hover:shadow-[0_14px_30px_rgba(0,0,0,0.3)] transition animate-fade-up"
                                        style={{ animationDelay: `${Math.min(index * 55, 280)}ms` }}
                                    >
                                        {/* Image / banner */}
                                        {event.image_url ? (
                                            <div className="relative h-40 overflow-hidden">
                                                <img
                                                    src={event.image_url}
                                                    alt={event.title}
                                                    className="w-full h-full object-cover transform group-hover:scale-105 transition"
                                                />
                                                {soldOut && (
                                                    <span className="absolute top-3 left-3 bg-[#181a1d]/95 border border-white/10 text-[10px] font-semibold tracking-[0.2em] uppercase text-white px-3 py-1 rounded-full">
                                                        Sold Out
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative h-40 bg-gradient-to-br from-[#191b1f] via-[#15171a] to-[#111214] flex items-center justify-center">
                                                <span className="text-xs tracking-[0.25em] uppercase text-zinc-500">
                                                    No Image
                                                </span>
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 flex flex-col p-4 space-y-2">
                                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                                <span className="uppercase tracking-[0.2em] text-stone-300">
                                                    {event.categories?.[0]?.name || 'Featured'}
                                                </span>
                                                <span>{dateLabel}</span>
                                            </div>

                                            <h3 className="text-base sm:text-lg font-semibold text-white line-clamp-2">
                                                {event.title}
                                            </h3>

                                            <p className="text-xs text-zinc-400 line-clamp-2">
                                                {event.description}
                                            </p>

                                            <p className="text-[11px] text-zinc-500 flex items-center uppercase tracking-[0.14em]">
                                                <span className="mr-1">Venue:</span>
                                                <span className="truncate">{event.venue}</span>
                                            </p>

                                            <div className="mt-2 flex items-end justify-between">
                                                <div className="flex flex-col">
                                                    {price !== null && !Number.isNaN(price) ? (
                                                        <>
                                                            <span className="text-[11px] text-zinc-400 uppercase tracking-[0.18em]">
                                                                From
                                                            </span>
                                                            <span className="text-lg font-bold text-stone-300">
                                                                ₱{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-zinc-400">
                                                            Pricing to be announced
                                                        </span>
                                                    )}
                                                </div>

                                                {ticketsLeft !== null && (
                                                    <span
                                                        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                                            soldOut
                                                                ? 'text-red-300'
                                                                : ticketsLeft < 20
                                                                ? 'text-amber-300'
                                                                : 'text-zinc-300'
                                                        }`}
                                                    >
                                                        {soldOut
                                                            ? 'Sold Out'
                                                            : `${ticketsLeft} left`}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="pt-2">
                                                {soldOut ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="w-full text-[11px] font-semibold tracking-[0.22em] uppercase rounded-full px-4 py-2 border border-zinc-700 text-zinc-500 cursor-not-allowed"
                                                    >
                                                        Join Waitlist
                                                    </button>
                                                ) : (
                                                    <Link
                                                        to={`/events/${event.id}`}
                                                        className="block w-full text-center text-[11px] font-semibold tracking-[0.22em] uppercase rounded-full px-4 py-2 btn-secondary-neutral transition"
                                                    >
                                                        View Tickets
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {!isAuthenticated && (
                <section className="pb-12 sm:pb-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="soft-highlight-card p-6 sm:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                            <div>
                                <p className="text-[11px] tracking-[0.22em] uppercase text-stone-300">Never Miss A Drop</p>
                                <h3 className="font-display text-4xl sm:text-5xl text-white leading-none mt-1">Get early access to top events</h3>
                                <p className="text-sm text-zinc-400 mt-2 max-w-xl">
                                    Create an account to unlock faster booking, order history, and priority access once events are published.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Link to="/register" className="btn-primary-neutral text-[11px] font-semibold tracking-[0.2em] uppercase px-5 py-3 rounded-xl transition">Create Account</Link>
                                <Link to="/login" className="btn-secondary-neutral text-[11px] font-semibold tracking-[0.2em] uppercase px-5 py-3 rounded-xl transition">Sign In</Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Events;
