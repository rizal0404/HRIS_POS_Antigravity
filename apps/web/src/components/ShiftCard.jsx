import React from 'react';

export default function ShiftCard() {
    return (
        <section className="px-6 mb-6">
            <div className="flex items-center justify-between p-5 bg-white dark:bg-[#363517] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Shift Hari Ini</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-lg font-bold">Shift Pagi</h3>
                        <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Regular</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[#8c8b5f] dark:text-[#cdcba8]">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        <span className="text-sm font-medium">08:00 - 17:00</span>
                    </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/20 dark:bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#8c8b5f] dark:text-primary">sunny</span>
                </div>
            </div>
        </section>
    );
}
