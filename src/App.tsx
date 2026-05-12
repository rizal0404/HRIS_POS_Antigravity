import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { UserProfile, UserRole, Request, RequestType, RequestStatus } from './types';
import api from './services/apiClient';
import { apiService } from './services/apiService';
import { getAllSubordinates } from './lib/utils';
import { logInfo, logError, logWarn } from './lib/logger';
import ErrorBoundary from './components/ErrorBoundary';
import PasswordResetModal from './components/PasswordResetModal';
import InstallPWABanner from './components/InstallPWABanner';
import { ToastProvider } from './components/ui/Toast';
import MobileBottomNav from './components/MobileBottomNav';
import { useTheme } from './hooks/useTheme';

// Import pages
import AbsensiPage from './app/(app)/(bawahan)/absensiPage';
import PengajuanPage from './app/(app)/(bawahan)/pengajuanPage';
import RiwayatPage from './app/(app)/(bawahan)/riwayatPage';
import LaporanSayaPage from './app/(app)/(bawahan)/laporanPage';
import JadwalShiftPage from './app/(app)/(bawahan)/jadwal_shiftPage';
import PresensiPage from './app/(app)/presensiPage';
import DashboardBawahanPage from './app/(app)/(bawahan)/dashboardPage';
import ProfilSayaPage from './app/(app)/(bawahan)/profilPage';
import AtasanDashboardPage from './app/(app)/(atasan)/dashboardPage';
import PersetujuanTimPage from './app/(app)/(atasan)/persetujuanPage';
import TimSayaPage from './app/(app)/(atasan)/timPage';
import LaporanTimPage from './app/(app)/(atasan)/laporan_timPage';
import SimulasiCutiLemburPage from './app/(app)/(atasan)/SimulasiCutiLembur';
import PresensiTimPage from './app/(app)/(atasan)/presensiTimPage';
import SuperadminDashboardPage from './app/(app)/(superadmin)/dashboardPage';
import KonfigurasiPegawaiPage from './app/(app)/(superadmin)/pegawaiPage';
import KonfigurasiSistemPage from './app/(app)/(superadmin)/sistemPage';
import SemuaLaporanPage from './app/(app)/(superadmin)/laporan_semuaPage';
import JadwalSuperadminPage from './app/(app)/(superadmin)/jadwal_superadminPage';
import JadwalAdminPage from './app/(app)/(admin)/jadwal_adminPage';
import KpiPage from './app/(app)/kpiPage';
import LoginPage from './app/(auth)/LoginPage';
import ResetPasswordPage from './app/(auth)/ResetPasswordPage';
import SignupPage from './app/(auth)/SignupPage';
import PendingApprovalPage from './app/(auth)/PendingApprovalPage';

const AppLayout: React.FC<{
    currentUser: UserProfile;
    allUsers: UserProfile[];
    notifications: Request[];
    handleLogout: () => void;
}> = ({ currentUser, allUsers, notifications, handleLogout }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const pageTitle = location.pathname.split('/').filter(Boolean).pop() || 'dashboard';
    const navigate = useNavigate();

    return (
        <div className="relative flex h-screen bg-gray-100 dark:bg-slate-900 font-sans">
            <Sidebar
                user={currentUser}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                onLogout={handleLogout}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    user={currentUser}
                    pageTitle={pageTitle} // Derived from current path
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                    notifications={notifications}
                    onNotificationClick={(notif) => {
                        if (currentUser.isManager) {
                            navigate('/persetujuan');
                        } else {
                            navigate('/riwayat');
                        }
                    }}
                    allUsers={allUsers}
                    onLogout={handleLogout}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 dark:bg-slate-900 pb-20 lg:pb-0">
                    <Outlet /> {/* Child routes will render here */}
                </main>
                <MobileBottomNav />
            </div>
        </div>
    );
};

const AuthRoutes: React.FC<{
    blockedMessage: string | null;
    clearBlockedMessage: () => void;
}> = ({ blockedMessage, clearBlockedMessage }) => {
    const [view, setView] = useState<'login' | 'resetPassword' | 'register'>('login');
    if (view === 'resetPassword') {
        return <ResetPasswordPage onShowLogin={() => setView('login')} />;
    }
    if (view === 'register') {
        return <SignupPage onShowLogin={() => setView('login')} />;
    }
    return (
        <LoginPage
            onShowResetPassword={() => setView('resetPassword')}
            onShowRegister={() => setView('register')}
            infoMessage={blockedMessage}
            onClearInfo={clearBlockedMessage}
        />
    );
};

