import React from 'react';

export default function StatusPanel() {
    return (
        <section className="px-6 mb-8">
            <div className="relative overflow-hidden rounded-xl bg-[#181811] dark:bg-black p-6 text-white shadow-lg">
                {/* Abstract decorative background */}
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl"></div>
                <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl"></div>

                <div className="relative z-10 flex flex-col items-center justify-center gap-6 py-2">
                    <div className="text-center space-y-1">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                            Clocked In
                        </div>
                        <h1 className="font-display text-5xl font-bold tracking-tight">08:55</h1>
                        <p className="text-sm text-neutral-400">Senin, 12 Agustus 2024</p>
                    </div>

                    <button className="group flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[#181811] transition-transform active:scale-95">
                        <span className="material-symbols-outlined text-2xl group-hover:animate-bounce">logout</span>
                        <span className="text-base font-bold">Clock Out</span>
                    </button>

                    <p className="text-xs text-neutral-500">Jangan lupa clock out sebelum pulang!</p>
                </div>
            </div>
        </section>
    );
}
