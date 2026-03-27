import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
    return (
        <div className="page-shell py-16 sm:py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <section className="page-card p-8 sm:p-12 text-center relative overflow-hidden">
                    <div className="ambient-orb w-40 h-40 -top-16 -right-16 opacity-60" />
                    <p className="eyebrow mb-3">404</p>
                    <h1 className="section-title mb-4">Page Not Found</h1>
                    <p className="text-sm text-zinc-400 max-w-xl mx-auto mb-8">
                        Page not found. Browse events instead.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                        <Link to="/events" className="btn-primary w-full sm:w-auto text-center">
                            Browse Events
                        </Link>
                        <Link to="/" className="btn-outline w-full sm:w-auto text-center">
                            Go to Home
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                        <div className="soft-highlight-card p-4">
                            <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-1">Quick Tip</p>
                            <p className="text-xs text-zinc-300">Check the URL spelling and try again.</p>
                        </div>
                        <div className="soft-highlight-card p-4">
                            <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-1">Need Access?</p>
                            <p className="text-xs text-zinc-300">Sign in to open your dashboard links.</p>
                        </div>
                        <div className="soft-highlight-card p-4">
                            <p className="text-[10px] tracking-[0.18em] uppercase text-zinc-500 mb-1">Still Stuck?</p>
                            <p className="text-xs text-zinc-300">Contact support: help@livetix.local</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default NotFoundPage;
