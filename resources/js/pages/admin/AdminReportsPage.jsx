import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AdminReportsPage = () => {
    const [days, setDays] = useState(14);
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState({
        kpis: {},
        daily_revenue: [],
        top_events: [],
        refund_reasons: [],
    });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/reports/operations?days=${days}`);
            setReport(res.data || {});
        } catch (error) {
            console.error('Failed to load report', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [days]);

    const netRevenue = useMemo(() => {
        const gross = Number(report?.kpis?.gross_revenue || 0);
        const refunded = Number(report?.kpis?.refunded_amount || 0);
        return gross - refunded;
    }, [report]);

    return (
        <div className="page-shell bg-[#0a0a0b] min-h-screen pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold mb-2">Reporting</p>
                        <h1 className="font-display text-5xl sm:text-6xl font-black text-white tracking-tighter">Operations Report.</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="bg-black border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white"
                        >
                            <option value={14}>Last 14 Days</option>
                            <option value={30}>Last 30 Days</option>
                            <option value={60}>Last 60 Days</option>
                            <option value={90}>Last 90 Days</option>
                        </select>
                    </div>
                </header>

                {loading ? (
                    <div className="text-zinc-500 text-sm">Loading report data...</div>
                ) : (
                    <>
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-5">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Gross Revenue</p>
                                <p className="text-3xl text-white font-display mt-2">PHP {Number(report?.kpis?.gross_revenue || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-5">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Refunded Amount</p>
                                <p className="text-3xl text-amber-400 font-display mt-2">PHP {Number(report?.kpis?.refunded_amount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-[#111113] border border-zinc-800 rounded-2xl p-5">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Net Revenue</p>
                                <p className="text-3xl text-emerald-400 font-display mt-2">PHP {Number(netRevenue).toLocaleString()}</p>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-[#111113] border border-zinc-800 rounded-3xl p-5">
                                <h2 className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-4">Daily Revenue</h2>
                                <div className="space-y-2">
                                    {(report?.daily_revenue || []).length === 0 ? (
                                        <p className="text-zinc-600 text-sm">No data yet.</p>
                                    ) : report.daily_revenue.map((row) => (
                                        <div key={row.day} className="flex items-center justify-between rounded-xl border border-zinc-800 p-3 text-xs">
                                            <span className="text-zinc-300">{row.day}</span>
                                            <span className="text-white font-bold">PHP {Number(row.amount).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[#111113] border border-zinc-800 rounded-3xl p-5">
                                <h2 className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-4">Top Events</h2>
                                <div className="space-y-2">
                                    {(report?.top_events || []).length === 0 ? (
                                        <p className="text-zinc-600 text-sm">No data yet.</p>
                                    ) : report.top_events.map((event) => (
                                        <div key={event.id} className="rounded-xl border border-zinc-800 p-3 text-xs">
                                            <p className="text-white font-bold">{event.title}</p>
                                            <p className="text-zinc-500 mt-1">{event.bookings_count} bookings</p>
                                            <p className="text-emerald-400 font-bold mt-1">PHP {Number(event.gross_sales).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="bg-[#111113] border border-zinc-800 rounded-3xl p-5">
                            <h2 className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-4">Top Refund Reasons</h2>
                            <div className="space-y-2">
                                {(report?.refund_reasons || []).length === 0 ? (
                                    <p className="text-zinc-600 text-sm">No refund reasons recorded yet.</p>
                                ) : report.refund_reasons.map((reason, idx) => (
                                    <div key={`${reason.reason}-${idx}`} className="flex items-center justify-between rounded-xl border border-zinc-800 p-3 text-xs">
                                        <div>
                                            <p className="text-zinc-200">{reason.reason}</p>
                                            <p className="text-zinc-500">{reason.count} refunds</p>
                                        </div>
                                        <p className="text-amber-400 font-bold">PHP {Number(reason.total).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminReportsPage;
