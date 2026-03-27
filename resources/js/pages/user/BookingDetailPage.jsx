import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const statusColors = {
    pending:   'bg-yellow-500/20 text-yellow-300 border-yellow-600',
    confirmed: 'bg-green-500/20 text-green-300 border-green-600',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-600',
    refunded:  'bg-blue-500/20 text-blue-300 border-blue-600',
    voided:    'bg-red-500/20 text-red-400 border-red-600',
};

const VoidInfo = ({ booking }) => {
    if ((booking.status !== 'cancelled' && booking.status !== 'refunded') || !booking.void_type) return null;

    const labels = {
        admin_fault: 'Administrative Adjustment',
        system_fault: 'Technical/System Error',
        user_fault: 'Policy Violation/User Error'
    };

    return (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-red-400">Official Void Notice</span>
            </div>
            <p className="text-sm font-medium text-white mb-1">{labels[booking.void_type] || 'Administrative Void'}</p>
            <p className="text-xs text-zinc-400 italic">"{booking.void_reason || 'No specific reason provided by administration.'}"</p>
            {booking.refund_request && (
                <div className="mt-3 pt-3 border-t border-red-500/10 flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Refund Processed</span>
                    <span className="text-[10px] text-zinc-500 italic">Automatic refund initiated to original payment method.</span>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const badges = {
        pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        rejected: 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return (
        <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border ${badges[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
            {status}
        </span>
    );
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
    const canRefund = booking.status === 'confirmed' && !booking.refund_request && booking.event?.status === 'cancelled';

    return (
        <div className="page-shell">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/user/bookings" className="text-xs text-gray-400 hover:text-gray-200 mb-6 inline-block">← My Bookings</Link>

                <div className="page-card p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <div className="bg-white p-2 rounded-xl shadow-lg border border-white/10 flex-shrink-0 mb-4 sm:mb-0">
                            <QRCodeSVG
                                value={booking.booking_reference}
                                size={90}
                                bgColor={"#ffffff"}
                                fgColor={"#000000"}
                                level={"L"}
                                includeMargin={false}
                            />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-1">Booking Reference</p>
                            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight leading-none">{booking.booking_reference}</h1>
                        </div>
                    </div>
                    <span className={`text-[10px] font-bold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full border shadow-sm ${
                        (booking.void_type) ? statusColors.voided : (statusColors[booking.status] ?? 'bg-gray-700 text-gray-300 border-gray-600')
                    }`}>
                        { (booking.void_type) ? 'Voided' : booking.status }
                    </span>
                </div>

                <VoidInfo booking={booking} />

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
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold tracking-widest uppercase text-blue-300">Refund Request</h2>
                            <StatusBadge status={booking.refund_request.status} />
                        </div>
                        <p className="text-sm text-gray-300">Amount: <span className="font-semibold text-white">₱{Number(booking.total_amount).toLocaleString()}</span></p>
                        <p className="text-[11px] text-gray-400 mt-2 italic leading-relaxed">"{booking.refund_request.reason}"</p>
                    </div>
                )}

                {/* Void Section (If applicable) */}
                {booking.status === 'cancelled' && booking.void_type && (
                    <div className={`page-card p-5 mb-4 border ${booking.void_type === 'user_fault' ? 'border-red-500/20' : 'border-blue-500/20'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${booking.void_type === 'user_fault' ? 'bg-red-500' : 'bg-blue-400'}`} />
                            <h2 className={`text-[10px] font-black tracking-[0.2em] uppercase ${booking.void_type === 'user_fault' ? 'text-red-400' : 'text-blue-400'}`}>
                                Administrative {booking.void_type === 'user_fault' ? 'Void' : 'Reversal'}
                            </h2>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed font-medium mb-3">
                            {booking.void_type === 'user_fault' 
                                ? 'This ticket was invalidated due to a user-side error or request. Per our final sale policy, this order is non-refundable.'
                                : 'A system or administrative error was detected. A refund has been automatically initiated for the full amount.'}
                        </p>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Official Reason</p>
                            <p className="text-[11px] text-zinc-400">{booking.void_reason}</p>
                        </div>
                    </div>
                )}

                {refundSuccess && (
                    <div className="bg-green-900/30 border border-green-600 text-green-300 text-xs px-4 py-3 rounded-xl mb-4">{refundSuccess}</div>
                )}

                {canRefund && (
                    <div className="page-card p-5">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-blue-300 mb-3">Notice: Event Cancelled</h2>
                        <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                            This event has been officially cancelled. As per our policy, you are eligible for a full refund of your ticket purchase. Service fees may be non-refundable.
                        </p>
                        {!showRefundForm ? (
                            <button
                                onClick={() => setShowRefundForm(true)}
                                className="text-[11px] font-bold tracking-[0.2em] uppercase px-8 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-500 shadow-xl transition-all hover:scale-105 active:scale-95"
                            >
                                Request Refund
                            </button>
                        ) : (
                            <form onSubmit={handleRefundRequest} className="space-y-4">
                                {refundError && (
                                    <p className="text-red-400 text-[11px] font-bold tracking-wider animate-shake">{refundError}</p>
                                )}
                                <div className="space-y-1">
                                    <label className="block text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Additional Notes (Optional)</label>
                                    <textarea
                                        rows={3}
                                        value={refundReason}
                                        onChange={(e) => setRefundReason(e.target.value)}
                                        placeholder="Enter any additional info for the billing team..."
                                        className="block w-full rounded-xl bg-black/60 border border-white/5 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={refundLoading}
                                        className="text-[11px] font-bold tracking-[0.2em] uppercase px-8 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-500 shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {refundLoading ? 'Processing Request...' : 'Confirm Request'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowRefundForm(false)}
                                        className="text-[11px] font-bold tracking-[0.2em] uppercase px-8 py-3 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all font-mono"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-[9px] text-zinc-500 italic mt-2">
                                    * Refund will be processed back to the original payment method.
                                </p>
                            </form>
                        )}
                    </div>
                )}

                {!canRefund && booking.status === 'confirmed' && booking.event?.status !== 'cancelled' && (
                    <div className="page-card p-5 border-white/5">
                        <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-500 mb-2">Refund Policy</h2>
                        <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                            Tickets are non-refundable by default. Full refunds are only issued automatically in the event of an official cancellation. 
                            If an event is rescheduled, your ticket remains valid for the new date.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingDetail;
