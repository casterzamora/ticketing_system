import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const statusColors = {
    pending:   'bg-yellow-500/20 text-yellow-300 border-yellow-600',
    confirmed: 'bg-green-500/20 text-green-300 border-green-600',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-600',
    refunded:  'bg-blue-500/20 text-blue-300 border-blue-600',
};

const BookingDetail = () => {
    const { id } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [refundLoading, setRefundLoading] = useState(false);
    const [refundError, setRefundError] = useState('');
    const [refundSuccess, setRefundSuccess] = useState('');
    const [showRefundForm, setShowRefundForm] = useState(false);

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

    useEffect(() => { fetchBooking(); }, [id]);

    const handleRefundRequest = async (e) => {
        e.preventDefault();
        setRefundLoading(true);
        setRefundError('');
        try {
            await axios.post(`/api/user/bookings/${id}/refund`, { reason: refundReason });
            setRefundSuccess('Refund request submitted. We will process it within 2-3 business days.');
            setShowRefundForm(false);
            fetchBooking();
        } catch (err) {
            setRefundError(err.response?.data?.message || 'Failed to submit refund request.');
        } finally {
            setRefundLoading(false);
        }
    };

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
                <Link to="/user/bookings" className="text-stone-300 text-sm">← My Bookings</Link>
            </div>
        );
    }

    const startDate = booking.event?.start_time ? new Date(booking.event.start_time) : null;
    const canRefund = booking.status === 'confirmed' && !booking.refund_request;

    return (
        <div className="page-shell">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/user/bookings" className="text-xs text-gray-400 hover:text-gray-200 mb-6 inline-block">← My Bookings</Link>

                <div className="page-card p-5 mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] text-gray-400">Booking Reference</p>
                        <h1 className="font-display text-4xl font-bold text-white leading-none">{booking.booking_reference}</h1>
                    </div>
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${statusColors[booking.status] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                        {booking.status}
                    </span>
                </div>

                {/* Event info */}
                <div className="page-card overflow-hidden mb-4">
                    <div
                        className="h-32 bg-cover bg-center"
                        style={{ backgroundImage: booking.event?.image_url ? `url(${booking.event.image_url})` : 'none', backgroundColor: '#0f0f2e' }}
                    />
                    <div className="p-4">
                        <p className="text-sm font-bold text-white">{booking.event?.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {booking.event?.venue} &bull; {startDate ? startDate.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA'}
                        </p>
                    </div>
                </div>

                {/* Tickets */}
                {booking.booking_tickets?.length > 0 && (
                    <div className="page-card p-5 mb-4">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300 mb-3">Tickets</h2>
                        <div className="space-y-2">
                            {booking.booking_tickets.map((bt) => (
                                <div key={bt.id} className="flex justify-between text-sm">
                                    <span className="text-gray-300">{bt.quantity}× {bt.ticket_type?.name ?? 'Ticket'}</span>
                                    <span className="text-white font-semibold">₱{Number(bt.total_price).toLocaleString()}</span>
                                </div>
                            ))}
                            <div className="border-t border-gray-700 pt-2 flex justify-between font-bold text-white">
                                <span>Total</span>
                                <span className="text-stone-300">₱{Number(booking.total_amount).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Customer info */}
                <div className="page-card p-5 mb-4">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300 mb-3">Contact Details</h2>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                        <span className="text-gray-500">Name</span><span>{booking.customer_name}</span>
                        <span className="text-gray-500">Email</span><span>{booking.customer_email}</span>
                        {booking.customer_phone && <><span className="text-gray-500">Phone</span><span>{booking.customer_phone}</span></>}
                    </div>
                </div>

                {/* Payment info */}
                {booking.payments?.length > 0 && (
                    <div className="page-card p-5 mb-4">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300 mb-3">Payment</h2>
                        {booking.payments.map((p) => (
                            <div key={p.id} className="flex justify-between text-sm text-gray-300">
                                <span>{p.payment_method} &bull; {p.status}</span>
                                <span className="font-semibold">₱{Number(p.amount).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Refund section */}
                {booking.refund_request && (
                    <div className="page-card p-5 mb-4">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-blue-300 mb-1">Refund Request</h2>
                        <p className="text-sm text-gray-300">Status: <span className="font-semibold capitalize">{booking.refund_request.status}</span></p>
                        <p className="text-[11px] text-gray-400 mt-1">{booking.refund_request.reason}</p>
                    </div>
                )}

                {refundSuccess && (
                    <div className="bg-green-900/30 border border-green-600 text-green-300 text-xs px-4 py-3 rounded-xl mb-4">{refundSuccess}</div>
                )}

                {canRefund && (
                    <div className="page-card p-5">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300 mb-3">Request a Refund</h2>
                        <p className="text-[11px] text-gray-400 mb-3">
                            Submit 48 hours before event. Requires admin approval.
                        </p>
                        {!showRefundForm ? (
                            <button
                                onClick={() => setShowRefundForm(true)}
                                className="text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-full border border-blue-500 text-blue-300 hover:bg-blue-600 hover:text-white transition"
                            >
                                Request Refund
                            </button>
                        ) : (
                            <form onSubmit={handleRefundRequest} className="space-y-3">
                                {refundError && (
                                    <p className="text-red-400 text-xs">{refundError}</p>
                                )}
                                <textarea
                                    rows={3}
                                    required
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    placeholder="Reason for refund..."
                                    className="block w-full rounded-md bg-black/70 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={refundLoading}
                                        className="text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition disabled:opacity-50"
                                    >
                                        {refundLoading ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowRefundForm(false)}
                                        className="text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-full border border-gray-600 text-gray-400 hover:text-white transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingDetail;
