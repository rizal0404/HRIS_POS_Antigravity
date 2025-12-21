"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfile, Attendance, Request, RequestStatus, JadwalKerjaTim } from '../../../types';
import { apiService } from '../../../services/apiService';
import { KPI_DEFAULT_CONFIG, KPI_STORAGE_KEY, computeKpiScore, normalizeKpiConfig } from '@/components/kpi/KpiCalculator';
import { APP_TIME_ZONE, APP_TIME_OFFSET, formatDateKey, formatTime } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { ClockInModal } from '@/components/modals/ClockInOutModal';
import SkorDisiplinCard from '../../../components/dashboard/SkorDisiplinCard';
import {
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    DocumentAddIcon,
    RefreshIcon,
    TimeIcon,
    DocumentReportIcon,
    BriefcaseIcon
} from '@/components/icons';

type KpiConfigShape = typeof KPI_DEFAULT_CONFIG;
type KpiResultShape = ReturnType<typeof computeKpiScore>;

interface RecentDay {
    dateKey: string;
    shift: string;
    status: string;
    statusVariant: 'success' | 'warning' | 'danger' | 'info' | 'secondary';
    clockIn?: string;
    clockOut?: string;
}

const formatDuration = (minutes: number): string => {
    if (!Number.isFinite(minutes) || minutes <= 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs <= 0) return `${mins}m`;
    if (mins === 0) return `${hrs}j`;
    return `${hrs}j ${mins}m`;
};

const statusMeta = (status?: string, isLeave?: boolean): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'secondary' } => {
    if (isLeave) {
        return { label: 'Cuti/Izin', variant: 'info' };
    }
    switch ((status || '').toLowerCase()) {
        case 'hadir':
            return { label: 'Hadir', variant: 'success' };
        case 'terlambat':
            return { label: 'Terlambat', variant: 'warning' };
        case 'pulang_cepat':
            return { label: 'Pulang Cepat', variant: 'warning' };
        case 'in_progress':
            return { label: 'Bekerja', variant: 'info' };
        case 'absent':
        case 'incomplete':
            return { label: 'Absen', variant: 'danger' };
        default:
            return { label: '-', variant: 'secondary' };
    }
};

