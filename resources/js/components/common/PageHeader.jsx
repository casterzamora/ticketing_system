import React from 'react';

const PageHeader = ({ eyebrow, title, subtitle, right }) => {
    return (
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
                {eyebrow ? (
                    <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-stone-300">{eyebrow}</p>
                ) : null}
                <h1 className="font-display mt-1 text-3xl sm:text-4xl font-bold text-white">{title}</h1>
                {subtitle ? <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p> : null}
            </div>
            {right}
        </header>
    );
};

export default PageHeader;
