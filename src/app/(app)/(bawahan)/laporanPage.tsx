"use client";

import React, { useState } from 'react';
import { UserProfile } from '../../../types';
import PresensiBawahan from '../../../components/laporan/PresensiBawahan';
import RekapLembur from '../../../components/laporan/RekapLembur';
import MonitoringLembur from '../../../components/laporan/MonitoringLembur';
import QuotaCuti from '../../../components/laporan/QuotaCuti';
import MonitoringPresensi from '../../../components/laporan/MonitoringPresensi';

interface LaporanSayaPageProps {
    user: UserProfile;
}

type Tab = 'presensi' | 'rekap_lembur' | 'monitoring_lembur' | 'quota_cuti' | 'monitoring_presensi';

const tabConfig: { id: Tab; label: string }[] = [
    { id: 'presensi', label: 'Laporan Presensi' },
    { id: 'rekap_lembur', label: 'Laporan Lembur' },
    { id: 'monitoring_lembur', label: 'Monitoring Quota Lembur' },
    { id: 'quota_cuti', label: 'Laporan Quota Cuti' },
    { id: 'monitoring_presensi', label: 'Monitoring Presensi & Lembur' },
];

const LaporanSayaPage: React.FC<LaporanSayaPageProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<Tab>('presensi');

    const renderContent = () => {
        switch (activeTab) {
            case 'presensi':
                return <PresensiBawahan user={user} mode="self" />;
            case 'rekap_lembur':
                return <RekapLembur user={user} mode="self" />;
            case 'monitoring_lembur':
                return <MonitoringLembur user={user} mode="self" />;
            case 'quota_cuti':
                return <QuotaCuti user={user} mode="self" />;
            case 'monitoring_presensi':
                return <MonitoringPresensi user={user} mode="self" />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-blue-700 dark:bg-blue-900 text-white p-3">
                <h2 className="text-xl font-bold">Laporan Saya</h2>
            </div>

            <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <nav className="-mb-px flex space-x-6 px-6 overflow-x-auto" aria-label="Tabs">
                    {tabConfig.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-slate-900">
                {renderContent()}
            </div>
        </div>
    );
};

export default LaporanSayaPage;