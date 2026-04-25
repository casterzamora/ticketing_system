import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-600',
    awaiting_confirmation: 'bg-yellow-500/20 text-yellow-300 border-yellow-600',
    confirmed: 'bg-green-500/20 text-green-300 border-green-600',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-600',
    refunded: 'bg-blue-500/20 text-blue-300 border-blue-600',
};

const paymentStatusColors = {
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-600',
    successful: 'bg-green-500/20 text-green-300 border-green-600',
    failed: 'bg-red-500/20 text-red-300 border-red-600',
    refunded: 'bg-blue-500/20 text-blue-300 border-blue-600',
};

const BookingDetailPage = () => {
    const { id } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [decisionSaving, setDecisionSaving] = useState('');

    const fetchBooking = async () => {
        try {
            const res = await axios.get(`/api/user/bookings/${id}`);
            setBooking(res.data?.data ?? res.data);
        } catch {
            setError('Booking not found.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBooking();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400">Loading booking...</p>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <p className="text-red-400">{error || 'Booking not found.'}</p>
                <Link to="/user/bookings" className="text-stone-300 text-sm">Back to My Bookings</Link>
            </div>
        );
    }

    const startDate = booking.event?.start_time ? new Date(booking.event.start_time) : null;
    const originalStartDate = booking.event?.original_start_time ? new Date(booking.event.original_start_time) : null;
    const latestPayment = booking.payment_summary || null;
    const refundDeadline = booking.event?.refund_deadline ? new Date(booking.event.refund_deadline) : null;
    const decisionWindowOpen = booking.event?.status === 'rescheduled' && refundDeadline && refundDeadline > new Date();
    const responsePending = !booking.reschedule_response || booking.reschedule_response === 'pending';
    const canRespondReschedule = decisionWindowOpen && responsePending;
    const remainingMs = refundDeadline ? Math.max(0, refundDeadline.getTime() - Date.now()) : 0;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    const handleRescheduleResponse = async (response) => {
        if (!booking?.id || decisionSaving) return;

        setDecisionSaving(response);
        setError('');

        try {
            await axios.post(`/api/user/bookings/reschedule-response/${booking.id}`, { response });
            await fetchBooking();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit your decision.');
        } finally {
            setDecisionSaving('');
        }
    };

    return (
        <div className="page-shell">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/user/bookings" className="text-xs text-gray-400 hover:text-gray-200 mb-6 inline-block">Back to My Bookings</Link>

                <div className="page-card p-5 mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] text-gray-400">Booking Reference</p>
                        <h1 className="font-display text-4xl font-bold text-white leading-none">{booking.booking_reference}</h1>
                    </div>
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${statusColors[booking.status] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                        {booking.status}
                    </span>
                </div>

                <div className="page-card overflow-hidden mb-4">
                    <div
                        className="h-32 bg-cover bg-center"
                        style={{ backgroundImage: booking.event?.image_url ? `url(${booking.event.image_url})` : 'none', backgroundColor: '#0f0f2e' }}
                    />
                    <div className="p-4">
                        <p className="text-sm font-bold text-white">{booking.event?.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {booking.event?.venue} | {startDate ? startDate.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA'}
                        </p>
                    </div>
                </div>

                {booking.event?.status === 'rescheduled' && (
                    <div className="page-card p-5 mb-4 border border-emerald-500/30">
                        <h2 className="text-[11px] font-black tracking-[0.3em] uppercase text-emerald-400 mb-3">Event Rescheduled</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                            <span className="text-gray-500">Previous Schedule</span>
                            <span>{originalStartDate ? originalStartDate.toLocaleString('en-PH') : 'Not available'}</span>
                            <span className="text-gray-500">New Schedule</span>
                            <span>{startDate ? startDate.toLocaleString('en-PH') : 'TBA'}</span>
                            <span className="text-gray-500">Decision Deadline</span>
                            <span>{refundDeadline ? refundDeadline.toLocaleString('en-PH') : 'Not set'}</span>
                            <span className="text-gray-500">Your Response</span>
                            <span className="uppercase tracking-widest text-[10px] font-bold">{booking.reschedule_response || 'pending'}</span>
                        </div>

                        <div className="mt-4 rounded-xl border border-zinc-700 bg-black/30 p-3">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Policy</p>
                            <p className="text-xs text-zinc-300 mt-1">
                                You can choose Keep Ticket or Request Refund until the decision deadline. If no response is submitted before the deadline, your ticket remains valid for the new schedule.
                            </p>
                            {canRespondReschedule && (
                                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 mt-2">
                                    Time left: {remainingHours}h {remainingMinutes}m
                                </p>
                            )}
                        </div>

                        {canRespondReschedule && (
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    onClick={() => handleRescheduleResponse('accepted')}
                                    disabled={Boolean(decisionSaving)}
                                    className="px-5 py-2 rounded-xl bg-emerald-500 text-black text-[10px] font-black tracking-[0.2em] uppercase disabled:opacity-60"
                                >
                                    {decisionSaving === 'accepted' ? 'Saving...' : 'Keep Ticket'}
                                </button>
                                <button
                                    onClick={() => handleRescheduleResponse('refund_requested')}
                                    disabled={Boolean(decisionSaving)}
                                    className="px-5 py-2 rounded-xl border border-red-500/40 text-red-300 text-[10px] font-black tracking-[0.2em] uppercase disabled:opacity-60"
                                >
                                    {decisionSaving === 'refund_requested' ? 'Saving...' : 'Request Refund'}
                                </button>
                            </div>
                        )}

                        {!canRespondReschedule && responsePending && (
                            <p className="text-xs text-zinc-400 mt-4">The decision window is closed. This ticket remains valid for the rescheduled event.</p>
                        )}
                    </div>
                )}

                {booking.status === 'pending' && (
                    <div className="page-card p-6 mb-6 border-2 border-emerald-500/30 text-center space-y-4">
                        <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-emerald-400">Checkout Session Active</h2>
                        <p className="text-xs text-zinc-400 max-w-xs mx-auto">This booking is awaiting payment. Your inventory is locked for a limited time.</p>
                        <div className="pt-2">
                            <Link
                                to={`/user/checkout/${id}`}
                                className="inline-block px-10 py-3 bg-emerald-500 text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-400 transition-all"
                            >
                                Pay Now
                            </Link>
                        </div>
                    </div>
                )}

                {booking.booking_tickets?.length > 0 && (
                    <div className="page-card p-5 mb-4">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300 mb-3">Tickets</h2>
                        <div className="space-y-2">
                            {booking.booking_tickets.map((bt) => (
                                <div key={bt.id} className="flex justify-between text-sm">
                                    <span className="text-gray-300">{bt.quantity}x {bt.ticket_type?.name ?? 'Ticket'}</span>
                                    <span className="text-white font-semibold">PHP {Number(bt.total_price).toLocaleString()}</span>
                                </div>
                            ))}
                            <div className="border-t border-gray-700 pt-2 flex justify-between font-bold text-white">
                                <span>Total</span>
                                <span className="text-stone-300">PHP {Number(booking.total_amount).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="page-card p-5 mb-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300 mb-3">Payment</h2>
                    {latestPayment ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Status</span>
                                <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${paymentStatusColors[latestPayment.status] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                    {latestPayment.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                                <span className="text-gray-500">Method</span><span>{latestPayment.payment_method || 'N/A'}</span>
                                <span className="text-gray-500">Amount</span><span>PHP {Number(latestPayment.amount || booking.total_amount).toLocaleString()}</span>
                                <span className="text-gray-500">Currency</span><span>{latestPayment.currency || 'PHP'}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No payment records yet.</p>
                    )}
                </div>

                <div className="page-card p-5 mb-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300 mb-3">Contact Details</h2>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                        <span className="text-gray-500">Name</span><span>{booking.customer_name}</span>
                        <span className="text-gray-500">Email</span><span>{booking.customer_email}</span>
                        {booking.customer_phone && <><span className="text-gray-500">Phone</span><span>{booking.customer_phone}</span></>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingDetailPage;
