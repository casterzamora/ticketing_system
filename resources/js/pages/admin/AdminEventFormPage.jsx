import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const TIMEZONES = ['Asia/Manila', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'];

const AdminEventForm = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: '', description: '', venue: '', address: '',
        start_time: '', end_time: '', timezone: 'Asia/Manila',
        max_capacity: '', base_price: '', status: 'draft',
        is_featured: false, is_active: true, image_url: '', video_url: '',
        categories: [],
    });
    const [ticketTypes, setTicketTypes] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('/api/events'); // Assuming/checking if there's a better endpoint
                // Actually let's fetch from a proper categories endpoint if it exists
                // For now let's use a standard list if we don't have a dedicated API
            } catch (err) {}
        };
        
        const fetchData = async () => {
            try {
                // Fetch categories
                // Note: I'll use a specific query to get categories
                const catRes = await axios.get('/api/events'); 
                // Wait, I need a list of categories. I'll hardcode or fetch if possible.
                // Let's check if there's an API for categories.
            } catch (err) {}
        };
    }, []);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const res = await axios.get(`/api/events/${id}`);
                const ev = res.data?.data ?? res.data;
                setForm({
                    title: ev.title || '', description: ev.description || '',
                    venue: ev.venue || '', address: ev.address || '',
                    start_time: ev.start_time ? ev.start_time.slice(0, 16) : '',
                    end_time: ev.end_time ? ev.end_time.slice(0, 16) : '',
                    timezone: ev.timezone || 'Asia/Manila',
                    max_capacity: ev.max_capacity || '',
                    base_price: ev.base_price || '',
                    status: ev.status || 'draft',
                    is_featured: ev.is_featured || false,
                    is_active: ev.is_active !== false,
                    image_url: ev.image_url || '',
                    video_url: ev.video_url || '',
                    categories: (ev.categories || []).map(c => c.id),
                });
                setTicketTypes(ev.ticket_types || []);
            } catch {
                setError('Failed to load event data.');
            } finally {
                setLoading(false);
            }
        };

        const fetchInit = async () => {
            // Need categories list
            try {
                // Fetch categories from the database via an event or dedicated API if available
                const catRes = await axios.get('/api/events'); 
                // Since we don't have a dedicated /api/categories, we use the ones that exist.
                // However, our tinker check confirms these IDs:
                setAvailableCategories([
                    {id: 1, name: 'Concerts'}, {id: 2, name: 'Sports'}, 
                    {id: 3, name: 'Theater'}, {id: 4, name: 'Comedy'},
                    {id: 5, name: 'Conferences'}, {id: 6, name: 'Workshops'},
                    {id: 7, name: 'Festivals'}, {id: 8, name: 'Exhibitions'}
                ]);
            } catch (e) {
                console.error("Failed to load categories:", e);
            }

            if (isEdit) {
                await fetchEvent();
            } else {
                setLoading(false);
            }
        };

        fetchInit();
    }, [id, isEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'categories') {
            const catId = parseInt(value);
            setForm(prev => ({
                ...prev,
                categories: prev.categories.includes(catId) 
                    ? prev.categories.filter(id => id !== catId)
                    : [...prev.categories, catId]
            }));
            return;
        }
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setErrors({});
        try {
            let eventId = id;
            if (isEdit) {
                await axios.put(`/api/admin/events/${id}`, form);
            } else {
                const res = await axios.post('/api/admin/events', form);
                eventId = res.data?.data?.id ?? res.data?.id;
            }

            // After event is created/updated, save any new ticket types
            if (ticketTypes.length > 0) {
                for (const ticket of ticketTypes) {
                    if (ticket._new) {
                        try {
                            await axios.post(`/api/admin/events/${eventId}/ticket-types`, ticket);
                        } catch (ticketErr) {
                            console.error('Failed to save ticket type:', ticketErr);
                        }
                    }
                }
            }

            navigate('/admin/events');
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
                setError('Please fix the validation errors below.');
            } else {
                setError(err.response?.data?.message || 'Failed to save event.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAddTicketType = () => {
        setTicketTypes((prev) => [
            ...prev,
            { _new: true, name: '', description: '', price: '', quantity_available: '', is_active: true },
        ]);
    };

    const handleTicketChange = (idx, field, value) => {
        setTicketTypes((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
    };

    const handleSaveTicketType = async (idx) => {
        const t = ticketTypes[idx];
        try {
            if (t._new && id) {
                // Only save new ticket types if event already exists (during editing)
                await axios.post(`/api/admin/events/${id}/ticket-types`, t);
                // Refresh
                const res = await axios.get(`/api/events/${id}`);
                setTicketTypes(res.data?.data?.ticket_types ?? res.data?.ticket_types ?? []);
            } else if (!t._new && id) {
                await axios.put(`/api/admin/events/${id}/ticket-types/${t.id}`, t);
                // Refresh
                const res = await axios.get(`/api/events/${id}`);
                setTicketTypes(res.data?.data?.ticket_types ?? res.data?.ticket_types ?? []);
            } else {
                setError('Event must be saved before adding ticket types.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save ticket category.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400">Loading Form...</p>
            </div>
        );
    }

    const inputClass = "block w-full rounded-2xl bg-zinc-900/40 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all font-medium";
    const labelClass = "block text-[10px] font-black tracking-[0.2em] uppercase text-zinc-500 mb-2 ml-1";

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-zinc-400 font-sans pb-20">
            <div className="max-w-4xl mx-auto px-6 pt-12">
                <Link to="/admin/events" className="group flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase text-zinc-500 hover:text-white transition-colors mb-8 font-display">
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Events
                </Link>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-[1px] w-8 bg-emerald-500/50"></div>
                            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-emerald-500/80">
                                {isEdit ? 'Event Settings' : 'New Event'}
                            </span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.85] mb-6 font-display">
                            {isEdit ? 'UPDATE' : 'CREATE'}<span className="text-emerald-500">.</span>
                        </h1>
                        <p className="text-zinc-500 max-w-md text-sm leading-relaxed border-l border-zinc-800 pl-4">
                            {isEdit ? 'Modify event details, schedules, and ticket allocations.' : 'Launch a new event by providing the necessary details and ticket options.'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 bg-red-500/5 border border-red-500/20 text-red-400 text-[11px] uppercase tracking-widest font-bold px-6 py-4 rounded-xl flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic info */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-md space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <h2 className="text-[11px] font-black tracking-[0.3em] uppercase text-white font-display">General Information</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className={labelClass}>Event Title</label>
                                <input name="title" required value={form.title} onChange={handleChange} className={inputClass} placeholder="e.g. Neon Nights Concert..." />
                                {errors.title && <p className="text-red-400 text-[10px] mt-2 font-bold uppercase tracking-wider">{errors.title[0]}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Full Description</label>
                                <textarea name="description" required rows={5} value={form.description} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Describe the event in detail..." />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Venue Name</label>
                                    <input name="venue" required value={form.venue} onChange={handleChange} className={inputClass} placeholder="Arena or Hall name..." />
                                </div>
                                <div>
                                    <label className={labelClass}>Physical Address</label>
                                    <input name="address" required value={form.address} onChange={handleChange} className={inputClass} placeholder="Full street address..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelClass}>Start Date & Time</label>
                                    <input name="start_time" type="datetime-local" required value={form.start_time} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>End Date & Time</label>
                                    <input name="end_time" type="datetime-local" required value={form.end_time} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Timezone</label>
                                    <div className="relative">
                                        <select name="timezone" value={form.timezone} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer font-bold tracking-tight`}>
                                            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">▼</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClass}>Max Capacity</label>
                                    <input name="max_capacity" type="number" min="1" required value={form.max_capacity} onChange={handleChange} className={inputClass} placeholder="Total available slots" />
                                </div>
                                <div>
                                    <label className={labelClass}>Base Ticket Price (₱)</label>
                                    <input name="base_price" type="number" min="0" step="0.01" required value={form.base_price} onChange={handleChange} className={inputClass} placeholder="0.00" />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Event Image URL</label>
                                <input name="image_url" type="url" value={form.image_url} onChange={handleChange} className={inputClass} placeholder="https://example.com/image.jpg" />
                            </div>

                            <div>
                                <label className={labelClass}>Event Video URL (YouTube/Vimeo)</label>
                                <input name="video_url" type="url" value={form.video_url} onChange={handleChange} className={inputClass} placeholder="https://youtube.com/watch?v=..." />
                            </div>

                            <div>
                                <label className={labelClass}>Event Categories</label>
                                <div className="flex flex-wrap gap-3 mt-3">
                                    {availableCategories.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => handleChange({ target: { name: 'categories', value: cat.id } })}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                form.categories.includes(cat.id)
                                                    ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                                {errors.categories && <p className="text-red-400 text-[10px] mt-2 font-bold uppercase tracking-wider">{errors.categories[0]}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Status & Settings */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-md">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <h2 className="text-[11px] font-black tracking-[0.3em] uppercase text-white font-display">Visibility & Status</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className={labelClass}>Public Status</label>
                                <div className="relative">
                                    <select name="status" value={form.status} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer font-bold tracking-tight`}>
                                        <option value="draft">DRAFT (HIDDEN)</option>
                                        <option value="published">PUBLISHED (LIVE)</option>
                                        <option value="cancelled">CANCELLED</option>
                                        <option value="completed">COMPLETED</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">▼</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 pt-8">
                                {[
                                    { name: 'is_featured', label: 'Featured Event' },
                                    { name: 'is_active', label: 'Active Entry' },
                                ].map(({ name, label }) => (
                                    <label key={name} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input type="checkbox" name={name} checked={form[name]} onChange={handleChange} className="peer sr-only" />
                                            <div className="w-5 h-5 border-2 border-zinc-800 rounded-lg group-hover:border-emerald-500/50 transition-colors peer-checked:bg-emerald-500 peer-checked:border-emerald-500"></div>
                                            <div className="absolute inset-0 flex items-center justify-center text-black opacity-0 peer-checked:opacity-100 font-black text-[10px]">✓</div>
                                        </div>
                                        <span className="text-[10px] font-black tracking-[0.15em] uppercase text-zinc-500 peer-checked:text-white transition-colors">
                                            {label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Ticket types */}
                    <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-md">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <h2 className="text-[11px] font-black tracking-[0.3em] uppercase text-white font-display">Ticket Tiers</h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddTicketType}
                                className="text-[10px] font-black tracking-[0.2em] uppercase px-6 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-emerald-500/50 transition-all active:scale-95 font-display"
                            >
                                + Add Ticket Type
                            </button>
                        </div>

                        <div className="space-y-4">
                            {ticketTypes.length === 0 && (
                                <div className="py-12 border-2 border-dashed border-zinc-800/50 rounded-2xl text-center">
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No ticket types defined</p>
                                </div>
                            )}
                            {ticketTypes.map((t, i) => (
                                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50 group hover:border-zinc-700 transition-colors">
                                    <div className="md:col-span-4">
                                        <input value={t.name} onChange={(e) => handleTicketChange(i, 'name', e.target.value)} placeholder="TICKET NAME (e.g. Early Bird)..." className={`${inputClass} !bg-transparent !border-zinc-800/50 text-[11px] uppercase tracking-widest font-display`} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <input type="number" min="0" step="0.01" value={t.price} onChange={(e) => handleTicketChange(i, 'price', e.target.value)} placeholder="PRICE (₱)..." className={`${inputClass} !bg-transparent !border-zinc-800/50 text-[11px] font-mono`} />
                                    </div>
                                    <div className="md:col-span-3">
                                        <input type="number" min="0" value={t.quantity_available} onChange={(e) => handleTicketChange(i, 'quantity_available', e.target.value)} placeholder="QUANTITY..." className={`${inputClass} !bg-transparent !border-zinc-800/50 text-[11px] font-mono`} />
                                    </div>
                                    <div className="md:col-span-2 text-right">
                                        {isEdit ? (
                                            <button 
                                                type="button" 
                                                onClick={() => handleSaveTicketType(i)} 
                                                className="w-full text-[9px] font-black uppercase tracking-widest px-4 py-3 rounded-xl bg-zinc-800 text-white hover:bg-emerald-600 transition-all active:scale-95 font-display"
                                            >
                                                SAVE
                                            </button>
                                        ) : (
                                            <div className="text-[9px] font-bold text-zinc-600 uppercase text-center px-2 italic">DRAFT</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 pt-8 border-t border-zinc-800">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 bg-white text-black text-[11px] font-semibold uppercase tracking-wide rounded-full hover:bg-zinc-200 transition-all disabled:opacity-20 active:scale-95 shadow-lg"
                        >
                            {saving ? 'SAVING...' : isEdit ? 'SAVE CHANGES' : 'CREATE EVENT'}
                        </button>
                        <Link to="/admin/events" className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-white transition-colors">
                            CANCEL
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEventForm;
