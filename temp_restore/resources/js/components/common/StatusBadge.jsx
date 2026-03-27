import React from 'react';

const STATUS_COLORS = {
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-600',
    confirmed: 'bg-green-500/20 text-green-300 border-green-600',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-600',
    refunded: 'bg-blue-500/20 text-blue-300 border-blue-600',
    approved: 'bg-green-500/20 text-green-300 border-green-600',
    rejected: 'bg-red-500/20 text-red-300 border-red-600',
    draft: 'bg-gray-700 text-gray-300 border-gray-600',
    published: 'bg-green-700/40 text-green-300 border-green-600',
    completed: 'bg-blue-700/40 text-blue-300 border-blue-600',
};

const StatusBadge = ({ status }) => {
    const normalized = String(status || '').toLowerCase();
    const classes = STATUS_COLORS[normalized] || 'bg-gray-700 text-gray-300 border-gray-600';

    return (
        <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${classes}`}>
            {normalized || 'unknown'}
        </span>
    );
};

export default StatusBadge;