const DashboardBawahanPage: React.FC<{ user: UserProfile }> = ({ user }) => {
    const [kpiConfig, setKpiConfig] = useState<KpiConfigShape>(KPI_DEFAULT_CONFIG);
    const [kpiSnapshot, setKpiSnapshot] = useState<{
        presence: number;
        discipline: number;
        final: number;
        workedHours: number;
        plannedLeaveDays: number;
        unauthDays: number;
        overtimeHours: number;
    } | null>(null);
    const [todaySummary, setTodaySummary] = useState<{ clockIn?: string; clockOut?: string; status?: string; durationMinutes: number }>({
        durationMinutes: 0,
    });
    const [recentAttendance, setRecentAttendance] = useState<RecentDay[]>([]);
    const [recentRequests, setRecentRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'in' | 'out'>('in');
    const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null);
    const [jadwal, setJadwal] = useState<JadwalKerjaTim[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(KPI_STORAGE_KEY);
            if (stored) {
                setKpiConfig(normalizeKpiConfig(JSON.parse(stored)));
            }
        } catch {
            setKpiConfig(KPI_DEFAULT_CONFIG);
        }
    }, []);

    const category = useMemo(
        () => ((user.default_shift || '').toLowerCase().includes('shift') ? 'SHIFT' : 'DAYSHIFT'),
        [user.default_shift],
    );

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const now = new Date();
            const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // MTD only
            const startIso = startMonth.toISOString();
            const endIso = endMonth.toISOString();
            const startDateStr = formatDateKey(startMonth, APP_TIME_ZONE);
            const endDateStr = formatDateKey(endMonth, APP_TIME_ZONE);

            const last3Start = new Date(now);
            last3Start.setDate(now.getDate() - 2);
            last3Start.setHours(0, 0, 0, 0);
            const last3End = new Date(now);
            last3End.setHours(23, 59, 59, 999);

            const [
                attendanceMonth,
                leaves,
                attendanceLast3,
                schedulesLast3,
                requests,
                overtimeApproved,
                activeAtt
            ] = await Promise.all([
                apiService.getAttendanceForSubordinates([user.id], startIso, endIso),
                apiService.getOtherApprovedRequestsForPeriod(
                    [user.id],
                    formatDateKey(last3Start, APP_TIME_ZONE),
                    endDateStr,
                ),
                apiService.getAttendanceForSubordinates([user.id], last3Start.toISOString(), last3End.toISOString()),
                apiService.getTeamSchedules(
                    [user.id],
                    formatDateKey(last3Start, APP_TIME_ZONE),
                    formatDateKey(last3End, APP_TIME_ZONE),
                ),
                apiService.getRequestsForUser(user.id, 6),
                apiService.getOvertimeRequestsForSubordinates([user.id], startDateStr, endDateStr),
                apiService.getActiveAttendance(user.id)
            ]);

            setActiveAttendance(activeAtt);

            // Convert schedules to JadwalKerjaTim[] for modal
            const jadwalList: JadwalKerjaTim[] = schedulesLast3.map(s => ({
                date: s.date,
                shift: s.shift,
                is_off: s.shift === 'OFF',
                // Map other properties if needed or create partial content
                start_time: '08:00', // Default or fetch real shift times if needed
                end_time: '17:00'
            }));
            setJadwal(jadwalList);

            const leaveDays = new Set<string>();
            leaves.forEach((req) => {
                const startReq = new Date(req.start_date);
                const endReq = new Date(req.end_date);
                const cappedEnd = endReq > endMonth ? endMonth : endReq; // only count until today
                for (let d = new Date(startReq); d <= cappedEnd; d.setDate(d.getDate() + 1)) {
                    const key = formatDateKey(d, APP_TIME_ZONE);
                    if (key >= startDateStr && key <= endDateStr) {
                        leaveDays.add(key);
                    }
                }
            });

            const attendanceByDate = new Map<string, Attendance>();
            attendanceMonth.forEach((att) => {
                const key = formatDateKey(new Date(att.clock_in), APP_TIME_ZONE);
                const existing = attendanceByDate.get(key);
                if (!existing || new Date(att.clock_in).getTime() > new Date(existing.clock_in).getTime()) {
                    attendanceByDate.set(key, att);
                }
            });

            const allDays: string[] = [];
            for (let d = new Date(startMonth); d <= endMonth; d.setDate(d.getDate() + 1)) {
                allDays.push(formatDateKey(d, APP_TIME_ZONE));
            }

            let workedHours = 0;
            let unauthDays = 0;
            allDays.forEach((key) => {
                const att = attendanceByDate.get(key);
                if (att && att.clock_in && att.clock_out) {
                    const diff =
                        (new Date(att.clock_out).getTime() - new Date(att.clock_in).getTime()) / (1000 * 60 * 60);
                    if (Number.isFinite(diff) && diff > 0) {
                        workedHours += diff;
                    }
                }
                if (att) {
                    if (att.status && att.status.toLowerCase() !== 'hadir') {
                        unauthDays += 1;
                    }
                } else if (!leaveDays.has(key)) {
                    unauthDays += 1;
                }
            });

            const plannedLeaveDays = leaveDays.size;
            let overtimeHours = 0;
            overtimeApproved.forEach((req) => {
                if (req.start_time && req.end_time) {
                    const startDt = new Date(`${req.start_date}T${req.start_time}${APP_TIME_OFFSET}`);
                    const endDt = new Date(`${req.start_date}T${req.end_time}${APP_TIME_OFFSET}`);
                    let diff = (endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60);
                    if (!Number.isFinite(diff)) return;
                    if (diff < 0) {
                        // shift yang melewati tengah malam
                        diff += 24;
                    }
                    if (diff > 0) {
                        overtimeHours += diff;
                    }
                }
            });

            const kpiResult: KpiResultShape = computeKpiScore(
                {
                    category,
                    period: 'MONTHLY',
                    plannedLeaveDays,
                    actualWorkingHours: Number(workedHours.toFixed(2)),
                    outputTarget: 0,
                    outputActual: 0,
                    unauthorisedAbsenceDays: unauthDays,
                },
                kpiConfig,
            );

            setKpiSnapshot({
                presence: kpiResult.kpi1Presence,
                discipline: kpiResult.kpi3Discipline,
                final: kpiResult.finalScore,
                workedHours,
                plannedLeaveDays,
                unauthDays,
                overtimeHours,
            });

            const attendanceLast3Map = new Map<string, Attendance>();
            attendanceLast3.forEach((att) => {
                const key = formatDateKey(new Date(att.clock_in), APP_TIME_ZONE);
                const existing = attendanceLast3Map.get(key);
                if (!existing || new Date(att.clock_in).getTime() > new Date(existing.clock_in).getTime()) {
                    attendanceLast3Map.set(key, att);
                }
            });
            const scheduleMap = new Map<string, string>(schedulesLast3.map((s) => [s.date, s.shift]));

            const lastThreeDays: RecentDay[] = [];
            for (let d = new Date(last3End); d >= last3Start; d.setDate(d.getDate() - 1)) {
                const key = formatDateKey(d, APP_TIME_ZONE);
                const att = attendanceLast3Map.get(key);
                const shiftLabel = scheduleMap.get(key) || '-';
                const meta = statusMeta(att?.status, leaveDays.has(key));
                lastThreeDays.push({
                    dateKey: key,
                    shift: shiftLabel,
                    status: meta.label,
                    statusVariant: meta.variant,
                    clockIn: att?.clock_in,
                    clockOut: att?.clock_out,
                });
            }
            setRecentAttendance(lastThreeDays);

            const todayKey = formatDateKey(now, APP_TIME_ZONE);
            const todayAtt = activeAtt && formatDateKey(new Date(activeAtt.clock_in), APP_TIME_ZONE) === todayKey ? activeAtt : (attendanceLast3Map.get(todayKey) || attendanceByDate.get(todayKey));
            const durationMinutes =
                todayAtt && todayAtt.clock_in
                    ? Math.max(
                        0,
                        Math.round(
                            ((todayAtt.clock_out ? new Date(todayAtt.clock_out) : now).getTime() -
                                new Date(todayAtt.clock_in).getTime()) /
                            (1000 * 60),
                        ),
                    )
                    : 0;
            setTodaySummary({
                clockIn: todayAtt?.clock_in,
                clockOut: todayAtt?.clock_out,
                status: todayAtt?.status,
                durationMinutes,
            });

            setRecentRequests(requests);
        } catch (e: any) {
            setError(e?.message || 'Gagal memuat dashboard.');
        } finally {
            setLoading(false);
        }
    }, [category, kpiConfig, user.id]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const handleOpenModal = (type: 'in' | 'out') => {
        setModalAction(type);
        setIsModalOpen(true);
    };

    const handleModalSuccess = (msg: string) => {
        setIsModalOpen(false);
        // Refresh dashboard to show new status
        fetchDashboard();
    };

    const getRequestStatusBadge = (status: RequestStatus) => {
        switch (status) {
            case RequestStatus.APPROVED: return <Badge variant="success">Disetujui</Badge>;
            case RequestStatus.REJECTED: return <Badge variant="danger">Ditolak</Badge>;
            case RequestStatus.REVISED: return <Badge variant="warning">Revisi</Badge>;
            default: return <Badge variant="info">Pending</Badge>;
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Selamat datang kembali, {user.full_name.split(' ')[0]}!</h1>
                    <p className="text-text-secondary mt-1">Berikut ringkasan kehadiran harian Anda.</p>
                </div>
                <button
                    onClick={fetchDashboard}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-surface-light border border-[#f0f2f4] text-text-main px-4 py-2 text-sm font-semibold shadow-sm hover:bg-background-light transition-all disabled:opacity-50"
                >
                    {loading ? <Spinner /> : <RefreshIcon className="text-[18px]" />}
                    <span>Segarkan</span>
                </button>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                {/* Hero Attendance Card (Span 2 cols on lg) */}
                <Card variant="hero" className="col-span-1 lg:col-span-2 relative overflow-hidden p-6 flex flex-col justify-between min-h-[240px]">
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="opacity-90 font-medium">Semoga harimu menyenangkan!</p>
                            <h2 className="text-3xl font-bold mt-1">{formatTime(new Date(), { hour: '2-digit', minute: '2-digit' })}</h2>
                            <p className="text-sm opacity-80 mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md rounded-lg p-2">
                            <span className="material-symbols-outlined text-[32px]">{statusMeta(todaySummary.status).variant === 'success' ? 'sunny' : 'cloud'}</span>
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-3 gap-4 mt-6">
                        <div
                            onClick={() => handleOpenModal('in')}
                            className="bg-white/10 backdrop-blur-sm rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-colors"
                        >
                            <div className="flex items-center gap-2 opacity-80 mb-1">
                                <span className="material-symbols-outlined text-[16px]">login</span>
                                <span className="text-xs font-medium">Masuk</span>
                            </div>
                            <p className="text-lg font-bold">{todaySummary.clockIn ? formatTime(new Date(todaySummary.clockIn), { second: undefined }) : '--:--'}</p>
                        </div>
                        <div
                            onClick={() => handleOpenModal('out')}
                            className="bg-white/10 backdrop-blur-sm rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-colors"
                        >
                            <div className="flex items-center gap-2 opacity-80 mb-1">
                                <span className="material-symbols-outlined text-[16px]">logout</span>
                                <span className="text-xs font-medium">Pulang</span>
                            </div>
                            <p className="text-lg font-bold">
                                {todaySummary.clockOut
                                    ? formatTime(new Date(todaySummary.clockOut), { second: undefined })
                                    : todaySummary.clockIn ? '--:--' : '--:--'
                                }
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                            <div className="flex items-center gap-2 opacity-80 mb-1">
                                <span className="material-symbols-outlined text-[16px]">timer</span>
                                <span className="text-xs font-medium">Durasi</span>
                            </div>
                            <p className="text-lg font-bold">{formatDuration(todaySummary.durationMinutes)}</p>
                        </div>
                    </div>

                    {/* Decorative Shapes */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
                </Card>

                {/* KPI Stats Grid (Span 1 or 2 cols depending on layout) */}
                <div className="col-span-1 lg:col-span-1 xl:col-span-2 grid grid-cols-2 gap-4">
                    <Card variant="stat" className="p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <CheckCircleIcon className="text-[20px]" />
                            </div>
                            <span className="text-sm font-medium text-text-secondary">Kehadiran</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-text-main">{kpiSnapshot ? kpiSnapshot.presence.toFixed(0) : '0'}%</span>
                        </div>
                        <ProgressBar value={kpiSnapshot?.presence || 0} color="bg-emerald-500" className="mt-2" />
                    </Card>

                    <SkorDisiplinCard user={user} />

                    <Card variant="stat" className="p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <TimeIcon className="text-[20px]" />
                            </div>
                            <span className="text-sm font-medium text-text-secondary">Jam Kerja</span>
                        </div>
                        <span className="text-2xl font-bold text-text-main">{kpiSnapshot ? kpiSnapshot.workedHours.toFixed(1) : '0'}j</span>
                        <p className="text-xs text-text-secondary mt-1">Bulan ini</p>
                    </Card>

                    <Card variant="stat" className="p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <ClockIcon className="text-[20px]" />
                            </div>
                            <span className="text-sm font-medium text-text-secondary">Lembur</span>
                        </div>
                        <span className="text-2xl font-bold text-text-main">{kpiSnapshot ? kpiSnapshot.overtimeHours.toFixed(1) : '0'}j</span>
                        <p className="text-xs text-text-secondary mt-1">Disetujui</p>
                    </Card>
                </div>

                {/* Recent Activity List */}
                <div className="col-span-1 lg:col-span-2 xl:col-span-2 space-y-4">
                    <h3 className="font-bold text-text-main text-lg">Aktivitas Terkini</h3>
                    <div className="space-y-3">
                        {recentAttendance.map((item) => (
                            <Card key={item.dateKey} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${item.statusVariant === 'success' ? 'bg-green-100 text-green-600' :
                                        item.statusVariant === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                            item.statusVariant === 'danger' ? 'bg-red-100 text-red-600' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        <CalendarIcon className="text-[20px]" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-text-main text-sm">
                                            {new Date(item.dateKey).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', weekday: 'short' })}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant={item.statusVariant}>{item.status}</Badge>
                                            <span className="text-xs text-text-secondary">• Shift: {item.shift}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-text-main">
                                        {item.clockIn ? formatTime(new Date(item.clockIn), { second: undefined }) : '-'}
                                    </p>
                                    <p className="text-xs text-text-secondary">Masuk</p>
                                </div>
                            </Card>
                        ))}
                        {recentAttendance.length === 0 && (
                            <div className="text-center py-8 text-text-secondary bg-surface-light rounded-2xl border border-dashed border-gray-200">
                                Belum ada aktivitas terkini
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Requests Section */}
                <div className="col-span-1 lg:col-span-1 xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-text-main text-lg">Permintaan Terkini</h3>
                        <button className="text-sm font-semibold text-primary hover:underline">Lihat Semua</button>
                    </div>
                    <div className="space-y-3">
                        {recentRequests.slice(0, 3).map((req) => (
                            <Card key={req.id} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                                            {req.request_type === 'LEAVE' ? <BriefcaseIcon className="text-[16px]" /> :
                                                req.request_type === 'OVERTIME' ? <ClockIcon className="text-[16px]" /> :
                                                    <DocumentAddIcon className="text-[16px]" />}
                                        </div>
                                        <span className="text-sm font-bold text-text-main capitalize">{req.request_type.replace('_', ' ').toLowerCase()}</span>
                                    </div>
                                    {getRequestStatusBadge(req.status)}
                                </div>
                                {(() => {
                                    let displayReason = req.reason || 'Tidak ada keterangan.';
                                    let extraInfo = '';

                                    try {
                                        if (req.request_type === 'Koreksi Absensi' && req.reason?.startsWith('{')) {
                                            const parsed = JSON.parse(req.reason) as any;
                                            // Map correction types to readable text
                                            const typeMap: Record<string, string> = {
                                                'missed_in': 'Lupa Clock In',
                                                'missed_out': 'Lupa Clock Out',
                                                'missed_both': 'Lupa Clock In & Out',
                                                'wrong_time': 'Kesalahan Waktu',
                                                'out': 'Pembetulan Pulang', // fallback
                                                'in': 'Pembetulan Masuk'   // fallback
                                            };
                                            const typeKey = String(parsed.type || '');
                                            const correctionType = typeMap[typeKey] || typeKey;
                                            displayReason = `${correctionType}: ${parsed.reason}`;

                                            // Optional: Format new times if available
                                            if (parsed.new_clock_in_iso || parsed.intended_iso) {
                                                // extraInfo can be added here if needed
                                            }
                                        }
                                    } catch (e) {
                                        // Fallback to raw string if parse fails
                                    }

                                    return (
                                        <p className="text-xs text-text-secondary line-clamp-2 mb-2">
                                            {displayReason}
                                        </p>
                                    );
                                })()}
                                <p className="text-xs text-text-secondary font-medium">
                                    {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </p>
                            </Card>
                        ))}
                        {recentRequests.length === 0 && (
                            <div className="text-center py-8 text-text-secondary bg-surface-light rounded-2xl border border-dashed border-gray-200">
                                Belum ada permintaan terkini
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Clock In Modal */}
            <ClockInModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
                onError={(msg) => alert(msg)} // Simple alert or toast if available
                user={user}
                actionType={modalAction}
                jadwal={jadwal}
                todayAttendance={activeAttendance}
            />
        </div>
    );
};

export default DashboardBawahanPage;
