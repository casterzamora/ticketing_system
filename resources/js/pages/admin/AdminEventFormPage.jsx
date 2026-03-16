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
        is_featured: false, is_active: true, image_url: '',
    });
    const [ticketTypes, setTicketTypes] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!isEdit) return;
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
                });
                setTicketTypes(ev.ticket_types || []);
            } catch {
                setError('Failed to load event.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id, isEdit]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
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
            setError(err.response?.data?.message || 'Failed to save ticket type.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400">Loading...</p>
            </div>
        );
    }

    const inputClass = "block w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400";
    const labelClass = "block text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-300 mb-1";

    return (
        <div className="page-shell">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/admin/events" className="text-xs text-gray-400 hover:text-gray-200 mb-6 inline-block">← Events</Link>

                <div className="page-card p-5 sm:p-6 mb-6">
                    <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-none">{isEdit ? 'Edit Event' : 'Create New Event'}</h1>
                    <p className="text-xs text-zinc-400 mt-2">Build complete event profiles with schedule, pricing, and ticket tiers.</p>
                </div>

                {error && (
                    <div className="mb-5 bg-red-900/40 border border-red-500 text-red-200 text-xs px-4 py-3 rounded-xl">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Basic info */}
                    <div className="page-card p-5 space-y-4">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300">Event Details</h2>

                        <div>
                            <label className={labelClass}>Title *</label>
                            <input name="title" required value={form.title} onChange={handleChange} className={inputClass} placeholder="Event title" />
                            {errors.title && <p className="text-red-400 text-[11px] mt-0.5">{errors.title[0]}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Description *</label>
                            <textarea name="description" required rows={4} value={form.description} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Description..." />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Venue *</label>
                                <input name="venue" required value={form.venue} onChange={handleChange} className={inputClass} placeholder="Venue..." />
                            </div>
                            <div>
                                <label className={labelClass}>Address *</label>
                                <input name="address" required value={form.address} onChange={handleChange} className={inputClass} placeholder="Address..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Start Time *</label>
                                <input name="start_time" type="datetime-local" required value={form.start_time} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>End Time *</label>
                                <input name="end_time" type="datetime-local" required value={form.end_time} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Timezone</label>
                                <select name="timezone" value={form.timezone} onChange={handleChange} className={inputClass}>
                                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Max Capacity *</label>
                                <input name="max_capacity" type="number" min="1" required value={form.max_capacity} onChange={handleChange} className={inputClass} placeholder="500" />
                            </div>
                            <div>
                                <label className={labelClass}>Base Price (₱) *</label>
                                <input name="base_price" type="number" min="0" step="0.01" required value={form.base_price} onChange={handleChange} className={inputClass} placeholder="Price" />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Image URL</label>
                            <input name="image_url" type="url" value={form.image_url} onChange={handleChange} className={inputClass} placeholder="https://..." />
                        </div>
                    </div>

                    {/* Status & flags */}
                    <div className="page-card p-5 space-y-4">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300">Status & Settings</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Status</label>
                                <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            {[
                                { name: 'is_featured', label: 'Featured Event' },
                                { name: 'is_active', label: 'Active (visible)' },
                            ].map(({ name, label }) => (
                                <label key={name} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name={name} checked={form[name]} onChange={handleChange} className="w-4 h-4 accent-zinc-500" />
                                    <span className="text-sm text-gray-300">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Ticket types */}
                    <div className="page-card p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300">Ticket Types</h2>
                            <button
                                type="button"
                                onClick={handleAddTicketType}
                                className="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full border border-zinc-500 text-stone-300 hover:bg-zinc-700 hover:text-white transition"
                            >
                                + Add Type
                            </button>
                        </div>
                        {ticketTypes.length === 0 && <p className="text-xs text-gray-500">No ticket types yet. Add one above.</p>}
                        {ticketTypes.map((t, i) => (
                            <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-gray-700 rounded-lg p-3">
                                <input value={t.name} onChange={(e) => handleTicketChange(i, 'name', e.target.value)} placeholder="Type" className={inputClass} />
                                <input type="number" min="0" step="0.01" value={t.price} onChange={(e) => handleTicketChange(i, 'price', e.target.value)} placeholder="Price" className={inputClass} />
                                <input type="number" min="0" value={t.quantity_available} onChange={(e) => handleTicketChange(i, 'quantity_available', e.target.value)} placeholder="Quantity" className={inputClass} />
                                {isEdit ? (
                                    <button type="button" onClick={() => handleSaveTicketType(i)} className="text-[10px] font-bold uppercase px-3 py-2 rounded-full bg-zinc-700 text-white hover:bg-zinc-600 transition">Save</button>
                                ) : (
                                    <span className="text-[10px] text-gray-400 py-2">Save event first</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-gradient-to-r from-stone-500 to-zinc-500 hover:from-stone-400 hover:to-zinc-400 text-white text-[11px] font-bold tracking-[0.2em] uppercase px-8 py-3 rounded-full transition disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
                        </button>
                        <Link to="/admin/events" className="text-[11px] font-bold tracking-widest uppercase px-8 py-3 rounded-full border border-gray-600 text-gray-400 hover:text-white transition">
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEventForm;
