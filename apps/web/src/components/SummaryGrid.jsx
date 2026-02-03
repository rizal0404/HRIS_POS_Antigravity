import React from 'react';

export default function SummaryGrid() {
    return (
        <section className="px-6 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Ringkasan Bulan Ini</h3>
                <a className="text-sm font-medium text-neutral-500 hover:text-primary transition-colors" href="#">Lihat Detail</a>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {/* Stat: Hadir */}
                <div className="flex flex-col gap-2 rounded-lg bg-white dark:bg-[#363517] p-4 shadow-sm border border-transparent dark:border-[#444222]">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <span className="material-symbols-outlined text-[20px] filled">check_circle</span>
                        <span className="text-sm font-medium">Hadir</span>
                    </div>
                    <p className="text-3xl font-bold">18</p>
                    <p className="text-xs text-neutral-400">Hari Kerja</p>
                </div>

                {/* Stat: Telat */}
                <div className="flex flex-col gap-2 rounded-lg bg-white dark:bg-[#363517] p-4 shadow-sm border border-transparent dark:border-[#444222]">
                    <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400">
                        <span className="material-symbols-outlined text-[20px] filled">timelapse</span>
                        <span className="text-sm font-medium">Telat</span>
                    </div>
                    <p className="text-3xl font-bold">1</p>
                    <p className="text-xs text-neutral-400">Kali</p>
                </div>

                {/* Stat: Cuti */}
                <div className="flex flex-col gap-2 rounded-lg bg-white dark:bg-[#363517] p-4 shadow-sm border border-transparent dark:border-[#444222]">
                    <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400">
                        <span className="material-symbols-outlined text-[20px] filled">beach_access</span>
                        <span className="text-sm font-medium">Cuti</span>
                    </div>
                    <p className="text-3xl font-bold">2</p>
                    <p className="text-xs text-neutral-400">Hari Diambil</p>
                </div>

                {/* Stat: Absen */}
                <div className="flex flex-col gap-2 rounded-lg bg-white dark:bg-[#363517] p-4 shadow-sm border border-transparent dark:border-[#444222]">
                    <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                        <span className="material-symbols-outlined text-[20px] filled">cancel</span>
                        <span className="text-sm font-medium">Absen</span>
                    </div>
                    <p className="text-3xl font-bold">0</p>
                    <p className="text-xs text-neutral-400">Tanpa Kabar</p>
                </div>
            </div>
        </section>
    );
}
