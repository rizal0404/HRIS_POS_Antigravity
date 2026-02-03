import React from 'react';

export default function Notifications() {
    return (
        <section className="px-6 mb-4">
            <h3 className="text-lg font-bold mb-4">Notifikasi Terbaru</h3>
            <div className="flex flex-col gap-3">
                {/* Notification 1 */}
                <div className="flex items-start gap-4 rounded-lg bg-white dark:bg-[#363517] p-4 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-bold leading-tight">Cuti Tahunan Approved</p>
                            <span className="text-[10px] font-medium text-neutral-400">2j yll</span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-normal">Pengajuan cuti Anda untuk tanggal 20-22 Agustus telah disetujui oleh HRD.</p>
                    </div>
                </div>

                {/* Notification 2 */}
                <div className="flex items-start gap-4 rounded-lg bg-white dark:bg-[#363517] p-4 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-bold leading-tight">Jadwal Shift Updated</p>
                            <span className="text-[10px] font-medium text-neutral-400">Kmrin</span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-normal">Jadwal shift Anda untuk minggu depan telah diperbarui.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
