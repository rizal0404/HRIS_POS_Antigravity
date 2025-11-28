import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Request } from '../types';
import { MenuIcon, BellIcon, AcademicCapIcon, LogoutIcon } from './icons';
import { timeAgo } from '../lib/utils';

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
        <div className="absolute top-12 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-3 font-semibold text-gray-700 border-b">Notifikasi</div>
            {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">Tidak ada notifikasi baru.</div>
            ) : (
                <ul className="max-h-96 overflow-y-auto divide-y">
                    {notifications.map(notif => (
                        <li key={notif.id}>
                            <a href="#" onClick={(e) => { e.preventDefault(); onNotificationClick(notif); }} className="block p-3 hover:bg-gray-50">
                                <p className="text-sm text-gray-700">{getNotificationText(notif)}</p>
                                <p className="text-xs text-gray-500 mt-1">{timeAgo(new Date(notif.created_at))}</p>
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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center">
        <button onClick={onMenuClick} className="lg:hidden mr-4 text-gray-600 hover:text-gray-800" aria-label="Open menu">
          <MenuIcon className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 capitalize">{pageTitle.replace(/[_-]/g, ' ')}</h1>
      </div>
      <div className="flex items-center space-x-4">
        
        {/* Notification Bell */}
        <div ref={notificationRef} className="relative">
            <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none">
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
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

        <div ref={profileMenuRef} className="relative">
            <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100"
                aria-label="Open user menu"
                aria-haspopup="true"
                aria-expanded={isProfileMenuOpen}
            >
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-xs text-gray-500 capitalize">{user.position}</div>
                </div>
                <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={user.avatar_url}
                    alt={user.full_name}
                />
            </button>
            
            {isProfileMenuOpen && (
                 <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1" role="menu">
                    <button
                        onClick={() => {
                            navigate('/profil');
                            setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                    >
                        <AcademicCapIcon className="h-5 w-5 mr-3 text-gray-500" />
                        Profil Saya
                    </button>
                    <div className="border-t my-1"></div>
                    <button
                        onClick={() => {
                            onLogout();
                            setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        role="menuitem"
                    >
                        <LogoutIcon className="h-5 w-5 mr-3" />
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
