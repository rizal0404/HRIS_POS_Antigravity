"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, Request, RequestType, RequestStatus, Attendance } from '../../../types';
import { apiService } from '../../../services/apiService';
import {
    ClockIcon,
    DocumentAddIcon,
    CheckCircleIcon,
    CalendarIcon,
    BriefcaseIcon,
    RefreshIcon,
    XIcon
} from '../../../components/icons';
import { getAllSubordinates, formatDateKey, formatTime } from '../../../lib/utils';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import AssignRequestModal from '@/components/modals/AssignRequestModal';

interface DashboardPageProps {
    user: UserProfile;
    onNavigate: (path: string) => void;
}

// Helper to parse and format reason field
const formatReasonText = (reason: string | undefined, requestType: RequestType): string => {
    if (!reason) return '-';

    try {
        const parsed = JSON.parse(reason);

        if (requestType === RequestType.CUTI) {
            return parsed.reason || 'Cuti';
        }
        if (requestType === RequestType.SUBSTITUSI) {
            const shiftAwal = parsed.shift_awal?.code || parsed.shift_awal?.name || '-';
            const shiftBaru = parsed.shift_baru?.code || parsed.shift_baru?.name || '-';
            return `${shiftAwal} → ${shiftBaru}`;
        }
        if (parsed.keterangan) return parsed.keterangan;
        if (parsed.reason) return parsed.reason;

        return reason.length > 50 ? reason.substring(0, 50) + '...' : reason;
    } catch {
        return reason.length > 50 ? reason.substring(0, 50) + '...' : reason;
    }
};

