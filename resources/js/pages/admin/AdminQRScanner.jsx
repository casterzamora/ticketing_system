import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import axios from 'axios';

const AdminQRScanner = () => {
    const [scanResult, setScanResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastScan, setLastScan] = useState(null);

    const handleScan = async (result) => {
        if (!result || loading) return;
        const reference = result[0]?.rawValue || result;
        
        // Prevent double scanning the same thing instantly
        if (reference === lastScan) return;
        
        setLoading(true);
        setLastScan(reference);
        
        try {
            const res = await axios.post('/api/admin/scanner/check-in', { reference });
            setScanResult({
                type: 'success',
                message: res.data.message,
                data: res.data.data
            });
        } catch (err) {
            setScanResult({
                type: 'error',
                message: err.response?.data?.message || 'Invalid QR Code',
                data: err.response?.data?.data
            });
        } finally {
            setLoading(false);
            // Clear result after 5 seconds to allow next scan
            setTimeout(() => {
                setScanResult(null);
                setLastScan(null);
            }, 5000);
        }
    };

    return (
        <div className="page-shell bg-black min-h-screen">
            <div className="max-w-xl mx-auto px-4 py-8">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Gate Scanner<span className="text-emerald-500">.</span></h1>
                    <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-500">Official Entry Validator</p>
                </header>

                <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-zinc-800 bg-zinc-900 mb-6 shadow-2xl">
                    <Scanner
                        onScan={handleScan}
                        onError={(err) => console.error(err)}
                        styles={{ container: { width: '100%', height: '100%' } }}
                    />
                    
                    {/* Scanner Overlay UI */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-64 h-64 border-2 border-emerald-500/30 rounded-2xl relative">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500 -translate-x-1 -translate-y-1" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500 translate-x-1 -translate-y-1" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500 -translate-x-1 translate-y-1" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500 translate-x-1 translate-y-1" />
                        </div>
                    </div>

                    {loading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Validating...</span>
                            </div>
                        </div>
                    )}
                </div>

                {scanResult && (
                    <div className={`p-6 rounded-2xl border animate-in slide-in-from-bottom-4 duration-500 ${
                        scanResult.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scanResult.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {scanResult.type === 'success' 
                                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    }
                                </svg>
                            </div>
                            <div>
                                <h2 className="font-black uppercase tracking-tighter text-xl text-white leading-none mb-1">
                                    {scanResult.type === 'success' ? 'Access Granted' : 'Access Denied'}
                                </h2>
                                <p className="text-sm font-medium opacity-90">{scanResult.message}</p>
                            </div>
                        </div>
                        
                        {scanResult.data && (
                            <div className="mt-4 pt-4 border-t border-emerald-500/10 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Attendee</p>
                                    <p className="text-sm font-bold text-white">{scanResult.data.name}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Reference</p>
                                    <p className="text-sm font-bold text-white font-mono">{scanResult.data.reference}</p>
                                </div>
                                {scanResult.data.ticket_code && (
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Ticket</p>
                                        <p className="text-sm font-bold text-white font-mono">{scanResult.data.ticket_code}</p>
                                    </div>
                                )}
                                {typeof scanResult.data.checked_in_count === 'number' && typeof scanResult.data.total_tickets === 'number' && (
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Entry Progress</p>
                                        <p className="text-sm font-bold text-white">{scanResult.data.checked_in_count} / {scanResult.data.total_tickets}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-zinc-600 font-medium px-8 italic">
                        Position the ticket QR code within the scanning frame. Successful check-ins are recorded automatically in the transaction ledger.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminQRScanner;
