import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const CheckoutPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [payMongoAttempted, setPayMongoAttempted] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [paymentHealth, setPaymentHealth] = useState({
        mode: 'sandbox',
        ready: true,
        paymongo_configured: false,
    });

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await axios.get(`/api/user/bookings/${id}`);
                const data = res.data?.data ?? res.data;
                setBooking(data);

                if (data.expires_at) {
                    const expiry = new Date(data.expires_at).getTime();
                    const now = new Date().getTime();
                    setTimeLeft(Math.max(0, Math.floor((expiry - now) / 1000)));
                } else {
                    setTimeLeft(null);
                }
            } catch (err) {
                console.error('Checkout error:', err.response?.data || err.message);
            }

            try {
                const healthRes = await axios.get('/api/user/payment/health');
                setPaymentHealth(healthRes?.data || {
                    mode: 'sandbox',
                    ready: true,
                    paymongo_configured: false,
                });
            } catch (err) {
                // Payment health is optional for rendering booking details.
                console.warn('Payment health unavailable:', err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [id]);

    const handlePayMongoCheckout = async () => {
        if (processing) return;

        if (timeLeft !== null && timeLeft <= 0) {
            setPaymentMessage('Checkout window has expired. Please create a new booking.');
            return;
        }

        setProcessing(true);
        setPaymentMessage('');

        try {
            const res = await axios.post(`/api/user/bookings/${id}/paymongo-checkout`);
            const checkoutUrl = res?.data?.data?.checkout_url;

            if (!checkoutUrl) {
                throw new Error('PayMongo checkout URL was not returned.');
            }

            window.location.href = checkoutUrl;
        } catch (err) {
            setPaymentMessage(err.response?.data?.message || err.message || 'Unable to start PayMongo checkout.');
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(prev => prev > 0 ? prev - 1 : 0), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    useEffect(() => {
        if (!booking || booking.status === 'confirmed') {
            return;
        }

        const poll = setInterval(async () => {
            try {
                const res = await axios.get(`/api/user/bookings/${id}`);
                const data = res.data?.data ?? res.data;
                if (data.status === 'confirmed') {
                    setBooking(data);
                    clearInterval(poll);
                }
            } catch (err) {}
        }, 3000);

        return () => clearInterval(poll);
    }, [booking, id]);

    useEffect(() => {
        if (loading || payMongoAttempted || processing || !booking) {
            return;
        }

        if (booking.status !== 'pending') {
            return;
        }

        if (timeLeft !== null && timeLeft <= 0) {
            setPaymentMessage('Checkout window has expired. Please create a new booking.');
            return;
        }

        setPayMongoAttempted(true);
        handlePayMongoCheckout();
    }, [loading, payMongoAttempted, processing, booking, timeLeft]);

    if (loading) return (
        <div className='min-h-screen flex flex-col items-center justify-center bg-black text-zinc-500 gap-4'>
            <div className='w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin'></div>
            <div className='text-[10px] font-black tracking-widest uppercase'>Initiating Secure Checkout...</div>
        </div>
    );

    if (!booking) return (
        <div className='min-h-screen flex flex-col items-center justify-center bg-black text-white gap-6'>
            <h1 className='text-4xl font-display font-black uppercase'>Booking Not Found</h1>
            <p className='text-zinc-500 text-sm'>We couldn't retrieve your reservation details (ID: {id}).</p>
            <button 
                onClick={() => navigate('/events')}
                className='px-8 py-3 bg-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700'
            >
                Return to Events
            </button>
        </div>
    );

    if (booking.status === 'confirmed') {
        return (
            <div className='min-h-screen flex items-center justify-center px-6'>
                <div className='max-w-md w-full text-center space-y-6'>
                    <div className='w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20'>
                        <span className='text-4xl text-black font-bold'>✓</span>
                    </div>
                    <h1 className='text-4xl font-display font-black text-white uppercase tracking-tighter'>Paid & Confirmed.</h1>
                    <p className='text-zinc-400 text-sm'>Payment successful. Your unique tickets have been issued and sent to your email.</p>
                    <button 
                        onClick={() => navigate(`/user/bookings/${id}`)}
                        className='w-full py-4 bg-zinc-200 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-white transition-all'
                    >
                        View My Tickets →
                    </button>
                </div>
            </div>
        );
    }

    if (booking.status === 'pending' && timeLeft !== null && timeLeft <= 0) {
        return (
            <div className='min-h-screen flex items-center justify-center px-6'>
                <div className='max-w-md w-full text-center space-y-6'>
                    <div className='w-20 h-20 bg-red-500/20 rounded-full border border-red-500/40 flex items-center justify-center mx-auto'>
                        <span className='text-3xl text-red-400 font-bold'>!</span>
                    </div>
                    <h1 className='text-3xl font-display font-black text-white uppercase tracking-tight'>Checkout Expired</h1>
                    <p className='text-zinc-400 text-sm'>The reservation window has ended for this booking. Please create a new booking to continue.</p>
                    <div className='space-y-3'>
                        <button
                            onClick={() => navigate('/events')}
                            className='w-full py-4 bg-zinc-200 text-black text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-white transition-all'
                        >
                            Browse Events
                        </button>
                        <button
                            onClick={() => navigate('/user/bookings')}
                            className='w-full py-4 border border-zinc-700 text-zinc-200 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-900 transition-all'
                        >
                            View My Bookings
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen py-12 px-6'>
            <div className='max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12'>
                <div className='lg:col-span-2 space-y-8'>
                    <div className='flex items-center justify-between border-b border-zinc-800 pb-6'>
                        <div>
                            <h1 className='text-5xl font-display font-black text-white uppercase tracking-tighter'>Checkout<span className='text-emerald-500'>.</span></h1>
                            <p className='text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1'>Ref: {booking.booking_reference}</p>
                            <p className='text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1'>
                                Mode: {paymentHealth.mode === 'paymongo' ? 'PayMongo' : 'Unavailable'}
                            </p>
                        </div>
                        {timeLeft !== null && (
                            <div className={`px-4 py-2 rounded-xl border-2 flex flex-col items-center ${timeLeft < 300 ? 'border-red-500/50 bg-red-500/10 text-red-500' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500'}`}>
                                <span className='text-[8px] font-black uppercase tracking-widest mb-1 opacity-60 text-zinc-400'>Inventory Lock</span>
                                <span className='text-2xl font-display font-black tracking-tighter leading-none'>
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className='bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 text-center overflow-hidden relative'>
                        <p className='text-[11px] font-black text-blue-300 uppercase tracking-[0.3em] mb-4'>Secure Checkout</p>
                        <h2 className='text-2xl md:text-3xl font-display font-black text-white tracking-tight'>Taking You to Payment</h2>
                        <p className='text-zinc-400 text-sm mt-3 max-w-xl mx-auto'>
                            Please wait while we prepare your payment session.
                        </p>

                        <div className='mt-8 inline-flex items-center gap-3 text-zinc-300'>
                            <div className='w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin'></div>
                            <span className='text-xs uppercase tracking-[0.2em] font-black'>Redirecting...</span>
                        </div>

                        {paymentMessage && (
                            <div className='mt-6 space-y-4'>
                                <p className='text-[10px] text-amber-300 font-bold uppercase tracking-widest'>{paymentMessage}</p>
                                <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
                                    <button
                                        onClick={handlePayMongoCheckout}
                                        disabled={processing}
                                        className='px-8 py-3 bg-blue-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-400 transition-all disabled:opacity-60'
                                    >
                                        {processing ? 'Retrying...' : 'Retry Redirect'}
                                    </button>
                                    <button
                                        onClick={() => navigate('/user/bookings')}
                                        className='px-8 py-3 border border-zinc-700 text-zinc-200 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-900 transition-all'
                                    >
                                        Back to Bookings
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className='space-y-4'>
                    <div className='bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 sticky top-12'>
                        <h2 className='text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6'>Reservation Summary</h2>
                        <div className='space-y-4'>
                            <div className='flex flex-col gap-1'>
                                <span className='text-white font-bold text-lg leading-tight truncate'>{booking.event?.title}</span>
                                <span className='text-[10px] text-zinc-500 uppercase tracking-widest font-black'>{booking.event?.venue}</span>
                            </div>
                            <div className='pt-4 border-t border-white/5 space-y-2'>
                                {booking.booking_tickets?.map(t => (
                                    <div key={t.id} className='flex justify-between items-center text-xs'>
                                        <span className='text-zinc-400'>{t.quantity}x {t.ticket_type?.name}</span>
                                        <span className='text-white font-mono'>PHP {Number(t.total_price).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                            <div className='pt-6 border-t border-white/5 flex justify-between items-end'>
                                <span className='text-[10px] font-black uppercase tracking-widest text-zinc-500'>Total Payable</span>
                                <span className='text-3xl font-display font-black text-white tracking-tighter'>PHP {Number(booking.total_amount).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className='mt-8 pt-8 border-t border-white/5 flex items-start gap-3'>
                            <span className='text-emerald-500 text-lg'>SEC</span>
                            <p className='text-[9px] text-zinc-600 uppercase font-black tracking-widest leading-loose italic'>Secure payment transaction protected by Standard Rescheduling Policy.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