const AtasanDashboardPage: React.FC<DashboardPageProps> = ({ user, onNavigate }) => {
    const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [todayAttendance, setTodayAttendance] = useState<{ profile: UserProfile; attendance?: Attendance; leaveType?: string }[]>([]);
    const [weeklyAttendanceData, setWeeklyAttendanceData] = useState<{ day: string; percentage: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);

    const fetchData = useCallback(async () => {
        setRefreshing(true);
        try {
            const users = await apiService.getProfiles();
            setAllUsers(users);
            const subordinates = getAllSubordinates(user.id, users);
            const subIds = subordinates.map((s) => s.id);

            if (subIds.length > 0) {
                const today = new Date();
                const todayStr = formatDateKey(today);

                // Get start of current week (Monday)
                const dayOfWeek = today.getDay();
                const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() + diffToMonday);
                startOfWeek.setHours(0, 0, 0, 0);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);

                const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const startDateStr = formatDateKey(startMonth);
                const endDateStr = formatDateKey(today);

                const [allSubordinateRequests, attendanceWeek, leaves] = await Promise.all([
                    apiService.getSubordinateRequests(subIds),
                    apiService.getAttendanceForSubordinates(subIds, startOfWeek.toISOString(), endOfWeek.toISOString()),
                    apiService.getOtherApprovedRequestsForPeriod(subIds, startDateStr, endDateStr),
                ]);

                setPendingRequests(allSubordinateRequests.filter((r) => r.status === RequestStatus.PENDING));

                // Calculate Weekly Attendance Data
                const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
                const weekData: { day: string; percentage: number }[] = [];

                for (let i = 0; i < 7; i++) {
                    const currentDay = new Date(startOfWeek);
                    currentDay.setDate(startOfWeek.getDate() + i);
                    const dayStr = formatDateKey(currentDay);

                    // Count how many subordinates clocked in on this day
                    const presentCount = attendanceWeek.filter(a => {
                        const clockInDate = formatDateKey(new Date(a.clock_in));
                        return clockInDate === dayStr;
                    }).length;

                    // Calculate percentage (only for past days, future days are 0)
                    const isPast = currentDay <= today;
                    const percentage = isPast && subIds.length > 0
                        ? Math.round((presentCount / subIds.length) * 100)
                        : 0;

                    weekData.push({ day: weekDays[i], percentage });
                }

                setWeeklyAttendanceData(weekData);

                // Process "Who's Out Today"
                const outToday = subordinates.map(sub => {
                    const dailyAtt = attendanceWeek.find(a => a.profile_id === sub.id && formatDateKey(new Date(a.clock_in)) === todayStr);
                    const onLeave = leaves.find(l => {
                        const start = new Date(l.start_date);
                        const end = new Date(l.end_date);
                        return l.profile_id === sub.id && today >= start && today <= end;
                    });

                    return {
                        profile: sub,
                        attendance: dailyAtt,
                        leaveType: onLeave ? onLeave.request_type : undefined
                    };
                }).filter(item => !item.attendance && item.leaveType);

                setTodayAttendance(outToday);

            } else {
                setPendingRequests([]);
                setTodayAttendance([]);
                setWeeklyAttendanceData([]);
            }
        } catch (e) {
            console.error("Failed to load dashboard data:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Create a map for quick user lookup
    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

    const getEmployeeName = (profileId: string): string => {
        const emp = userMap.get(profileId);
        return emp?.full_name || 'Unknown';
    };

    const getEmployeeAvatar = (profileId: string): string | undefined => {
        const emp = userMap.get(profileId);
        return emp?.avatar_url;
    };

    const stats = useMemo(() => {
        const leaveReqs = pendingRequests.filter(r => [RequestType.CUTI, RequestType.SAKIT, RequestType.IZIN].includes(r.request_type)).length;
        const overtimeReqs = pendingRequests.filter(r => r.request_type === RequestType.LEMBUR).length;
        const shiftSwapReqs = pendingRequests.filter(r => r.request_type === RequestType.SUBSTITUSI || r.request_type === RequestType.KOREKSI).length;

        return { leaveReqs, overtimeReqs, shiftSwapReqs };
    }, [pendingRequests]);

    const averageAttendance = useMemo(() => {
        const validDays = weeklyAttendanceData.filter(d => d.percentage > 0);
        if (validDays.length === 0) return 0;
        return Math.round(validDays.reduce((sum, d) => sum + d.percentage, 0) / validDays.length);
    }, [weeklyAttendanceData]);

    const handleApprove = async (req: Request) => {
        setProcessingId(req.id);
        try {
            await apiService.updateRequestStatus(req.id, RequestStatus.APPROVED, user.id);
            await fetchData();
        } catch (error) {
            console.error("Failed to approve:", error);
            alert("Gagal menyetujui permintaan.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (req: Request) => {
        setProcessingId(req.id);
        try {
            await apiService.updateRequestStatus(req.id, RequestStatus.REJECTED, user.id);
            await fetchData();
        } catch (error) {
            console.error("Failed to reject:", error);
            alert("Gagal menolak permintaan.");
        } finally {
            setProcessingId(null);
        }
    };

    const getRequestBadge = (type: RequestType) => {
        const baseStyles = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap";
        switch (type) {
            case RequestType.CUTI:
                return <span className={`${baseStyles} bg-orange-100 text-orange-700`}><BriefcaseIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Cuti</span>;
            case RequestType.SAKIT:
                return <span className={`${baseStyles} bg-red-100 text-red-700`}><span className="material-symbols-outlined text-[14px] flex-shrink-0">thermometer</span>Sakit</span>;
            case RequestType.LEMBUR:
                return <span className={`${baseStyles} bg-blue-100 text-blue-700`}><ClockIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Lembur</span>;
            case RequestType.SUBSTITUSI:
                return <span className={`${baseStyles} bg-teal-100 text-teal-700`}><RefreshIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Tukar Shift</span>;
            case RequestType.KOREKSI:
                return <span className={`${baseStyles} bg-purple-100 text-purple-700`}><RefreshIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Koreksi</span>;
            case RequestType.IZIN:
                return <span className={`${baseStyles} bg-indigo-100 text-indigo-700`}><DocumentAddIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Izin</span>;
            default:
                return <span className={`${baseStyles} bg-gray-100 text-gray-700`}>{type}</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Spinner /> <span className="ml-2 text-text-secondary font-medium">Memuat Dashboard...</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header Section */}
            <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 shrink-0">
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Selamat Datang, {user.full_name.split(' ')[0]}</h2>
                    <p className="text-xs text-slate-500">Ringkasan aktivitas tim Anda hari ini</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                        {refreshing ? <Spinner className="w-5 h-5" /> : <RefreshIcon className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Needs Attention Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-blue-600 text-[20px]">bolt</span>
                            <h3 className="font-bold text-sm text-slate-800">Perlu Perhatian</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('/persetujuan')}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Cuti & Izin</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-3xl font-black text-slate-900">{stats.leaveReqs}</span>
                                            <span className="text-xs font-medium text-orange-500">Pending</span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 bg-orange-50 rounded-xl">
                                        <span className="material-symbols-outlined text-orange-500 text-[22px]">calendar_month</span>
                                    </div>
                                </div>
                                {stats.leaveReqs > 0 && (
                                    <p className="text-[10px] font-medium text-green-600 flex items-center gap-1 mt-3">
                                        <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                        Perlu ditinjau
                                    </p>
                                )}
                            </Card>

                            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('/persetujuan')}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Lembur</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-3xl font-black text-slate-900">{stats.overtimeReqs}</span>
                                            <span className="text-xs font-medium text-orange-500">Pending</span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 bg-blue-50 rounded-xl">
                                        <span className="material-symbols-outlined text-blue-500 text-[22px]">timer</span>
                                    </div>
                                </div>
                                {stats.overtimeReqs > 0 && (
                                    <p className="text-[10px] font-medium text-green-600 flex items-center gap-1 mt-3">
                                        <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                        Perlu ditinjau
                                    </p>
                                )}
                            </Card>

                            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('/persetujuan')}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Tukar Shift</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-3xl font-black text-slate-900">{stats.shiftSwapReqs}</span>
                                            <span className="text-xs font-medium text-orange-500">Pending</span>
                                        </div>
                                    </div>
                                    <div className="p-2.5 bg-teal-50 rounded-xl">
                                        <span className="material-symbols-outlined text-teal-500 text-[22px]">sync_alt</span>
                                    </div>
                                </div>
                                {stats.shiftSwapReqs > 0 && (
                                    <p className="text-[10px] font-medium text-green-600 flex items-center gap-1 mt-3">
                                        <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                        Perlu ditinjau
                                    </p>
                                )}
                            </Card>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Quick Review Section */}
                        <div className="xl:col-span-2 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-sm text-slate-800">Tinjauan Cepat</h3>
                                <button onClick={() => onNavigate('/persetujuan')} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Lihat Semua</button>
                            </div>

                            <Card className="overflow-hidden">
                                {pendingRequests.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <CheckCircleIcon className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                                        <p className="text-sm">Tidak ada pengajuan pending.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Karyawan</th>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Jenis</th>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Tanggal</th>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px] text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {pendingRequests.slice(0, 5).map((req) => {
                                                    const employeeName = getEmployeeName(req.profile_id);
                                                    const employeeAvatar = getEmployeeAvatar(req.profile_id);

                                                    return (
                                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden flex-shrink-0">
                                                                        {employeeAvatar ? (
                                                                            <img src={employeeAvatar} alt={employeeName} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                                                                {employeeName.charAt(0)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-slate-900 text-xs truncate">{employeeName}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="space-y-1">
                                                                    {getRequestBadge(req.request_type)}
                                                                    <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                                                        {formatReasonText(req.reason, req.request_type)}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-xs">
                                                                {new Date(req.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                                {req.end_date !== req.start_date && (
                                                                    <span> - {new Date(req.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        onClick={() => handleReject(req)}
                                                                        disabled={!!processingId}
                                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                                        title="Tolak"
                                                                    >
                                                                        <XIcon className="w-4 h-4 text-[16px]" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleApprove(req)}
                                                                        disabled={!!processingId}
                                                                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"
                                                                    >
                                                                        {processingId === req.id ? (
                                                                            <Spinner className="w-3 h-3 border-white" />
                                                                        ) : (
                                                                            <CheckCircleIcon className="w-3 h-3 text-[12px]" />
                                                                        )}
                                                                        <span>Setuju</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Weekly Attendance */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-sm text-slate-800">Kehadiran Mingguan</h3>
                                <Card className="p-4">
                                    <div className="h-28 flex items-end justify-between gap-1.5 mb-3">
                                        {weeklyAttendanceData.map((d, i) => (
                                            <div key={i} className="flex-1 bg-slate-100 rounded-t relative h-full">
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t transition-all duration-500"
                                                    style={{ height: `${d.percentage}%` }}
                                                ></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 uppercase font-medium">
                                        {weeklyAttendanceData.map((d, i) => (
                                            <span key={i} className="flex-1 text-center">{d.day}</span>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-xs text-slate-500">Rata-rata Kehadiran</span>
                                        <span className="text-lg font-black text-slate-900">{averageAttendance}%</span>
                                    </div>
                                </Card>
                            </div>

                            {/* Who's Out Today */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-sm text-slate-800">Tidak Hadir Hari Ini</h3>
                                <Card className="p-4 space-y-3">
                                    {todayAttendance.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-4">Semua tim hadir hari ini!</p>
                                    ) : (
                                        todayAttendance.slice(0, 4).map((item) => (
                                            <div key={item.profile.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 overflow-hidden border border-orange-200">
                                                        {item.profile.avatar_url ? (
                                                            <img src={item.profile.avatar_url} alt={item.profile.full_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-orange-600 font-bold text-xs">{item.profile.full_name.charAt(0)}</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-xs">{item.profile.full_name}</p>
                                                        <p className="text-[10px] text-slate-500 capitalize">{item.leaveType?.replace('_', ' ').toLowerCase() || 'Tidak Hadir'}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-slate-400">Seharian</span>
                                            </div>
                                        ))
                                    )}

                                    <button
                                        onClick={() => onNavigate('/tim')}
                                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
                                    >
                                        Lihat Kalender Tim
                                    </button>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-sm text-slate-800">Aksi Cepat</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <button className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-center gap-2 hover:border-blue-300 hover:shadow-sm transition-all" onClick={() => onNavigate('/tim')}>
                                <span className="material-symbols-outlined text-blue-600 text-[20px]">person_add</span>
                                <span className="font-semibold text-slate-700 text-sm">Atur Shift</span>
                            </button>
                            <button className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-center gap-2 hover:border-orange-300 hover:shadow-sm transition-all" onClick={() => setShowAssignModal(true)}>
                                <span className="material-symbols-outlined text-orange-600 text-[20px]">assignment_add</span>
                                <span className="font-semibold text-slate-700 text-sm">Assign Cuti/Lembur</span>
                            </button>
                            <button className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-center gap-2 hover:border-blue-300 hover:shadow-sm transition-all">
                                <span className="material-symbols-outlined text-purple-600 text-[20px]">campaign</span>
                                <span className="font-semibold text-slate-700 text-sm">Pengumuman Tim</span>
                            </button>
                            <button className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-center gap-2 hover:border-blue-300 hover:shadow-sm transition-all" onClick={() => onNavigate('/laporan-tim')}>
                                <span className="material-symbols-outlined text-slate-600 text-[20px]">download</span>
                                <span className="font-semibold text-slate-700 text-sm">Laporan Mingguan</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assign Request Modal */}
            <AssignRequestModal
                isOpen={showAssignModal}
                onClose={() => setShowAssignModal(false)}
                onSuccess={() => {
                    setShowAssignModal(false);
                    fetchData();
                }}
                manager={user}
            />
        </div>
    );
};

export default AtasanDashboardPage;
