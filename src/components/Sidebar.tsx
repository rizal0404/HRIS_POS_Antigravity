"use client";

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserProfile, UserRole } from '../types';
import {
    HomeIcon,
    UsersIcon,
    CheckCircleIcon,
    DocumentReportIcon,
    CogIcon,
    ClockIcon,
    DocumentAddIcon,
    CollectionIcon,
    ChevronDoubleLeftIcon,
    LogoutIcon,
    XIcon,
    CalendarIcon,
    AcademicCapIcon,
    CalculatorIcon,
} from './icons';
import { defaultLogo, getBrandLogoUrl } from '@/lib/branding';

interface SidebarProps {
    user: UserProfile;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (open: boolean) => void;
    onLogout: () => void;
}

type NavLinkItem = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; path: string };

// pisahkan link yang spesifik dan yang umum
const presensiLink: NavLinkItem = { key: 'presensi', label: 'Presensi', icon: UsersIcon, path: '/presensi' };
const ADMIN_PRIVATE_SECTION_KEY = 'hris_admin_private_services';

// Link ini hanya untuk layanan pribadi dasar, tanpa profil & presensi
const privateServiceLinks: NavLinkItem[] = [
    { key: 'beranda', label: 'Dashboard Saya', icon: HomeIcon, path: '/beranda' },
    { key: 'absensi', label: 'Absensi', icon: ClockIcon, path: '/absensi' },
    { key: 'jadwal_shift', label: 'Jadwal Shift', icon: CalendarIcon, path: '/jadwal-shift' },
    { key: 'pengajuan', label: 'Pengajuan Saya', icon: DocumentAddIcon, path: '/pengajuan' },
    { key: 'riwayat', label: 'Riwayat Saya', icon: CollectionIcon, path: '/riwayat' },
    { key: 'laporan_saya', label: 'Laporan Saya', icon: DocumentReportIcon, path: '/laporan' },
    { key: 'kpi', label: 'Hitung KPI', icon: CalculatorIcon, path: '/kpi' },
    { key: 'profil', label: 'Profil Saya', icon: AcademicCapIcon, path: '/profil' },
];

// Link khusus untuk atasan, sekarang termasuk 'Presensi'
const managerLinks: NavLinkItem[] = [
    { key: 'dashboard', label: 'Dashboard Tim', icon: HomeIcon, path: '/dashboard' },
    presensiLink, // Pindahkan presensi ke sini untuk atasan
    { key: 'persetujuan', label: 'Persetujuan Tim', icon: CheckCircleIcon, path: '/persetujuan' },
    { key: 'tim', label: 'Tim Saya', icon: UsersIcon, path: '/tim' },
    { key: 'laporan_tim', label: 'Laporan Tim', icon: DocumentReportIcon, path: '/laporan-tim' },
    { key: 'simulasi_cuti_lembur', label: 'Simulasi Cuti & Lembur', icon: CalculatorIcon, path: '/simulasi-cuti-lembur' },
];

const superadminLinks: NavLinkItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/superadmin/dashboard' },
    { key: 'pegawai', label: 'Konfigurasi Pegawai', icon: UsersIcon, path: '/superadmin/pegawai' },
    { key: 'sistem', label: 'Konfigurasi Sistem', icon: CogIcon, path: '/superadmin/sistem' },
    { key: 'laporan_semua', label: 'Semua Laporan', icon: DocumentReportIcon, path: '/superadmin/laporan-semua' },
    { key: 'kpi', label: 'Hitung KPI', icon: CalculatorIcon, path: '/kpi' },
];

const adminLinks: NavLinkItem[] = [
    { key: 'laporan_semua', label: 'Semua Laporan', icon: DocumentReportIcon, path: '/admin/laporan-semua' },
    { key: 'jadwal_admin', label: 'Jadwal Shift', icon: CalendarIcon, path: '/admin/jadwal-shift' },
    { key: 'kpi', label: 'Hitung KPI', icon: CalculatorIcon, path: '/kpi' },
];

