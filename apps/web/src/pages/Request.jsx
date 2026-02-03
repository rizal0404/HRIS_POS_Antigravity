import React from 'react';
import { Link } from 'react-router-dom';

export default function Request() {
    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-text-main-light dark:text-text-main-dark transition-colors duration-200 pb-10">
            {/* TopAppBar */}
            <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md">
                <Link to="/" className="text-[#181811] dark:text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                </Link>
                <h2 className="text-[#181811] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
                    Pengajuan
                </h2>
            </div>

            {/* Greeting / Context */}
            <div className="px-6 pt-2 pb-4">
                <p className="text-[#8c8b5f] dark:text-gray-400 text-sm font-medium">Mau ajukan apa hari ini?</p>
                <h1 className="text-[#181811] dark:text-white text-2xl font-bold mt-1">Buat Pengajuan Baru</h1>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-4 px-4 pb-6">
                {/* Cuti */}
                <button className="group flex flex-col gap-4 p-5 bg-white dark:bg-[#2c2b18] rounded-[2rem] shadow-sm hover:shadow-md transition-all active:scale-95 text-left border border-transparent hover:border-primary/50">
                    <div className="size-14 rounded-full bg-primary flex items-center justify-center text-[#181811] group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">calendar_month</span>
                    </div>
                    <div>
                        <p className="text-[#181811] dark:text-white text-lg font-bold leading-tight">Cuti</p>
                        <p className="text-[#8c8b5f] dark:text-gray-400 text-sm mt-1">Ajukan cuti tahunan</p>
                    </div>
                </button>
                {/* Lembur */}
                <button className="group flex flex-col gap-4 p-5 bg-white dark:bg-[#2c2b18] rounded-[2rem] shadow-sm hover:shadow-md transition-all active:scale-95 text-left border border-transparent hover:border-primary/50">
                    <div className="size-14 rounded-full bg-[#f0f0eb] dark:bg-white/10 flex items-center justify-center text-[#181811] dark:text-primary group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">schedule</span>
                    </div>
                    <div>
                        <p className="text-[#181811] dark:text-white text-lg font-bold leading-tight">Lembur</p>
                        <p className="text-[#8c8b5f] dark:text-gray-400 text-sm mt-1">Form lembur kerja</p>
                    </div>
                </button>
                {/* Sakit */}
                <button className="group flex flex-col gap-4 p-5 bg-white dark:bg-[#2c2b18] rounded-[2rem] shadow-sm hover:shadow-md transition-all active:scale-95 text-left border border-transparent hover:border-primary/50">
                    <div className="size-14 rounded-full bg-[#f0f0eb] dark:bg-white/10 flex items-center justify-center text-[#181811] dark:text-primary group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">sick</span>
                    </div>
                    <div>
                        <p className="text-[#181811] dark:text-white text-lg font-bold leading-tight">Sakit</p>
                        <p className="text-[#8c8b5f] dark:text-gray-400 text-sm mt-1">Upload surat dokter</p>
                    </div>
                </button>
                {/* Perbaikan Absen */}
                <button className="group flex flex-col gap-4 p-5 bg-white dark:bg-[#2c2b18] rounded-[2rem] shadow-sm hover:shadow-md transition-all active:scale-95 text-left border border-transparent hover:border-primary/50">
                    <div className="size-14 rounded-full bg-[#f0f0eb] dark:bg-white/10 flex items-center justify-center text-[#181811] dark:text-primary group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">edit_calendar</span>
                    </div>
                    <div>
                        <p className="text-[#181811] dark:text-white text-lg font-bold leading-tight">Koreksi</p>
                        <p className="text-[#8c8b5f] dark:text-gray-400 text-sm mt-1">Perbaikan absen</p>
                    </div>
                </button>
                {/* Tukar Shift (Full Width to balance grid) */}
                <button className="col-span-2 group flex flex-row items-center gap-4 p-4 bg-white dark:bg-[#2c2b18] rounded-[2rem] shadow-sm hover:shadow-md transition-all active:scale-95 text-left border border-transparent hover:border-primary/50">
                    <div className="size-12 shrink-0 rounded-full bg-[#f0f0eb] dark:bg-white/10 flex items-center justify-center text-[#181811] dark:text-primary group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-2xl">swap_horiz</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-[#181811] dark:text-white text-lg font-bold leading-tight">Tukar Shift</p>
                        <p className="text-[#8c8b5f] dark:text-gray-400 text-sm mt-0.5">Ganti jadwal dengan rekan</p>
                    </div>
                    <div className="size-10 rounded-full bg-background-light dark:bg-white/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#181811] dark:text-white">chevron_right</span>
                    </div>
                </button>
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between px-6 pb-4 pt-2">
                <h3 className="text-[#181811] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Riwayat Pengajuan</h3>
                <button className="text-xs font-bold text-[#8c8b5f] dark:text-primary hover:text-[#181811] dark:hover:text-white transition-colors">Lihat Semua</button>
            </div>

            {/* History List */}
            <div className="flex flex-col gap-3 px-4 pb-8">
                {/* List Item: Pending */}
                <div className="flex items-center gap-4 bg-white dark:bg-[#2c2b18] px-4 py-4 rounded-[1.5rem] shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="text-[#181811] flex items-center justify-center rounded-2xl bg-[#f5f5f0] dark:bg-white/5 shrink-0 size-12">
                            <span className="material-symbols-outlined text-2xl">calendar_month</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#181811] dark:text-white text-base font-bold leading-normal line-clamp-1">Cuti Tahunan</p>
                            <p className="text-[#8c8b5f] dark:text-gray-400 text-sm font-medium leading-normal line-clamp-1">12 Oct - 14 Oct 2023</p>
                        </div>
                    </div>
                    <div className="shrink-0">
                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary">
                            <span className="text-[10px] font-bold text-black uppercase tracking-wider">Pending</span>
                        </div>
                    </div>
                </div>
                {/* List Item: Approved */}
                <div className="flex items-center gap-4 bg-white dark:bg-[#2c2b18] px-4 py-4 rounded-[1.5rem] shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="text-[#181811] flex items-center justify-center rounded-2xl bg-[#f5f5f0] dark:bg-white/5 shrink-0 size-12">
                            <span className="material-symbols-outlined text-2xl">schedule</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#181811] dark:text-white text-base font-bold leading-normal line-clamp-1">Lembur</p>
                            <p className="text-[#8c8b5f] dark:text-gray-400 text-sm font-medium leading-normal line-clamp-1">10 Oct 2023, 18:00 - 21:00</p>
                        </div>
                    </div>
                    <div className="shrink-0">
                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40">
                            <span className="text-[10px] font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">Approved</span>
                        </div>
                    </div>
                </div>
                {/* List Item: Rejected */}
                <div className="flex items-center gap-4 bg-white dark:bg-[#2c2b18] px-4 py-4 rounded-[1.5rem] shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="text-[#181811] flex items-center justify-center rounded-2xl bg-[#f5f5f0] dark:bg-white/5 shrink-0 size-12">
                            <span className="material-symbols-outlined text-2xl">sick</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#181811] dark:text-white text-base font-bold leading-normal line-clamp-1">Izin Sakit</p>
                            <p className="text-[#8c8b5f] dark:text-gray-400 text-sm font-medium leading-normal line-clamp-1">20 Sep 2023</p>
                        </div>
                    </div>
                    <div className="shrink-0">
                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/40">
                            <span className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">Rejected</span>
                        </div>
                    </div>
                </div>
                {/* List Item: Approved */}
                <div className="flex items-center gap-4 bg-white dark:bg-[#2c2b18] px-4 py-4 rounded-[1.5rem] shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="text-[#181811] flex items-center justify-center rounded-2xl bg-[#f5f5f0] dark:bg-white/5 shrink-0 size-12">
                            <span className="material-symbols-outlined text-2xl">swap_horiz</span>
                        </div>
                        <div className="flex flex-col justify-center">
                            <p className="text-[#181811] dark:text-white text-base font-bold leading-normal line-clamp-1">Tukar Shift</p>
                            <p className="text-[#8c8b5f] dark:text-gray-400 text-sm font-medium leading-normal line-clamp-1">05 Sep 2023</p>
                        </div>
                    </div>
                    <div className="shrink-0">
                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40">
                            <span className="text-[10px] font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">Approved</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
