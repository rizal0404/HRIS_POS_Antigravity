import React from 'react';
import { Link } from 'react-router-dom';

export default function Attendance() {
    return (
        <div className="relative flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden font-display transition-colors duration-200">
            {/* TopAppBar */}
            <div className="flex items-center px-4 pt-4 pb-2 justify-between sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md">
                <Link to="/" className="text-neutral-900 dark:text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h2 className="text-neutral-900 dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">Attendance</h2>
                <div className="flex size-12 items-center justify-center">
                    <button className="flex items-center justify-center rounded-full size-10 bg-transparent text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined">history</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center px-4 pt-2 pb-24 w-full max-w-md mx-auto">
                {/* Map Card Section */}
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10 group">
                    {/* Map Background Image */}
                    <div
                        className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        role="img"
                        aria-label="Minimalist grayscale map view showing city streets and office location"
                        style={{
                            backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDW6GfsHxP_uF4lny7d6ntSwUfKBbKdvaMAQFK2d2iGOpNNiv5Xje-yyVtHf-USHUMs0q4DkdnURSLke6D9BwOsB4giSneH8AwAP9rpttPNECRR7iw2Ex4TJbuoStF-BHhENbM7mFVjG_oHAxd9Yb-EXV4yJxXemLS9-aC_2k8gdGrkfG9bwRnzCAvrT24g4PrLYGnxmZ5s_EFVhlCMnFdfPNvBG2MHDj65P7wPmxN_19y_lLVytdBXQl2GYFTxUvsiOFIjCdq3Dgk")',
                            filter: 'grayscale(100%)',
                            opacity: 0.8
                        }}
                    >
                    </div>

                    {/* Map UI Elements */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Radar/Geofence Effect */}
                        <div className="absolute w-32 h-32 bg-primary/20 rounded-full animate-ping"></div>
                        <div className="absolute w-32 h-32 bg-primary/10 rounded-full border border-primary/50"></div>

                        {/* User Pin */}
                        <div className="relative z-10 flex flex-col items-center justify-center">
                            <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_rgba(249,245,6,0.8)] border-2 border-white dark:border-gray-800"></div>
                            <div className="w-1 h-3 bg-black/50 rounded-full mt-1 blur-[1px]"></div>
                        </div>
                    </div>

                    {/* Location Status Pill */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/20 flex items-center gap-2 whitespace-nowrap">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Within Office Radius</span>
                    </div>
                </div>

                {/* Time & Shift Info */}
                <div className="mt-8 flex flex-col items-center text-center w-full space-y-2">
                    <h1 className="text-neutral-900 dark:text-white tracking-tighter text-[48px] font-bold leading-none tabular-nums">08:45 <span className="text-xl font-medium text-neutral-400 dark:text-neutral-500">AM</span></h1>
                    <div className="flex flex-col gap-1 items-center">
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">Monday, 24 Oct 2023</p>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 dark:bg-white/5 rounded-full mt-1">
                            <span className="material-symbols-outlined text-[16px] text-neutral-600 dark:text-neutral-300">schedule</span>
                            <p className="text-neutral-600 dark:text-neutral-300 text-xs font-semibold">Shift: 09:00 - 18:00</p>
                        </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="mt-auto pt-10 w-full">
                    {/* Clock In Button */}
                    <button className="group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-16 bg-primary shadow-[0_4px_20px_rgba(249,245,6,0.25)] hover:shadow-[0_0_20px_rgba(249,245,6,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200">
                        <div className="absolute inset-0 bg-white/20 group-hover:bg-transparent transition-colors"></div>
                        <span className="relative z-10 text-black text-lg font-bold tracking-wide flex items-center gap-2">
                            <span className="material-symbols-outlined filled">fingerprint</span>
                            CLOCK IN
                        </span>
                    </button>

                    {/* GPS Warning/Info */}
                    <p className="text-neutral-400 dark:text-neutral-500 text-xs text-center mt-4 px-6 leading-relaxed">
                        Please ensure your GPS is active and you are within the green zone to validate attendance.
                    </p>
                </div>
            </div>
        </div>
    );
}