const Sidebar: React.FC<SidebarProps> = ({
    user,
    isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, onLogout
}) => {
    const isManager = user.isManager;
    const navigate = useNavigate();
    const location = useLocation();
    const [logoUrl, setLogoUrl] = React.useState<string>(defaultLogo);
    const [showAdminPrivateSection, setShowAdminPrivateSection] = React.useState<boolean>(true);

    React.useEffect(() => {
        try {
            const logo = getBrandLogoUrl();
            setLogoUrl(logo);
        } catch (err) {
            // fallback silently
        }
    }, []);

    React.useEffect(() => {
        const readToggle = () => {
            if (typeof window === 'undefined') return;
            const val = localStorage.getItem(ADMIN_PRIVATE_SECTION_KEY);
            setShowAdminPrivateSection(val !== 'off');
        };
        readToggle();
        const handler = () => readToggle();
        window.addEventListener('storage', handler);
        window.addEventListener('admin-private-section-changed', handler);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('admin-private-section-changed', handler);
        };
    }, []);

    const renderLink = (link: NavLinkItem) => {
        const Icon = link.icon;
        const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
        return (
            <button
                key={link.key}
                type="button"
                onClick={() => {
                    navigate(link.path);
                    setIsMobileMenuOpen(false); // Close mobile menu on nav
                }}
                className={`w-full text-left flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? link.label : ''}
            >
                <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} flex items-center justify-center transition-colors relative z-10`}>
                    <Icon className="text-[24px]" />
                    {/* Note: Icon component now renders material-symbols-outlined which should use font-size, 
                 but if we want to force size, we can add class. The text-[24px] might be redundant if we set .material-symbols-outlined size in CSS */}
                </span>
                <span className={`ml-3 transition-all duration-300 whitespace-nowrap overflow-hidden relative z-10 font-semibold ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{link.label}</span>
            </button >
        );
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/50 z-10 relative">
            <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden absolute top-3 right-3 text-slate-400 hover:text-slate-600 z-50 p-1"
                aria-label="Close menu"
            >
                <XIcon className="text-2xl" />
            </button>
            <div className={`p-6 pb-2 flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center px-2' : ''}`}>
                <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
                    <span className="material-symbols-outlined fill">hexagon</span>
                </div>
                <div className={`${isCollapsed ? 'hidden' : 'block'}`}>
                    <h1 className="text-slate-800 text-lg font-bold leading-tight tracking-tight">HRIS Portal</h1>
                    <p className="text-blue-600 text-xs font-bold tracking-wide uppercase">Employee Workspace</p>
                </div>
            </div>
            <nav className={`flex-1 px-4 py-6 overflow-y-auto overflow-x-hidden space-y-1`}>
                {user.role === UserRole.SUPERADMIN ? (
                    <div className="space-y-1">
                        {superadminLinks.map(renderLink)}
                    </div>
                ) : user.role === UserRole.ADMIN ? (
                    <div className="space-y-4">
                        <div>
                            <h3 className={`px-4 pb-2 text-xs font-bold text-text-secondary uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
                                <span className={isCollapsed ? 'hidden' : 'inline'}>Menu Admin</span>
                            </h3>
                            <div className="space-y-1">
                                {adminLinks.map(renderLink)}
                            </div>
                        </div>
                        {isManager && (
                            <div>
                                <h3 className={`px-4 pb-2 text-xs font-bold text-text-secondary uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
                                    <span className={isCollapsed ? 'hidden' : 'inline'}>Layanan Tim</span>
                                </h3>
                                <div className="space-y-1">
                                    {managerLinks.map(renderLink)}
                                </div>
                            </div>
                        )}
                        {showAdminPrivateSection && (
                            <div>
                                <h3 className={`px-4 pb-2 text-xs font-bold text-text-secondary uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
                                    <span className={isCollapsed ? 'hidden' : 'inline'}>Layanan Pribadi</span>
                                </h3>
                                <div className="space-y-1">
                                    {/* Jika bukan atasan, tampilkan Presensi di sini */}
                                    {!isManager && renderLink(presensiLink)}
                                    {privateServiceLinks.map(renderLink)}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {isManager && (
                            <div>
                                <h3 className={`px-4 pb-2 text-xs font-bold text-text-secondary uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
                                    <span className={isCollapsed ? 'hidden' : 'inline'}>Layanan Tim</span>
                                </h3>
                                <div className="space-y-1">
                                    {managerLinks.map(renderLink)}
                                </div>
                            </div>
                        )}
                        <div>
                            {/* Only show header if not collapsed or if manager (to separate sections) */}
                            {(isManager || !isCollapsed) && (
                                <h3 className={`px-4 pb-2 text-xs font-bold text-text-secondary uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
                                    <span className={isCollapsed ? 'hidden' : 'inline'}>Layanan Pribadi</span>
                                </h3>
                            )}
                            <div className="space-y-1">
                                {/* Jika bukan atasan, tampilkan Presensi di sini */}
                                {!isManager && renderLink(presensiLink)}
                                {privateServiceLinks.map(renderLink)}
                            </div>
                        </div>
                    </div>
                )}
            </nav>
            <div className={`p-4 border-t border-slate-100 space-y-1`}>
                {/* Support Link Mock */}
                <button
                    className={`w-full text-left flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700 group ${isCollapsed ? 'justify-center' : ''}`}
                >
                    <span className="material-symbols-outlined text-[24px] group-hover:text-blue-600 transition-colors">help</span>
                    <span className={`ml-3 transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Support</span>
                </button>

                <button
                    onClick={onLogout}
                    className={`w-full text-left flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-slate-500 hover:bg-red-50 hover:text-red-600 group ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? 'Logout' : ''}
                >
                    <LogoutIcon className="text-[24px] group-hover:text-red-600 transition-colors" />
                    <span className={`ml-3 transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Log Out</span>
                </button>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex items-center justify-center w-full p-2 mt-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <ChevronDoubleLeftIcon className={`text-[20px] transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity lg:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-hidden="true"
            ></div>

            <aside className={`bg-transparent flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out
            lg:relative lg:translate-x-0 
            fixed inset-y-0 left-0 z-40
            ${isCollapsed ? 'lg:w-24' : 'lg:w-72'}
             ${/* Mobile width fixed to 72 (full size) when open */ ''}
            ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full'}
        `}>
                {sidebarContent}
            </aside>
        </>
    );
};

export default Sidebar;
