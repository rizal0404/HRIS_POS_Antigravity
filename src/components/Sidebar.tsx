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

// Link ini hanya untuk layanan pribadi dasar, tanpa profil & presensi
const privateServiceLinks: NavLinkItem[] = [
    { key: 'absensi', label: 'Absensi', icon: ClockIcon, path: '/absensi' },
    { key: 'jadwal_shift', label: 'Jadwal Shift', icon: CalendarIcon, path: '/jadwal-shift' },
    { key: 'pengajuan', label: 'Pengajuan Saya', icon: DocumentAddIcon, path: '/pengajuan' },
    { key: 'riwayat', label: 'Riwayat Saya', icon: CollectionIcon, path: '/riwayat' },
    { key: 'laporan_saya', label: 'Laporan Saya', icon: DocumentReportIcon, path: '/laporan' },
    { key: 'profil', label: 'Profil Saya', icon: AcademicCapIcon, path: '/profil' },
];

// Link khusus untuk atasan, sekarang termasuk 'Presensi'
const managerLinks: NavLinkItem[] = [
    { key: 'dashboard', label: 'Dashboard Tim', icon: HomeIcon, path: '/dashboard' },
    presensiLink, // Pindahkan presensi ke sini untuk atasan
    { key: 'persetujuan', label: 'Persetujuan Tim', icon: CheckCircleIcon, path: '/persetujuan' },
    { key: 'tim', label: 'Tim Saya', icon: UsersIcon, path: '/tim' },
    { key: 'laporan_tim', label: 'Laporan Tim', icon: DocumentReportIcon, path: '/laporan-tim' },
];

const superadminLinks: NavLinkItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/superadmin/dashboard' },
    { key: 'pegawai', label: 'Konfigurasi Pegawai', icon: UsersIcon, path: '/superadmin/pegawai' },
    { key: 'sistem', label: 'Konfigurasi Sistem', icon: CogIcon, path: '/superadmin/sistem' },
    { key: 'laporan_semua', label: 'Semua Laporan', icon: DocumentReportIcon, path: '/superadmin/laporan-semua' },
];

const Sidebar: React.FC<SidebarProps> = ({ 
    user,
    isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, onLogout
}) => {
  const isManager = user.isManager;
  const navigate = useNavigate();
  const location = useLocation();
  const [logoUrl, setLogoUrl] = React.useState<string>(defaultLogo);

  React.useEffect(() => {
    try {
        const logo = getBrandLogoUrl();
        setLogoUrl(logo);
    } catch (err) {
        // fallback silently
    }
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
        className={`w-full text-left flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
          isActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        } ${isCollapsed ? 'justify-center' : ''}`}
        title={isCollapsed ? link.label : ''}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className={`ml-3 transition-opacity whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{link.label}</span>
      </button>
    );
  };
  
  const sidebarContent = (
    <div className="flex flex-col h-full">
        <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-3 right-3 text-slate-400 hover:text-white z-50 p-1"
            aria-label="Close menu"
        >
            <XIcon className="h-6 w-6" />
        </button>
        <div className={`h-16 flex items-center gap-3 border-b border-slate-700 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/10 overflow-hidden">
                <img src={logoUrl} alt="HRIS logo" className="h-10 w-10 object-contain" />
            </span>
            <span className={`text-xl font-bold text-white transition-opacity whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                HRIS POS
            </span>
        </div>
        <nav className={`flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-3' : 'px-4'}`}>
            {user.role === UserRole.SUPERADMIN ? (
            <div className="space-y-2">
                {superadminLinks.map(renderLink)}
            </div>
            ) : (
            <div className="space-y-4">
                {isManager && (
                <div>
                    <h3 className={`px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
                        <span className={isCollapsed ? 'hidden' : 'inline'}>Layanan Tim</span>
                    </h3>
                    <div className="space-y-1">
                    {managerLinks.map(renderLink)}
                    </div>
                </div>
                )}
                <div>
                <h3 className={`px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''} pt-2`}>
                    <span className={isCollapsed ? 'hidden' : 'inline'}>Layanan Pribadi</span>
                </h3>
                <div className="space-y-1">
                    {/* Jika bukan atasan, tampilkan Presensi di sini */}
                    {!isManager && renderLink(presensiLink)}
                    {privateServiceLinks.map(renderLink)}
                </div>
                </div>
            </div>
            )}
      </nav>
      <div className={`p-4 border-t border-slate-700 space-y-2`}>
        {/* FIX: Add a logout button to the sidebar. */}
        <button
          onClick={onLogout}
          className={`w-full text-left flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-slate-300 hover:bg-slate-700 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'Logout' : ''}
        >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            <span className={`ml-3 transition-opacity whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Logout</span>
        </button>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="hidden lg:flex items-center justify-center w-full p-2 text-slate-400 hover:bg-slate-700 rounded-md"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
            <ChevronDoubleLeftIcon className={`h-6 w-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );

  return (
    <>
        {/* Mobile Overlay */}
        <div 
            className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity lg:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
        ></div>
        
        <aside className={`bg-slate-800 text-slate-100 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out
            lg:relative lg:translate-x-0 
            fixed inset-y-0 left-0 z-40
            ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
            ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full'}
        `}>
            {sidebarContent}
        </aside>
    </>
  );
};

export default Sidebar;
