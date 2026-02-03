import React from 'react';
import { signOut } from '../lib/auth-client';

export default function Profile() {
    // Mock user data
    const user = {
        name: 'Budi Santoso',
        email: 'budi.santoso@company.com',
        department: 'Engineering',
        position: 'Software Developer',
        employeeId: 'EMP-2024-001',
        joinDate: '15 Januari 2022',
        phone: '+62 812-3456-7890',
    };

    const quotas = {
        leaveBalance: 8,
        leaveTotal: 12,
        overtimeHours: 12,
        overtimeMax: 40,
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 px-4 py-4">
                <h1 className="text-xl font-semibold text-text-main-light dark:text-text-main-dark">Profil Saya</h1>
            </header>

            <div className="p-4 space-y-4">
                {/* Profile Card */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold text-black">
                            {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-text-main-light dark:text-text-main-dark">{user.name}</h2>
                            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{user.position}</p>
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">{user.department}</p>
                        </div>
                    </div>
                </div>

                {/* Quota Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-primary">beach_access</span>
                            <span className="text-sm font-medium text-text-main-light dark:text-text-main-dark">Cuti Tahunan</span>
                        </div>
                        <div className="flex items-end gap-1">
                            <span className="text-2xl font-bold text-primary">{quotas.leaveBalance}</span>
                            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-1">/ {quotas.leaveTotal} hari</span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${(quotas.leaveBalance / quotas.leaveTotal) * 100}%` }}
                            />
                        </div>
                    </div>
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-secondary">schedule</span>
                            <span className="text-sm font-medium text-text-main-light dark:text-text-main-dark">Saldo Lembur</span>
                        </div>
                        <div className="flex items-end gap-1">
                            <span className="text-2xl font-bold text-secondary">{quotas.overtimeHours}</span>
                            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-1">jam</span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-secondary rounded-full transition-all"
                                style={{ width: `${(quotas.overtimeHours / quotas.overtimeMax) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Info Details */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
                    <div className="p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">badge</span>
                        <div className="flex-1">
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">ID Karyawan</p>
                            <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark">{user.employeeId}</p>
                        </div>
                    </div>
                    <div className="p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">mail</span>
                        <div className="flex-1">
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Email</p>
                            <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark">{user.email}</p>
                        </div>
                    </div>
                    <div className="p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">phone</span>
                        <div className="flex-1">
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Telepon</p>
                            <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark">{user.phone}</p>
                        </div>
                    </div>
                    <div className="p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400">event</span>
                        <div className="flex-1">
                            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Tanggal Bergabung</p>
                            <p className="text-sm font-medium text-text-main-light dark:text-text-main-dark">{user.joinDate}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button className="w-full flex items-center gap-3 bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-gray-400">settings</span>
                        <span className="flex-1 text-left text-sm font-medium text-text-main-light dark:text-text-main-dark">Pengaturan</span>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </button>
                    <button className="w-full flex items-center gap-3 bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-gray-400">help</span>
                        <span className="flex-1 text-left text-sm font-medium text-text-main-light dark:text-text-main-dark">Bantuan</span>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                        <span className="material-symbols-outlined text-red-500">logout</span>
                        <span className="flex-1 text-left text-sm font-medium text-red-500">Keluar</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
