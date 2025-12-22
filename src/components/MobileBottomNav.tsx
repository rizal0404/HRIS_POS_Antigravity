
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    HomeIcon,
    CollectionIcon,
    DocumentAddIcon,
    DocumentReportIcon,
    QrCodeIcon
} from './icons';

const MobileBottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { key: 'beranda', label: 'Beranda', icon: HomeIcon, path: '/beranda' },
        { key: 'riwayat', label: 'Riwayat', icon: CollectionIcon, path: '/riwayat' },
        { key: 'absensi', label: 'Absensi', icon: QrCodeIcon, path: '/absensi', isCenter: true },
        { key: 'pengajuan', label: 'Pengajuan', icon: DocumentAddIcon, path: '/pengajuan' },
        { key: 'laporan', label: 'Laporan', icon: DocumentReportIcon, path: '/laporan' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-2 lg:hidden z-50 pb-safe">
            <div className="flex justify-between items-end max-w-md mx-auto relative">
                {navItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.path);
                    const Icon = item.icon;

                    if (item.isCenter) {
                        return (
                            <button
                                key={item.key}
                                onClick={() => navigate(item.path)}
                                className="flex flex-col items-center justify-center -mt-8 group relative"
                            >
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 ${isActive
                                    ? 'bg-blue-600 shadow-blue-500/40 text-white scale-110'
                                    : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 shadow-slate-200/50 dark:shadow-slate-900/50'
                                    }`}>
                                    <Icon className={`text-[28px] ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                                </div>
                                <span className={`text-[10px] font-semibold mt-1 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <button
                            key={item.key}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center py-1 flex-1 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <Icon className={`text-[24px] mb-0.5 transition-colors ${isActive ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-medium">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileBottomNav;
