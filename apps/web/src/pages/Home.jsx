import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import ShiftCard from '../components/ShiftCard';
import StatusPanel from '../components/StatusPanel';
import SummaryGrid from '../components/SummaryGrid';
import Notifications from '../components/Notifications';

export default function Home() {
    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-[#181811] dark:text-white">
            <Header />
            <ShiftCard />
            <StatusPanel />
            <div className="px-4 py-2">
                <Link to="/request" className="flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">edit_document</span>
                        </div>
                        <span className="font-bold text-lg">Buat Pengajuan</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                </Link>
            </div>
            <SummaryGrid />
            <Notifications />
        </div>
    );
}
