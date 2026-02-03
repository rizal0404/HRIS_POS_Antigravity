import React from 'react';

export default function Report() {
    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 bg-background-light dark:bg-background-dark font-display text-text-main-light dark:text-text-main-dark transition-colors duration-200">
            {/* Header Section */}
            <header className="sticky top-0 z-20 flex items-center justify-between bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-2 transition-colors duration-200">
                <h2 className="text-xl font-bold leading-tight tracking-tight flex-1">Laporan Saya</h2>
                <div className="flex items-center gap-4">
                    <button className="flex items-center justify-center rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-2xl">notifications</span>
                    </button>
                </div>
            </header>

            {/* Month Filter */}
            <div className="px-4 py-2 flex items-center justify-between">
                <button className="group flex h-10 items-center gap-x-2 rounded-full bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 pl-4 pr-3 shadow-sm active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-primary text-xl">calendar_month</span>
                    <p className="text-sm font-semibold">Oktober 2023</p>
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors text-xl">expand_more</span>
                </button>
                <button className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Unduh Laporan</button>
            </div>

            {/* Summary Stats Grid */}
            <div className="px-4 pt-4 pb-2">
                <h3 className="text-lg font-bold mb-3 px-1">Ringkasan Bulanan</h3>
                <div className="grid grid-cols-2 gap-3">
                    {/* Hadir */}
                    <div className="flex flex-col gap-3 rounded-xl p-4 bg-surface-light dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-gray-800/50">
                        <div className="flex justify-between items-start">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Total</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold tracking-tight">20</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Hadir</p>
                        </div>
                    </div>
                    {/* Telat */}
                    <div className="flex flex-col gap-3 rounded-xl p-4 bg-surface-light dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-gray-800/50">
                        <div className="flex justify-between items-start">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-yellow-700 dark:text-yellow-300">
                                <span className="material-symbols-outlined">schedule</span>
                            </div>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Total</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold tracking-tight">2</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Telat</p>
                        </div>
                    </div>
                    {/* Cuti */}
                    <div className="flex flex-col gap-3 rounded-xl p-4 bg-surface-light dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-gray-800/50">
                        <div className="flex justify-between items-start">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined">beach_access</span>
                            </div>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Total</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold tracking-tight">1</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Cuti</p>
                        </div>
                    </div>
                    {/* Absen */}
                    <div className="flex flex-col gap-3 rounded-xl p-4 bg-surface-light dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-gray-800/50">
                        <div className="flex justify-between items-start">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                <span className="material-symbols-outlined">cancel</span>
                            </div>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Total</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold tracking-tight">0</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Absen</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quota Section */}
            <div className="px-4 py-4">
                <h3 className="text-lg font-bold mb-3 px-1">Kuota Saya</h3>
                <div className="flex flex-col gap-4 rounded-xl bg-surface-light dark:bg-surface-dark p-5 shadow-sm border border-gray-100 dark:border-gray-800/50">
                    {/* Cuti Annual */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-lg">event_available</span>
                                <span className="text-sm font-semibold">Cuti Tahunan</span>
                            </div>
                            <span className="text-sm font-bold text-primary dark:text-yellow-300">8 <span className="text-gray-400 font-normal">/ 12 Hari</span></span>
                        </div>
                        <div className="relative h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div className="absolute top-0 left-0 h-full w-[66%] rounded-full bg-primary"></div>
                        </div>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-gray-700/50"></div>
                    {/* Lembur */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400 text-lg">timelapse</span>
                                <span className="text-sm font-semibold">Kuota Lembur</span>
                            </div>
                            <span className="text-sm font-bold text-blue-500">12 <span class="text-gray-400 font-normal">/ 20 Jam</span></span>
                        </div>
                        <div className="relative h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div className="absolute top-0 left-0 h-full w-[60%] rounded-full bg-blue-500"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance History */}
            <div className="px-4 py-2">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-lg font-bold">Riwayat Presensi</h3>
                    <button className="text-sm font-medium text-gray-500 hover:text-primary transition-colors">Lihat Semua</button>
                </div>
                <div className="flex flex-col gap-3">
                    {/* Item 1: Hadir (Tepat Waktu) */}
                    <div className="flex items-center justify-between rounded-xl bg-surface-light dark:bg-surface-dark p-4 shadow-sm border border-gray-100 dark:border-gray-800/50">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 h-14 w-12 shrink-0">
                                <span className="text-xs font-bold text-gray-500 uppercase">Okt</span>
                                <span className="text-lg font-bold">23</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-bold">Senin</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">login</span> 08:55</span>
                                    <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">logout</span> 17:05</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex h-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 px-3">
                            <p className="text-xs font-bold text-green-700 dark:text-green-400">Tepat Waktu</p>
                        </div>
                    </div>
                    {/* Item 2: Telat (Warning) */}
                    <div className="flex items-center justify-between rounded-xl bg-surface-light dark:bg-surface-dark p-4 shadow-sm border border-gray-100 dark:border-gray-800/50">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 h-14 w-12 shrink-0">
                                <span className="text-xs font-bold text-gray-500 uppercase">Okt</span>
                                <span className="text-lg font-bold">20</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-bold">Jumat</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400"><span className="material-symbols-outlined text-[14px]">login</span> 09:15</span>
                                    <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">logout</span> 17:00</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex h-8 items-center justify-center rounded-full bg-primary/30 dark:bg-primary/20 px-3">
                            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-200">Telat</p>
                        </div>
                    </div>
                    {/* Item 3: Cuti */}
                    <div className="flex items-center justify-between rounded-xl bg-surface-light dark:bg-surface-dark p-4 shadow-sm border border-gray-100 dark:border-gray-800/50 opacity-80">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 h-14 w-12 shrink-0">
                                <span className="text-xs font-bold text-gray-500 uppercase">Okt</span>
                                <span className="text-lg font-bold">18</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-bold">Rabu</p>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Cuti Tahunan
                                </div>
                            </div>
                        </div>
                        <div className="flex h-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 px-3">
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Cuti</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
