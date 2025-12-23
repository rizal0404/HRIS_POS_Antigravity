"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfile } from '../../../types';
import PresensiBawahan from '../../../components/laporan/PresensiBawahan';
import RekapLembur from '../../../components/laporan/RekapLembur';
import MonitoringLembur from '../../../components/laporan/MonitoringLembur';
import QuotaCuti from '../../../components/laporan/QuotaCuti';
import MonitoringPresensi from '../../../components/laporan/MonitoringPresensi';
import { apiService } from '../../../services/apiService';
import { disciplineService } from '../../../services/discipline';
import { getAllSubordinates, formatDateKey } from '../../../lib/utils';
import Spinner from '../../../components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { RefreshIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { KPI_DEFAULT_CONFIG, computeKpiScore } from '@/components/kpi/KpiCalculator';
import { DisciplineScore } from '../../../types/discipline';

interface LaporanTimPageProps {
    user: UserProfile;
}

type Tab = 'presensi' | 'rekap_lembur' | 'monitoring_lembur' | 'quota_cuti' | 'monitoring_presensi' | 'kpi' | 'disiplin';

const tabConfig: { id: Tab; label: string; icon: string }[] = [
    { id: 'monitoring_presensi', label: 'Monitoring', icon: 'monitoring' },
    { id: 'presensi', label: 'Presensi', icon: 'schedule' },
    { id: 'rekap_lembur', label: 'Rekap Lembur', icon: 'timer' },
    { id: 'monitoring_lembur', label: 'Quota Lembur', icon: 'hourglass_top' },
    { id: 'quota_cuti', label: 'Quota Cuti', icon: 'event_available' },
    { id: 'kpi', label: 'KPI', icon: 'insights' },
    { id: 'disiplin', label: 'Disiplin', icon: 'verified_user' },
];

type KpiRow = {
    profile: UserProfile;
    presence: number;
    discipline: number;
    final: number;
    workedHours: number;
    unauthDays: number;
    plannedLeaveDays: number;
};

