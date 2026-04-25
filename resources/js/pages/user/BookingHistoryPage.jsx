import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';

const BookingHistory = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const res = await axios.get('/api/user/bookings');
                const data = res.data?.data ?? res.data;
                setBookings(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400">Loading bookings...</p>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="page-card p-5 sm:p-6 mb-6">
                    <PageHeader eyebrow="My Account" title="My Bookings" subtitle={`${bookings.length} bookings`} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="kpi-chip">
                            <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Total Orders</p>
                            <p className="font-display text-2xl text-white mt-0.5">{bookings.length}</p>
                        </div>
                        <div className="kpi-chip">
                            <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Confirmed</p>
                            <p className="font-display text-2xl text-white mt-0.5">{bookings.filter((b) => b.status === 'confirmed').length}</p>
                        </div>
                        <div className="kpi-chip">
                            <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Pending</p>
                            <p className="font-display text-2xl text-white mt-0.5">{bookings.filter((b) => b.status === 'pending').length}</p>
                        </div>
                        <div className="kpi-chip">
                            <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-400">Refunded</p>
                            <p className="font-display text-2xl text-white mt-0.5">{bookings.filter((b) => b.status === 'refunded').length}</p>
                        </div>
                    </div>
                </div>

                {bookings.length === 0 ? (
                    <div className="page-card text-center py-20">
                        <p className="text-zinc-400 text-sm mb-4">No bookings yet.</p>
                        <Link
                            to="/events"
                            className="inline-block btn-primary-neutral text-[11px] font-bold tracking-[0.2em] uppercase px-6 py-3 rounded-full"
                        >
                            Browse Events
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((b) => {
                            const startDate = b.event?.start_time ? new Date(b.event.start_time) : null;
                            return (
                                <div key={b.id} className="page-card overflow-hidden flex flex-col sm:flex-row">
                                    {/* Event image */}
                                    <div
                                        className="sm:w-36 h-24 sm:h-auto bg-cover bg-center shrink-0"
                                        style={{ backgroundImage: b.event?.image_url ? `url(${b.event.image_url})` : 'none', backgroundColor: '#16181b' }}
                                    />
                                    <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="relative">
                                            {b.event?.status === 'rescheduled' && (
                                                <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-black uppercase tracking-widest">
                                                    <span>Re-scheduled</span>
                                                </div>
                                            )}
                                            <p className="text-sm font-semibold text-white">{b.event?.title ?? 'Unknown Event'}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                {b.event?.venue} &bull; {startDate ? startDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                                            </p>
                                            <p className="text-[10px] text-gray-500 mt-1">Ref: {b.booking_reference}</p>
                                        </div>
                                        <div className="flex flex-col items-start sm:items-end gap-2">
                                            <StatusBadge status={b.status} />
                                            <p className="text-sm font-bold text-stone-300">₱{Number(b.total_amount).toLocaleString()}</p>
                                            <p className="text-[11px] text-gray-400">{b.total_tickets} ticket{b.total_tickets !== 1 ? 's' : ''}</p>
                                            <Link
                                                to={`/user/bookings/${b.id}`}
                                                className="text-[10px] text-stone-300 hover:text-stone-200 font-semibold uppercase tracking-widest mt-1"
                                            >
                                                View Details →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingHistory;
