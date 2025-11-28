"use client";

import React, { useState } from 'react';
import { UserProfile } from '@/types';
import PresensiBawahan from '@/components/laporan/PresensiBawahan';
import RekapLembur from '@/components/laporan/RekapLembur';
import MonitoringLembur from '@/components/laporan/MonitoringLembur';
import QuotaCuti from '@/components/laporan/QuotaCuti';
import MonitoringPresensi from '@/components/laporan/MonitoringPresensi';

interface SemuaLaporanPageProps {
  user: UserProfile;
}

// Define the type for our tabs to ensure type safety
type Tab = 'presensi' | 'rekap_lembur' | 'monitoring_lembur' | 'quota_cuti' | 'monitoring_presensi';

// Configuration for the tabs to make the component more maintainable
const tabConfig: { id: Tab; label: string }[] = [
    { id: 'presensi', label: 'Presensi Karyawan' },
    { id: 'rekap_lembur', label: 'Rekap Data Lembur' },
    { id: 'monitoring_lembur', label: 'Monitoring Quota Lembur' },
    { id: 'quota_cuti', label: 'Quota Cuti Karyawan' },
    { id: 'monitoring_presensi', label: 'Monitoring Presensi & SPL' },
];

const SemuaLaporanPage: React.FC<SemuaLaporanPageProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<Tab>('presensi');

    // This function determines which report component to render based on the active tab.
    const renderContent = () => {
        // Since this is the superadmin view, the underlying components should ideally fetch all data.
        // For this prototype, we reuse the manager's components. They will display mock data
        // as if the superadmin is a manager of everyone, as the components are designed to accept a manager's user object.
        switch (activeTab) {
            case 'presensi':
                // The PresensiBawahan component will need to be adjusted in a real app
                // to show ALL employees in the dropdown, not just subordinates.
                return <PresensiBawahan user={user} />;
            case 'rekap_lembur':
                return <RekapLembur user={user} />;
            case 'monitoring_lembur':
                return <MonitoringLembur user={user} />;
            case 'quota_cuti':
                return <QuotaCuti user={user} />;
            case 'monitoring_presensi':
                return <MonitoringPresensi user={user} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-slate-700 text-white p-3">
                <h2 className="text-xl font-bold">Semua Laporan Perusahaan</h2>
            </div>

            <div className="flex-shrink-0 border-b border-gray-200 bg-white">
                <nav className="-mb-px flex space-x-6 px-6 overflow-x-auto" aria-label="Tabs">
                    {tabConfig.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-slate-500 text-slate-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                {renderContent()}
            </div>
        </div>
    );
};

export default SemuaLaporanPage;