const LaporanKpi: React.FC<{ user: UserProfile }> = ({ user }) => {
    const [rows, setRows] = useState<KpiRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const target = useMemo(() => ({
        presence: 95,
        discipline: 90,
        final: 85,
    }), []);

    const fetchKpi = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const users = await apiService.getProfiles();
            const subordinates = getAllSubordinates(user.id, users);
            const subIds = subordinates.map((s) => s.id);

            if (subIds.length === 0) {
                setRows([]);
                return;
            }

            const today = new Date();
            const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endMonth = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

            const startIso = startMonth.toISOString();
            const endIso = endMonth.toISOString();
            const startDateStr = formatDateKey(startMonth);
            const endDateStr = formatDateKey(endMonth);

            const [attendanceMonth, leaves] = await Promise.all([
                apiService.getAttendanceForSubordinates(subIds, startIso, endIso),
                apiService.getOtherApprovedRequestsForPeriod(subIds, startDateStr, endDateStr),
            ]);

            const leaveByProfile = new Map<string, Set<string>>();
            leaves.forEach((req) => {
                const start = new Date(req.start_date);
                const end = new Date(req.end_date);
                const cappedEnd = end > endMonth ? endMonth : end;
                for (let d = new Date(start); d <= cappedEnd; d.setDate(d.getDate() + 1)) {
                    const key = formatDateKey(d);
                    if (key >= startDateStr && key <= endDateStr) {
                        if (!leaveByProfile.has(req.profile_id)) leaveByProfile.set(req.profile_id, new Set());
                        leaveByProfile.get(req.profile_id)!.add(key);
                    }
                }
            });

            const attendanceByProfile = new Map<string, Map<string, typeof attendanceMonth[number]>>();
            attendanceMonth.forEach((att) => {
                const dateKey = formatDateKey(new Date(att.clock_in));
                if (!attendanceByProfile.has(att.profile_id)) attendanceByProfile.set(att.profile_id, new Map());
                const existing = attendanceByProfile.get(att.profile_id)!.get(dateKey);
                if (!existing || new Date(att.clock_in).getTime() > new Date(existing.clock_in).getTime()) {
                    attendanceByProfile.get(att.profile_id)!.set(dateKey, att);
                }
            });

            const dayKeys: string[] = [];
            for (let d = new Date(startMonth); d <= endMonth; d.setDate(d.getDate() + 1)) {
                dayKeys.push(formatDateKey(d));
            }

            const kpiRows = subordinates.map((sub) => {
                const attMap = attendanceByProfile.get(sub.id) || new Map();
                const leaveSet = leaveByProfile.get(sub.id) || new Set();
                let workedHours = 0;
                let unauthDays = 0;

                dayKeys.forEach((key) => {
                    const att = attMap.get(key);
                    if (att && att.clock_in && att.clock_out) {
                        const diff =
                            (new Date(att.clock_out).getTime() - new Date(att.clock_in).getTime()) / (1000 * 60 * 60);
                        if (Number.isFinite(diff) && diff > 0) workedHours += diff;
                    }
                    if (att) {
                        if (att.status && att.status.toLowerCase() !== 'hadir') {
                            unauthDays += 1;
                        }
                    } else if (!leaveSet.has(key)) {
                        unauthDays += 1;
                    }
                });

                const plannedLeaveDays = leaveSet.size;
                const category = (sub.default_shift || '').toLowerCase().includes('shift') ? 'SHIFT' : 'DAYSHIFT';
                const kpi = computeKpiScore(
                    {
                        category,
                        period: 'MONTHLY',
                        plannedLeaveDays,
                        actualWorkingHours: Number(workedHours.toFixed(2)),
                        outputTarget: 0,
                        outputActual: 0,
                        unauthorisedAbsenceDays: unauthDays,
                    },
                    KPI_DEFAULT_CONFIG,
                );

                return {
                    profile: sub,
                    presence: kpi.kpi1Presence,
                    discipline: kpi.kpi3Discipline,
                    final: kpi.finalScore,
                    workedHours: Number(workedHours.toFixed(1)),
                    unauthDays,
                    plannedLeaveDays,
                };
            });

            kpiRows.sort((a, b) => b.final - a.final);
            setRows(kpiRows);
        } catch (err) {
            console.error('Failed to load KPI report', err);
            setError('Gagal memuat laporan KPI. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchKpi();
    }, [fetchKpi]);

    const summary = useMemo(() => {
        if (rows.length === 0) return { avgPresence: 0, avgDiscipline: 0 };
        const totalPresence = rows.reduce((sum, item) => sum + item.presence, 0);
        const totalDiscipline = rows.reduce((sum, item) => sum + item.discipline, 0);
        return {
            avgPresence: totalPresence / rows.length,
            avgDiscipline: totalDiscipline / rows.length,
        };
    }, [rows]);

    const formatPercent = (value: number) => `${value.toFixed(1)}%`;
    const toneClass = (value: number, goal: number) => {
        if (!Number.isFinite(value)) return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
        if (value >= goal + 5) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
        if (value >= goal) return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300';
        if (value >= goal - 10) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
        return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Laporan KPI Kehadiran & Disiplin</h3>
                    <p className="text-sm text-slate-500">Periode bulan ini (MTD)</p>
                </div>
                <button
                    type="button"
                    onClick={fetchKpi}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors"
                >
                    <RefreshIcon className="w-4 h-4" />
                    Segarkan
                </button>
            </div>

            {error && <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Spinner />
                    <span className="ml-2 text-sm text-slate-500">Menghitung KPI bawahan...</span>
                </div>
            ) : rows.length === 0 ? (
                <Card className="p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">trending_up</span>
                    <p className="text-slate-500 dark:text-slate-400">Belum ada data KPI untuk periode ini.</p>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Rata-rata Kehadiran</p>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{summary.avgPresence.toFixed(1)}%</span>
                                </div>
                                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Rata-rata Disiplin</p>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{summary.avgDiscipline.toFixed(1)}%</span>
                                </div>
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-blue-500 text-[20px]">verified_user</span>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Jumlah Bawahan</p>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{rows.length}</span>
                                </div>
                                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                                    <span className="material-symbols-outlined text-slate-500 text-[20px]">group</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Target:</span>
                        <Badge variant="success">Kehadiran ≥ {target.presence}%</Badge>
                        <Badge variant="success">Disiplin ≥ {target.discipline}%</Badge>
                        <Badge variant="success">Skor ≥ {target.final}%</Badge>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">#</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Pegawai</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-right">Kehadiran</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-right">Disiplin</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-right">Skor</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-right">Jam Kerja</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-right">Alpa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {rows.map((item, idx) => (
                                        <tr key={item.profile.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 text-slate-500">#{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">{item.profile.full_name.charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white text-xs">{item.profile.full_name}</p>
                                                        <p className="text-[10px] text-slate-400">{item.profile.position || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${toneClass(item.presence, target.presence)}`}>
                                                    {formatPercent(item.presence)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${toneClass(item.discipline, target.discipline)}`}>
                                                    {formatPercent(item.discipline)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${toneClass(item.final, target.final)}`}>
                                                    {formatPercent(item.final)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{item.workedHours.toFixed(1)} jam</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={item.unauthDays > 0 ? 'text-red-500 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
                                                    {item.unauthDays}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

// ===== LAPORAN DISIPLIN COMPONENT =====
type DisiplinRow = DisciplineScore & { profile_name?: string };

const LaporanDisiplin: React.FC<{ user: UserProfile }> = ({ user }) => {
    const [rows, setRows] = useState<DisiplinRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await disciplineService.getSubordinatesDisciplineScores(user.id, month, year);
            setRows(data);
        } catch (err) {
            console.error('Failed to load discipline scores', err);
            setError('Gagal memuat skor disiplin.');
        } finally {
            setLoading(false);
        }
    }, [user.id, month, year]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const summary = useMemo(() => {
        if (rows.length === 0) return { avgScore: 0, totalLate: 0, totalEarly: 0, totalWrongLoc: 0, totalCorrection: 0 };
        const totalScore = rows.reduce((sum, r) => sum + (r.final_score || 0), 0);
        const totalLate = rows.reduce((sum, r) => sum + (r.late_count || 0), 0);
        const totalEarly = rows.reduce((sum, r) => sum + (r.early_leave_count || 0), 0);
        const totalWrongLoc = rows.reduce((sum, r) => sum + (r.wrong_location_count || 0), 0);
        const totalCorrection = rows.reduce((sum, r) => sum + (r.correction_count || 0), 0);
        return { avgScore: totalScore / rows.length, totalLate, totalEarly, totalWrongLoc, totalCorrection };
    }, [rows]);

    const scoreClass = (score: number) => {
        if (score >= 90) return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
        if (score >= 70) return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
        return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400';
    };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Skor Disiplin Bawahan</h3>
                    <p className="text-sm text-slate-500">Periode: {months[month - 1]} {year}</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                        {months.map((m, idx) => (
                            <option key={idx} value={idx + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                        {[2024, 2025, 2026].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors"
                    >
                        <RefreshIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {error && <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Spinner />
                    <span className="ml-2 text-sm text-slate-500">Memuat skor disiplin...</span>
                </div>
            ) : rows.length === 0 ? (
                <Card className="p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">verified_user</span>
                    <p className="text-slate-500 dark:text-slate-400">Belum ada data skor disiplin.</p>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <Card className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Rata-rata Skor</p>
                                    <span className={`text-2xl font-black ${summary.avgScore >= 90 ? 'text-emerald-600' : summary.avgScore >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                        {summary.avgScore.toFixed(1)}
                                    </span>
                                </div>
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-blue-500 text-[20px]">analytics</span>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Terlambat</p>
                                    <span className="text-2xl font-black text-orange-600">{summary.totalLate}x</span>
                                </div>
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-orange-500 text-[20px]">schedule</span>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Pulang Cepat</p>
                                    <span className="text-2xl font-black text-red-600">{summary.totalEarly}x</span>
                                </div>
                                <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-red-500 text-[20px]">logout</span>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Lokasi Salah</p>
                                    <span className="text-2xl font-black text-purple-600">{summary.totalWrongLoc}x</span>
                                </div>
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-purple-500 text-[20px]">wrong_location</span>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Koreksi Absen</p>
                                    <span className="text-2xl font-black text-amber-600">{summary.totalCorrection}x</span>
                                </div>
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-amber-500 text-[20px]">edit_note</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">#</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Pegawai</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-center">Skor</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-center">Terlambat</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-center">Pulang Cepat</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-center">Lokasi Salah</th>
                                        <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-center">Koreksi Absen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {rows.map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 text-slate-500">#{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-slate-900 dark:text-white text-xs">{item.profile_name || '-'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex rounded-lg px-3 py-1 text-sm font-bold ${scoreClass(item.final_score || 0)}`}>
                                                    {item.final_score}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-center text-sm ${(item.late_count || 0) > 0 ? 'text-red-500 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {item.late_count || 0}x
                                            </td>
                                            <td className={`px-4 py-3 text-center text-sm ${(item.early_leave_count || 0) > 0 ? 'text-red-500 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {item.early_leave_count || 0}x
                                            </td>
                                            <td className={`px-4 py-3 text-center text-sm ${(item.wrong_location_count || 0) > 0 ? 'text-red-500 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {item.wrong_location_count || 0}x
                                            </td>
                                            <td className={`px-4 py-3 text-center text-sm ${(item.correction_count || 0) > 0 ? 'text-amber-500 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {item.correction_count || 0}x
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

const LaporanTimPage: React.FC<LaporanTimPageProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<Tab>('monitoring_presensi');

    const renderContent = () => {
        switch (activeTab) {
            case 'presensi':
                return <PresensiBawahan user={user} />;
            case 'rekap_lembur':
                return <RekapLembur user={user} />;
            case 'monitoring_lembur':
                return <MonitoringLembur user={user} />;
            case 'quota_cuti':
                return <QuotaCuti user={user} />;
            case 'monitoring_presensi':
                return <MonitoringPresensi user={user} />;
            case 'kpi':
                return <LaporanKpi user={user} />;
            case 'disiplin':
                return <LaporanDisiplin user={user} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header Section */}
            <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 shrink-0">
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Laporan Tim</h2>
                    <p className="text-xs text-slate-500">Analisis dan monitoring performa tim Anda</p>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8">
                <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-thin" aria-label="Tabs">
                    {tabConfig.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                                ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <div className="max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default LaporanTimPage;
