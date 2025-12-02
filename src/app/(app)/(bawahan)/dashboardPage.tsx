"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfile, Attendance, Request, RequestStatus } from '../../../types';
import { apiService } from '../../../services/apiService';
import { KPI_DEFAULT_CONFIG, KPI_STORAGE_KEY, computeKpiScore, normalizeKpiConfig } from '@/components/kpi/KpiCalculator';
import { APP_TIME_ZONE, APP_TIME_OFFSET, formatDateKey, formatTime } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import { CalendarIcon, CheckCircleIcon, ClockIcon, DocumentAddIcon, RefreshIcon } from '@/components/icons';

type KpiConfigShape = typeof KPI_DEFAULT_CONFIG;
type KpiResultShape = ReturnType<typeof computeKpiScore>;

interface RecentDay {
    dateKey: string;
    shift: string;
    status: string;
    statusTone: string;
    clockIn?: string;
    clockOut?: string;
}

const formatDuration = (minutes: number): string => {
    if (!Number.isFinite(minutes) || minutes <= 0) return '0 menit';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs <= 0) return `${mins} menit`;
    if (mins === 0) return `${hrs} jam`;
    return `${hrs} jam ${mins} menit`;
};

const statusMeta = (status?: string, isLeave?: boolean) => {
    if (isLeave) {
        return { label: 'Cuti/Izin/Sakit', tone: 'text-indigo-700 bg-indigo-50' };
    }
    switch ((status || '').toLowerCase()) {
        case 'hadir':
            return { label: 'Hadir', tone: 'text-emerald-700 bg-emerald-50' };
        case 'terlambat':
            return { label: 'Terlambat', tone: 'text-amber-700 bg-amber-50' };
        case 'pulang_cepat':
            return { label: 'Pulang cepat', tone: 'text-orange-700 bg-orange-50' };
        case 'in_progress':
            return { label: 'Sedang bekerja', tone: 'text-blue-700 bg-blue-50' };
        case 'absent':
        case 'incomplete':
            return { label: 'Tidak lengkap', tone: 'text-rose-700 bg-rose-50' };
        default:
            return { label: 'Belum absen', tone: 'text-slate-700 bg-slate-100' };
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
            ]);

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
                    const diff = (endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60);
                    if (Number.isFinite(diff) && diff > 0) {
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
            const scheduleMap = new Map(schedulesLast3.map((s) => [s.date, s.shift]));

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
                    statusTone: meta.tone,
                    clockIn: att?.clock_in,
                    clockOut: att?.clock_out,
                });
            }
            setRecentAttendance(lastThreeDays);

            const todayKey = formatDateKey(now, APP_TIME_ZONE);
            const todayAtt = attendanceLast3Map.get(todayKey) || attendanceByDate.get(todayKey);
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

    const labelRequestStatus = (status: RequestStatus) => {
        switch (status) {
            case RequestStatus.APPROVED:
                return 'Disetujui';
            case RequestStatus.REJECTED:
                return 'Ditolak';
            case RequestStatus.REVISED:
                return 'Revisi';
            default:
                return 'Pending';
        }
    };

    const statusChip = (status: RequestStatus) => {
        const base = 'px-3 py-1 text-xs font-semibold rounded-full';
        if (status === RequestStatus.APPROVED) return `${base} bg-emerald-50 text-emerald-700`;
        if (status === RequestStatus.REJECTED) return `${base} bg-rose-50 text-rose-700`;
        if (status === RequestStatus.REVISED) return `${base} bg-amber-50 text-amber-700`;
        return `${base} bg-blue-50 text-blue-700`;
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard Saya</h1>
                    <p className="text-gray-600">Ringkasan kehadiran, disiplin, dan ajuan Anda.</p>
                </div>
                <button
                    onClick={fetchDashboard}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:bg-slate-500"
                >
                    {loading ? <Spinner /> : <RefreshIcon className="h-4 w-4" />} Segarkan
                </button>
            </div>

            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2 space-y-5">
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-sm text-gray-500">KPI bulan ini</p>
                                <h2 className="text-lg font-semibold text-gray-800">Kehadiran & Disiplin</h2>
                            </div>
                            <span className="inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                <CalendarIcon className="h-4 w-4" /> Periode {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>

                        {loading && !kpiSnapshot ? (
                            <div className="py-6 flex justify-center text-sm text-gray-500">
                                <Spinner /> <span className="ml-2">Menghitung KPI...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                                        <span>Kehadiran</span>
                                        <span className="font-mono text-gray-900">
                                            {kpiSnapshot ? kpiSnapshot.presence.toFixed(1) : '0.0'}%
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${Math.min(120, Math.max(0, kpiSnapshot?.presence || 0))}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                                        <span>Disiplin</span>
                                        <span className="font-mono text-gray-900">
                                            {kpiSnapshot ? kpiSnapshot.discipline.toFixed(1) : '0.0'}%
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500"
                                            style={{ width: `${Math.min(120, Math.max(0, kpiSnapshot?.discipline || 0))}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-700 pt-1">
                                    <div className="p-3 rounded-lg bg-slate-50 border">
                                        <p className="text-xs text-gray-500">Jam kerja tercatat</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {kpiSnapshot ? kpiSnapshot.workedHours.toFixed(1) : '0.0'} jam
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-50 border">
                                        <p className="text-xs text-gray-500">Jam lembur (disetujui)</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {kpiSnapshot ? kpiSnapshot.overtimeHours.toFixed(1) : '0.0'} jam
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-50 border">
                                        <p className="text-xs text-gray-500">Hari cuti/izin/sakit</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {kpiSnapshot ? kpiSnapshot.plannedLeaveDays : 0} hari
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-50 border">
                                        <p className="text-xs text-gray-500">Hari tidak disiplin</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {kpiSnapshot ? kpiSnapshot.unauthDays : 0} hari
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-sm text-gray-500">Resume presensi hari ini</p>
                                <h2 className="text-lg font-semibold text-gray-800">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 border rounded-lg bg-slate-50">
                                <p className="text-xs text-gray-500">Jam Masuk</p>
                                <p className="text-xl font-semibold text-gray-900">
                                    {todaySummary.clockIn ? formatTime(new Date(todaySummary.clockIn), { second: undefined }) : '-'}
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg bg-slate-50">
                                <p className="text-xs text-gray-500">Jam Pulang</p>
                                <p className="text-xl font-semibold text-gray-900">
                                    {todaySummary.clockOut
                                        ? formatTime(new Date(todaySummary.clockOut), { second: undefined })
                                        : todaySummary.clockIn
                                            ? 'Belum clock-out'
                                            : '-'}
                                </p>
                            </div>
                            <div className="p-4 border rounded-lg bg-slate-50">
                                <p className="text-xs text-gray-500">Durasi Kerja</p>
                                <p className="text-xl font-semibold text-gray-900">{formatDuration(todaySummary.durationMinutes)}</p>
                            </div>
                        </div>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium bg-slate-100 text-slate-700">
                            <ClockIcon className="h-4 w-4" />
                            {statusMeta(todaySummary.status).label}
                        </div>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-800">Status absensi 3 hari terakhir</h3>
                            <CalendarIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="space-y-3">
                            {recentAttendance.map((item) => (
                                <div key={item.dateKey} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-800">
                                            {new Date(item.dateKey).toLocaleDateString('id-ID', {
                                                weekday: 'short',
                                                day: '2-digit',
                                                month: 'short',
                                            })}
                                        </p>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.statusTone}`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Shift: {item.shift}</p>
                                    {(item.clockIn || item.clockOut) && (
                                        <p className="text-xs text-gray-600 mt-1">
                                            {item.clockIn ? formatTime(new Date(item.clockIn), { second: undefined }) : '-'} &mdash;{' '}
                                            {item.clockOut ? formatTime(new Date(item.clockOut), { second: undefined }) : '-'}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-800">Status ajuan ke atasan</h3>
                            <DocumentAddIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        {recentRequests.length === 0 && !loading ? (
                            <p className="text-sm text-gray-500">Belum ada ajuan terbaru.</p>
                        ) : (
                            <div className="space-y-3">
                                {recentRequests.map((req) => (
                                    <div key={req.id} className="p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircleIcon className="h-4 w-4 text-slate-500" />
                                                <p className="text-sm font-semibold text-gray-800">{req.request_type}</p>
                                            </div>
                                            <span className={statusChip(req.status)}>{labelRequestStatus(req.status)}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(req.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}{' '}
                                            - {new Date(req.end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Diajukan {new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardBawahanPage;