export default function App() {
    const [session, setSession] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [notifications, setNotifications] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [registrationPending, setRegistrationPending] = useState(false);
    const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
    const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
    const navigate = useNavigate();

    // Initialize theme hook at app level to apply dark class to <html>
    useTheme();

    const handleNavigate = (path: string) => {
        navigate(path);
    };

    const roleLandingPath = currentUser
        ? currentUser.role === UserRole.SUPERADMIN
            ? '/superadmin/dashboard'
            : currentUser.role === UserRole.ADMIN
                ? '/admin/laporan-semua'
                : currentUser.isManager
                    ? '/dashboard'
                    : '/beranda'
        : '/';

    const requireManager = <T,>(node: React.ReactElement<T>) =>
        currentUser?.isManager ? node : <Navigate to={roleLandingPath} replace />;

    const requireSuperadmin = <T,>(node: React.ReactElement<T>) =>
        currentUser?.role === UserRole.SUPERADMIN ? node : <Navigate to={roleLandingPath} replace />;

    const requirePrivileged = <T,>(node: React.ReactElement<T>) =>
        (currentUser?.role === UserRole.SUPERADMIN || currentUser?.role === UserRole.ADMIN)
            ? node
            : <Navigate to={roleLandingPath} replace />;

    const loadNotifications = useCallback(async (user: UserProfile, users: UserProfile[]) => {
        try {
            if (user.isManager) {
                const subordinates = getAllSubordinates(user.id, users);
                const subIds = subordinates.map(s => s.id);
                if (subIds.length === 0) {
                    setNotifications([]);
                    return;
                }
                const pending = await apiService.getSubordinateRequests(subIds);
                const sorted = pending
                    .filter(req => req.status === 'pending')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 15);
                setNotifications(sorted);
            } else {
                const updates = await apiService.getRequestUpdatesForUser(user.id);
                setNotifications(updates.slice(0, 15));
            }
        } catch (error) {
            logWarn('Failed to load notifications', error);
            setNotifications([]);
        }
    }, []);

    useEffect(() => {
        logInfo('App component mounted. Checking Better Auth session.');
        const checkSession = async () => {
            try {
                const data = await api.get<{ session: any; user: any }>('/api/auth/get-session');
                if (data?.user) {
                    setSession({ user: data.user });
                } else {
                    setSession(null);
                }
            } catch {
                setSession(null);
            }
        };
        checkSession();
    }, []);

    useEffect(() => {
        if (session?.user) {
            const fetchProfileAndUsers = async () => {
                try {
                    // Fetch profile and all users via Express API
                    const [profile, users] = await Promise.all([
                        api.get<UserProfile>(`/api/employees/${session.user.id}`),
                        api.get<UserProfile[]>('/api/employees'),
                    ]);
                    setAllUsers(users);
                    if (profile) {
                        // Check registration status
                        try {
                            const pendingRegs = await api.get<any[]>('/api/requests/check-registration', {
                                profile_id: profile.id,
                            });
                            const isRegistrationPending = pendingRegs?.[0]?.status === RequestStatus.PENDING;
                            setRegistrationPending(profile.approved === false ? isRegistrationPending : false);
                        } catch {
                            setRegistrationPending(false);
                        }

                        if (profile.approved === false) {
                            setBlockedMessage('Akun menunggu persetujuan superadmin.');
                            setRegistrationPending(true);
                            await api.post('/api/auth/sign-out');
                            setSession(null);
                            setCurrentUser(null);
                            setLoading(false);
                            return;
                        } else {
                            setBlockedMessage(null);
                        }

                        // Check manager status by counting subordinates
                        const subordinates = users.filter(u => u.manager_id === profile.id);
                        const isManager = subordinates.length > 0;
                        const completeProfile = { ...profile, isManager } as UserProfile;
                        setCurrentUser(completeProfile);
                        loadNotifications(completeProfile, users);
                    } else {
                        logWarn('User authenticated but no profile found.', { userId: session.user.id });
                        setCurrentUser(null);
                    }
                } catch (error) {
                    logError('Failed to fetch user profile or all users', error);
                    setCurrentUser(null);
                    setAllUsers([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchProfileAndUsers();
        } else {
            setCurrentUser(null);
            setAllUsers([]);
            setLoading(false);
            setNotifications([]);
            setRegistrationPending(false);
            // keep blockedMessage to show alert on login page
        }
    }, [session, loadNotifications]);

    const handleLogout = async () => {
        logInfo('User initiated logout.');
        await api.post('/api/auth/sign-out');
        setSession(null);
        setCurrentUser(null);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-slate-900">
                <div className="text-xl font-semibold text-gray-800 dark:text-slate-100">Loading...</div>
            </div>
        );
    }

    if (currentUser && registrationPending) {
        return <PendingApprovalPage onLogout={handleLogout} />;
    }

    return (
        <ToastProvider>
            <ErrorBoundary>
                {showPasswordResetModal && (
                    <PasswordResetModal
                        email={session?.user?.email}
                        onClose={() => setShowPasswordResetModal(false)}
                        onSuccess={() => setShowPasswordResetModal(false)}
                    />
                )}
                <InstallPWABanner />
                <Routes>
                    {currentUser ? (
                        <Route path="/" element={<AppLayout currentUser={currentUser} allUsers={allUsers} notifications={notifications} handleLogout={handleLogout} />}>
                            {/* Default route after login, adjusted by role */}
                            <Route
                                index
                                element={
                                    <Navigate
                                        to={roleLandingPath}
                                        replace
                                    />
                                }
                            />

                            {/* Bawahan Routes */}
                            <Route path="beranda" element={<DashboardBawahanPage user={currentUser} />} />
                            <Route path="absensi" element={<AbsensiPage user={currentUser} />} />
                            <Route path="pengajuan" element={<PengajuanPage user={currentUser} />} />
                            <Route path="riwayat" element={<RiwayatPage user={currentUser} />} />
                            <Route path="laporan" element={<LaporanSayaPage user={currentUser} />} />
                            <Route path="jadwal-shift" element={<JadwalShiftPage user={currentUser} />} />
                            <Route path="profil" element={<ProfilSayaPage user={currentUser} />} />

                            {/* Atasan Routes */}
                            <Route path="dashboard" element={requireManager(<AtasanDashboardPage user={currentUser} onNavigate={handleNavigate} />)} />
                            <Route path="persetujuan" element={requireManager(<PersetujuanTimPage user={currentUser} />)} />
                            <Route path="tim" element={requireManager(<TimSayaPage user={currentUser} />)} />
                            <Route path="laporan-tim" element={requireManager(<LaporanTimPage user={currentUser} />)} />
                            <Route path="simulasi-cuti-lembur" element={requireManager(<SimulasiCutiLemburPage user={currentUser} />)} />
                            <Route path="presensi-tim" element={requireManager(<PresensiTimPage user={currentUser} />)} />

                            {/* Superadmin Routes */}
                            <Route path="superadmin/dashboard" element={requireSuperadmin(<SuperadminDashboardPage user={currentUser} allUsers={allUsers} />)} />
                            <Route path="superadmin/pegawai" element={requireSuperadmin(<KonfigurasiPegawaiPage user={currentUser} />)} />
                            <Route path="superadmin/sistem" element={requireSuperadmin(<KonfigurasiSistemPage user={currentUser} />)} />
                            <Route path="superadmin/laporan-semua" element={requireSuperadmin(<SemuaLaporanPage user={currentUser} />)} />
                            <Route path="superadmin/jadwal-shift" element={requireSuperadmin(<JadwalSuperadminPage user={currentUser} />)} />

                            {/* Admin Routes */}
                            <Route path="admin/laporan-semua" element={requirePrivileged(<SemuaLaporanPage user={currentUser} />)} />
                            <Route path="admin/jadwal-shift" element={requirePrivileged(<JadwalAdminPage user={currentUser} />)} />

                            {/* General Routes */}
                            <Route path="presensi" element={<PresensiPage user={currentUser} />} />
                            <Route path="kpi" element={<KpiPage user={currentUser} />} />

                            {/* Redirect any other authenticated path to role-specific landing */}
                            <Route
                                path="*"
                                element={
                                    <Navigate
                                        to={roleLandingPath}
                                        replace
                                    />
                                }
                            />
                        </Route>
                    ) : (
                        <Route path="*" element={<AuthRoutes blockedMessage={blockedMessage} clearBlockedMessage={() => setBlockedMessage(null)} />} />
                    )}
                </Routes>
            </ErrorBoundary>
        </ToastProvider>
    );
}
