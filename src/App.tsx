import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { UserProfile, UserRole, Request, RequestType, RequestStatus } from './types';
import { supabase } from './services/supabase';
import { apiService } from './services/apiService';
import { getAllSubordinates } from './lib/utils';
import { logInfo, logError, logWarn } from './lib/logger';
import ErrorBoundary from './components/ErrorBoundary';

// Import pages
import AbsensiPage from './app/(app)/(bawahan)/absensiPage';
import PengajuanPage from './app/(app)/(bawahan)/pengajuanPage';
import RiwayatPage from './app/(app)/(bawahan)/riwayatPage';
import LaporanSayaPage from './app/(app)/(bawahan)/laporanPage';
import JadwalShiftPage from './app/(app)/(bawahan)/jadwal_shiftPage';
import PresensiPage from './app/(app)/presensiPage';
import ProfilSayaPage from './app/(app)/(bawahan)/profilPage';
import AtasanDashboardPage from './app/(app)/(atasan)/dashboardPage';
import PersetujuanTimPage from './app/(app)/(atasan)/persetujuanPage';
import TimSayaPage from './app/(app)/(atasan)/timPage';
import LaporanTimPage from './app/(app)/(atasan)/laporan_timPage';
import SuperadminDashboardPage from './app/(app)/(superadmin)/dashboardPage';
import KonfigurasiPegawaiPage from './app/(app)/(superadmin)/pegawaiPage';
import KonfigurasiSistemPage from './app/(app)/(superadmin)/sistemPage';
import SemuaLaporanPage from './app/(app)/(superadmin)/laporan_semuaPage';
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
        <div className="relative flex h-screen bg-gray-100 font-sans">
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
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200">
                    <Outlet /> {/* Child routes will render here */}
                </main>
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
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [notifications, setNotifications] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [registrationPending, setRegistrationPending] = useState(false);
    const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleNavigate = (path: string) => {
        navigate(path);
    };

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
        logInfo('App component mounted. Setting up auth listener.');
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            logInfo(`Auth state changed: ${_event}`, { hasSession: !!session });
            setSession(session);
        });
        return () => {
            logInfo('App component unmounting. Unsubscribing from auth changes.');
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (session?.user) {
            const fetchProfileAndUsers = async () => {
                try {
                    const [{ data: profile, error: profileError }, { data: users, error: usersError }] = await Promise.all([
                        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
                        supabase.from('profiles').select('*')
                    ]);
                    if (profileError) throw profileError;
                    if (usersError) throw usersError;
                    setAllUsers(users as UserProfile[]);
                        if (profile) {
                            const { data: pendingReg, error: regErr } = await supabase
                                .from('requests')
                                .select('status')
                                .eq('profile_id', profile.id)
                                .eq('request_type', RequestType.REGISTRASI)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            if (regErr && regErr.code !== 'PGRST116') logWarn('Failed to check registration status', regErr);
                            const isRegistrationPending = pendingReg?.status === RequestStatus.PENDING;
                            setRegistrationPending(isRegistrationPending);

                            if (profile.approved === false) {
                                setBlockedMessage('Akun menunggu persetujuan superadmin.');
                                setRegistrationPending(true);
                                await supabase.auth.signOut();
                                setCurrentUser(null);
                                setLoading(false);
                                return;
                            }

                            const { count, error: managerError } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('manager_id', profile.id);
                            if (managerError) logWarn('Could not determine manager status', managerError);
                            const isManager = (count ?? 0) > 0;
                            const completeProfile = { ...profile, isManager } as UserProfile;
                            setCurrentUser(completeProfile);
                            loadNotifications(completeProfile, users as UserProfile[]);
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
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-xl font-semibold">Loading...</div>
            </div>
        );
    }

    if (currentUser && registrationPending) {
        return <PendingApprovalPage onLogout={handleLogout} />;
    }

    return (
        <ErrorBoundary>
            <Routes>
                {currentUser ? (
                    <Route path="/" element={<AppLayout currentUser={currentUser} allUsers={allUsers} notifications={notifications} handleLogout={handleLogout} />}>
                        {/* Default route after login, adjusted by role */}
                        <Route
                            index
                            element={
                                <Navigate
                                    to={
                                        currentUser.role === UserRole.USER
                                            ? "/absensi"
                                            : currentUser.role === UserRole.SUPERADMIN
                                                ? "/superadmin/dashboard"
                                                : "/dashboard"
                                    }
                                    replace
                                />
                            }
                        />
                        
                        {/* Bawahan Routes */}
                        <Route path="absensi" element={<AbsensiPage user={currentUser} />} />
                        <Route path="pengajuan" element={<PengajuanPage user={currentUser} />} />
                        <Route path="riwayat" element={<RiwayatPage user={currentUser} />} />
                        <Route path="laporan" element={<LaporanSayaPage user={currentUser} />} />
                        <Route path="jadwal-shift" element={<JadwalShiftPage user={currentUser} />} />
                        <Route path="profil" element={<ProfilSayaPage user={currentUser} />} />

                        {/* Atasan Routes */}
                        <Route path="dashboard" element={<AtasanDashboardPage user={currentUser} onNavigate={handleNavigate} />} />
                        <Route path="persetujuan" element={<PersetujuanTimPage user={currentUser} />} />
                        <Route path="tim" element={<TimSayaPage user={currentUser} />} />
                        <Route path="laporan-tim" element={<LaporanTimPage user={currentUser} />} />

                        {/* Superadmin Routes */}
                        <Route path="superadmin/dashboard" element={<SuperadminDashboardPage user={currentUser} allUsers={allUsers} />} />
                        <Route path="superadmin/pegawai" element={<KonfigurasiPegawaiPage user={currentUser} />} />
                        <Route path="superadmin/sistem" element={<KonfigurasiSistemPage user={currentUser} />} />
                        <Route path="superadmin/laporan-semua" element={<SemuaLaporanPage user={currentUser} />} />

                        {/* General Routes */}
                        <Route path="presensi" element={<PresensiPage user={currentUser} />} />
                        
                        {/* Redirect any other authenticated path to role-specific landing */}
                        <Route
                            path="*"
                            element={
                                <Navigate
                                    to={
                                        currentUser.role === UserRole.USER
                                            ? "/absensi"
                                            : currentUser.role === UserRole.SUPERADMIN
                                                ? "/superadmin/dashboard"
                                                : "/dashboard"
                                    }
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
    );
}
