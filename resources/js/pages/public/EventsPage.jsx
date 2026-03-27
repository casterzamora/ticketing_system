import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Events = ({ isAuthenticated }) => {
    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('/api/categories');
                setCategories(res.data || []);
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, []);

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
        const timeoutId = setTimeout(() => {
            fetchEvents();
        }, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [search, category, fetchEvents]);

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        fetchEvents();
    };

    // Filter featured events for carousel
    const featuredEvents = events.filter(e => e.is_featured).slice(0, 5);
    
    // Filter events with video URLs for "What We're Watching"
    const videoEvents = events.filter(e => e.video_url).slice(0, 4);
    
    // Group events by month for the list view
    const groupedEvents = events.reduce((acc, event) => {
        const date = new Date(event.start_time);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!acc[monthYear]) acc[monthYear] = [];
        acc[monthYear].push(event);
        return acc;
    }, {});

    // Auto-advance carousel
    useEffect(() => {
        if (featuredEvents.length > 1) {
            const timer = setInterval(() => {
                setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
            }, 5000);
            return () => clearInterval(timer);
        }
    }, [featuredEvents.length]);

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
            
            {/* Featured Carousel */}
            {featuredEvents.length > 0 && (
                <section className="relative h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden border-b border-white/10">
                    {featuredEvents.map((event, idx) => (
                        <div
                            key={event.id}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                                idx === currentSlide ? 'opacity-100' : 'opacity-0'
                            }`}
                        >
                            <img
                                src={event.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1600'}
                                alt={event.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#151618] via-transparent to-transparent" />
                            <div className="absolute bottom-16 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="max-w-2xl space-y-4">
                                    <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-stone-300">
                                        Featured Event
                                    </p>
                                    <h2 className="text-4xl sm:text-6xl font-display font-bold leading-none text-white">
                                        {event.title}
                                    </h2>
                                    <p className="text-sm sm:text-lg text-zinc-300 line-clamp-2 max-w-lg">
                                        {event.description}
                                    </p>
                                    <div className="pt-2 flex flex-wrap gap-4">
                                        <Link
                                            to={`/events/${event.id}`}
                                            className="text-[11px] font-semibold tracking-[0.22em] uppercase bg-white text-black px-8 py-3 rounded-xl hover:bg-zinc-200 transition shadow-lg"
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Carousel Indicators */}
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
                        {featuredEvents.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                    idx === currentSlide ? 'bg-white w-6' : 'bg-white/30'
                                }`}
                            />
                        ))}
                    </div>
                </section>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                {/* Search and Filters */}
                <div className="mb-12">
                    <form
                        onSubmit={handleSearch}
                        className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center bg-[#111315]/85 border border-white/10 rounded-2xl px-4 py-4"
                    >
                        <input
                            type="text"
                            placeholder="Search by artist, team or venue"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="sm:col-span-3 bg-[#17191c] border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all"
                        />
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="sm:col-span-1 bg-[#17191c] border border-white/10 text-xs text-zinc-100 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all"
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.slug}>{c.name}</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="sm:col-span-1 text-[11px] font-semibold tracking-[0.22em] uppercase btn-primary-neutral px-5 py-3 rounded-xl transition"
                        >
                            Find Events
                        </button>
                    </form>
                </div>

                {/* "What We're Watching" Section */}
                <section className="mb-16">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
                        <div>
                            <h2 className="content-section-title">What We're Watching</h2>
                            <p className="text-xs text-zinc-400 mt-1">Exclusive trailers and announcements</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {videoEvents.length > 0 ? (
                            videoEvents.map((event) => (
                                <a 
                                    key={event.id} 
                                    href={event.video_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="group cursor-pointer block"
                                >
                                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3 border border-white/10">
                                        <img src={event.image_url || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=400'} alt={event.title} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 transform scale-90 group-hover:scale-100 transition duration-300">
                                                <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-[13px] font-semibold text-zinc-100 group-hover:text-white transition line-clamp-2 uppercase tracking-wider font-display">{event.title}</h3>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Watch Now</p>
                                </a>
                            ))
                        ) : (
                            <div className="col-span-full py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
                                <p className="text-[11px] tracking-[0.2em] uppercase text-zinc-500">No videos available right now</p>
                                <p className="text-[9px] text-zinc-600 mt-2 uppercase tracking-widest">Featured videos will appear here</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Grouped Events List */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="content-section-title">Upcoming Shows</h2>
                        <span className="text-[11px] text-zinc-500 uppercase tracking-[0.2em]">
                            {events.length} {events.length === 1 ? 'event' : 'events'} found
                        </span>
                    </div>

                    {Object.keys(groupedEvents).length === 0 ? (
                        <div className="py-20 text-center border border-white/10 bg-white/[0.02] rounded-2xl">
                            <p className="text-zinc-500 text-sm">No upcoming shows found matching your filters.</p>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {Object.entries(groupedEvents).map(([monthYear, monthEvents]) => (
                                <div key={monthYear} className="space-y-4">
                                    <h3 className="text-lg font-bold text-stone-300 border-b border-white/10 pb-2 ml-2 tracking-wide">
                                        {monthYear}
                                    </h3>
                                    <div className="divide-y divide-white/5">
                                        {monthEvents.map((event) => {
                                            const startDate = new Date(event.start_time);
                                            const day = startDate.getDate();
                                            const weekday = startDate.toLocaleString('default', { weekday: 'short' });
                                            const monthShort = startDate.toLocaleString('default', { month: 'short' });

                                            return (
                                                <div key={event.id} className="group flex flex-col sm:flex-row items-start sm:items-center py-6 px-4 hover:bg-white/[0.03] transition rounded-2xl border border-transparent hover:border-white/5">
                                                    {/* Date Column */}
                                                    <div className="flex sm:flex-col items-center justify-center min-w-[70px] text-center mb-4 sm:mb-0">
                                                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{weekday}</span>
                                                        <span className="text-3xl font-display font-bold text-white my-0.5">{day}</span>
                                                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{monthShort}</span>
                                                    </div>

                                                    {/* Image (Small Tile) */}
                                                    <div className="sm:mx-8 w-24 h-24 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/10">
                                                        <img 
                                                            src={event.image_url || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=200'}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                                            alt={event.title}
                                                        />
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-grow min-w-0 pr-4 mt-2 sm:mt-0">
                                                        <div className="flex items-center gap-2 mb-1 text-[10px] font-bold tracking-[0.2em] uppercase">
                                                            <span className="text-stone-300">
                                                                {event.categories?.[0]?.name || 'Featured'}
                                                            </span>
                                                            {event.is_featured && (
                                                                <span className="bg-white/5 text-stone-200 text-[9px] px-2 py-0.5 rounded border border-white/10">
                                                                    NEW
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-base sm:text-lg font-bold text-white hover:text-stone-300 transition truncate">
                                                            {event.title}
                                                        </h4>
                                                        <p className="text-xs text-zinc-400 mt-1 flex items-center">
                                                            <span className="truncate">{event.venue} | {event.address?.split(',')[0]}</span>
                                                        </p>
                                                    </div>

                                                    {/* Action */}
                                                    <div className="mt-6 sm:mt-0 flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                                                        <Link
                                                            to={`/events/${event.id}`}
                                                            className="w-full sm:w-auto text-center text-[10px] font-semibold tracking-[0.2em] uppercase bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl border border-white/10 transition"
                                                        >
                                                            Find Tickets
                                                        </Link>
                                                        {event.available_capacity <= 0 && (
                                                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold text-right mr-2">Sold Out</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Events;
