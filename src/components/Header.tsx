import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Request } from '../types';
import { MenuIcon, BellIcon, AcademicCapIcon, LogoutIcon, SearchIcon, CogIcon } from './icons';
import { timeAgo } from '../lib/utils';
import { useTheme } from '../hooks/useTheme';

// Notification Panel sub-component
const NotificationPanel: React.FC<{
    notifications: Request[],
    allUsers: UserProfile[],
    onNotificationClick: (notification: Request) => void
}> = ({ notifications, allUsers, onNotificationClick }) => {
    const usersMap = new Map(allUsers.map(u => [u.id, u]));

    const getNotificationText = (notif: Request) => {
        // It's an update for the user about their own request
        if (notif.approvers?.full_name) {
            const statusText = notif.status === 'approved' ? 'disetujui' : 'ditolak';
            return `Ajuan ${notif.request_type} Anda telah di-${statusText} oleh ${notif.approvers.full_name}.`;
        }
        // It's a new request notification for a manager
        // FIX: Cast result of usersMap.get to UserProfile to resolve 'unknown' type error.
        const requester = usersMap.get(notif.profile_id) as UserProfile | undefined;
        if (requester) {
            const requesterName = requester.full_name;
            return `Ajuan ${notif.request_type} baru dari ${requesterName}.`;
        }
        return `Ajuan ${notif.request_type} baru.`;
    };

    return (
        <div className="absolute top-12 right-0 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50">
            <div className="p-3 font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-slate-700">Notifikasi</div>
            {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Tidak ada notifikasi baru.</div>
            ) : (
                <ul className="max-h-96 overflow-y-auto divide-y dark:divide-slate-700">
                    {notifications.map(notif => (
                        <li key={notif.id}>
                            <a href="#" onClick={(e) => { e.preventDefault(); onNotificationClick(notif); }} className="block p-3 hover:bg-gray-50 dark:hover:bg-slate-700">
                                <p className="text-sm text-gray-700 dark:text-gray-200">{getNotificationText(notif)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{timeAgo(new Date(notif.created_at))}</p>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

interface HeaderProps {
    user: UserProfile;
    pageTitle: string;
    onMenuClick: () => void;
    notifications: Request[];
    onNotificationClick: (notification: Request) => void;
    allUsers: UserProfile[];
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, pageTitle, onMenuClick, notifications, onNotificationClick, allUsers, onLogout }) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { theme, cycleTheme, isDark } = useTheme();


    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsPanelOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between px-6 lg:px-8 flex-shrink-0 z-20 sticky top-0 transition-all duration-200">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1" aria-label="Open menu">
                    <MenuIcon className="text-[28px]" />
                </button>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 capitalize lg:hidden">{pageTitle.replace(/[_-]/g, ' ')}</h1>

                {/* Search Bar (Desktop) */}
                <div className="hidden lg:flex w-full max-w-md relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500">
                        <SearchIcon className="text-slate-400 dark:text-slate-500 text-[20px] group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search for employees, documents..."
                        className="block w-96 pl-10 pr-3 py-2.5 border-none rounded-xl bg-slate-100/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-700 text-sm font-medium transition-all outline-none shadow-sm group-focus-within:shadow-md"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">

                {/* Notification Bell */}
                <div ref={notificationRef} className="relative">
                    <button
                        onClick={() => setIsPanelOpen(!isPanelOpen)}
                        className="relative p-2 rounded-lg hover:bg-background-light text-text-secondary transition-colors"
                    >
                        <BellIcon className="text-[24px]" />
                        {notifications.length > 0 && (
                            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full ring-2 ring-surface-light animate-pulse"></span>
                        )}
                    </button>
                    {isPanelOpen && (
                        <NotificationPanel
                            notifications={notifications}
                            allUsers={allUsers}
                            onNotificationClick={(notif) => {
                                onNotificationClick(notif);
                                setIsPanelOpen(false); // Close panel on click
                            }}
                        />
                    )}
                </div>

                {/* Theme Toggle Button */}
                <button
                    onClick={cycleTheme}
                    className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-slate-700 text-text-secondary dark:text-text-secondary-dark transition-colors"
                    title={`Current: ${theme}. Click to toggle.`}
                >
                    {isDark ? (
                        <span className="material-symbols-outlined text-[24px]">light_mode</span>
                    ) : (
                        <span className="material-symbols-outlined text-[24px]">dark_mode</span>
                    )}
                </button>

                <button className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-slate-700 text-text-secondary dark:text-text-secondary-dark transition-colors hidden sm:block">
                    <CogIcon className="text-[24px]" />
                </button>

                <div className="h-8 w-px bg-[#f0f2f4] dark:bg-slate-700 mx-2 hidden md:block"></div>

                <div ref={profileMenuRef} className="relative">
                    <button
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="flex items-center gap-3 pl-1 focus:outline-none"
                        aria-label="Open user menu"
                        aria-haspopup="true"
                        aria-expanded={isProfileMenuOpen}
                    >
                        <div className="flex flex-col items-end hidden md:flex text-right">
                            <span className="text-sm font-bold text-text-main dark:text-text-main-dark leading-none">{user.full_name}</span>
                            <span className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1 capitalize">{user.position || 'Employee'}</span>
                        </div>
                        <div className="size-10 rounded-full border-2 border-surface-light dark:border-slate-700 shadow-sm overflow-hidden bg-background-light dark:bg-slate-700">
                            <img
                                className="h-full w-full object-cover"
                                src={user.avatar_url || 'https://via.placeholder.com/150'}
                                alt={user.full_name}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + user.full_name;
                                }}
                            />
                        </div>
                    </button>

                    {isProfileMenuOpen && (
                        <div className="absolute top-full right-0 mt-3 w-56 bg-surface-light dark:bg-slate-800 rounded-2xl shadow-xl border border-[#f0f2f4] dark:border-slate-700 z-50 py-2 overflow-hidden" role="menu">
                            <div className="px-4 py-3 border-b border-[#f0f2f4] dark:border-slate-700 md:hidden">
                                <p className="text-sm font-bold text-text-main dark:text-text-main-dark">{user.full_name}</p>
                                <p className="text-xs text-text-secondary dark:text-text-secondary-dark capitalize">{user.position}</p>
                            </div>
                            <button
                                onClick={() => {
                                    navigate('/profil');
                                    setIsProfileMenuOpen(false);
                                }}
                                className="w-full text-left flex items-center px-4 py-3 text-sm font-medium text-text-main dark:text-text-main-dark hover:bg-background-light dark:hover:bg-slate-700 transition-colors"
                                role="menuitem"
                            >
                                <AcademicCapIcon className="text-[20px] mr-3 text-text-secondary dark:text-text-secondary-dark" />
                                Profil Saya
                            </button>
                            <div className="border-t border-[#f0f2f4] dark:border-slate-700 my-1"></div>
                            <button
                                onClick={() => {
                                    onLogout();
                                    setIsProfileMenuOpen(false);
                                }}
                                className="w-full text-left flex items-center px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                role="menuitem"
                            >
                                <LogoutIcon className="text-[20px] mr-3" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
