"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, Request, RequestType, RequestStatus, Attendance } from '../../../types';
import { apiService } from '../../../services/apiService';
import { ClockIcon, DocumentAddIcon, CheckCircleIcon } from '../../../components/icons';
import { getAllSubordinates, formatDateKey } from '../../../lib/utils';
import Spinner from '../../../components/ui/Spinner';
import { KPI_DEFAULT_CONFIG, computeKpiScore } from '@/components/kpi/KpiCalculator';

interface DashboardPageProps {
  user: UserProfile;
  onNavigate: (path: string) => void;
}

const StatCard: React.FC<{ title: string; count: number; icon: React.ReactNode; color: string; onClick: () => void; }> = ({ title, count, icon, color, onClick }) => (
    <button
        onClick={onClick}
        className="w-full text-left bg-white rounded-lg shadow-md p-5 flex items-center space-x-4 transition-transform hover:scale-105"
    >
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{count}</p>
        </div>
    </button>
);

const AtasanDashboardPage: React.FC<DashboardPageProps> = ({ user, onNavigate }) => {
    const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
    const [subordinateKpis, setSubordinateKpis] = useState<
        { profile: UserProfile; presence: number; discipline: number; final: number }[]
    >([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const users = await apiService.getProfiles();
            const subordinates = getAllSubordinates(user.id, users);
            const subIds = subordinates.map((s) => s.id);

            if (subIds.length > 0) {
                const today = new Date();
                const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endMonth = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

                const startIso = startMonth.toISOString();
                const endIso = endMonth.toISOString();
                const startDateStr = formatDateKey(startMonth);
                const endDateStr = formatDateKey(endMonth);

                const [allSubordinateRequests, attendanceMonth, leaves] = await Promise.all([
                    apiService.getSubordinateRequests(subIds),
                    apiService.getAttendanceForSubordinates(subIds, startIso, endIso),
                    apiService.getOtherApprovedRequestsForPeriod(subIds, startDateStr, endDateStr),
                ]);

                setPendingRequests(allSubordinateRequests.filter((r) => r.status === RequestStatus.PENDING));

                // Prepare leave days per profile
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

                // Attendance map per profile-date (keep latest clock_in)
                const attendanceByProfile = new Map<string, Map<string, Attendance>>();
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

                const kpiResults = subordinates.map((sub) => {
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
                    };
                });

                setSubordinateKpis(kpiResults);
            } else {
                setPendingRequests([]);
                setSubordinateKpis([]);
            }
        } catch(e) {
            console.error("Failed to load dashboard data:", e);
        } finally {
            setLoading(false);
        }
    }, [user.id]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const summary = useMemo(() => ({
        cuti: pendingRequests.filter(r => r.request_type === RequestType.CUTI).length,
        lembur: pendingRequests.filter(r => r.request_type === RequestType.LEMBUR).length,
        sakit: pendingRequests.filter(r => r.request_type === RequestType.SAKIT).length,
        izin: pendingRequests.filter(r => r.request_type === RequestType.IZIN).length,
        koreksi: pendingRequests.filter(r => r.request_type === RequestType.KOREKSI).length,
    }), [pendingRequests]);

    const kpiSummary = useMemo(() => {
        if (subordinateKpis.length === 0) {
            return { avgPresence: 0, avgDiscipline: 0 };
        }
        const totalPresence = subordinateKpis.reduce((sum, item) => sum + item.presence, 0);
        const totalDiscipline = subordinateKpis.reduce((sum, item) => sum + item.discipline, 0);
        return {
            avgPresence: totalPresence / subordinateKpis.length,
            avgDiscipline: totalDiscipline / subordinateKpis.length,
        };
    }, [subordinateKpis]);

    const leastDiscipline = useMemo(
        () => subordinateKpis.slice().sort((a, b) => a.discipline - b.discipline).slice(0, 3),
        [subordinateKpis],
    );

    const topFinalKpi = useMemo(
        () => subordinateKpis.slice().sort((a, b) => b.final - a.final).slice(0, 5),
        [subordinateKpis],
    );

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-full">
                <Spinner /> <span className="ml-2">Memuat dashboard...</span>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Dashboard Tim</h2>
                <p className="text-gray-600">Selamat datang, {user.full_name}. Berikut ringkasan tim Anda.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                <StatCard title="Ajuan Cuti" count={summary.cuti} icon={<DocumentAddIcon className="h-6 w-6 text-purple-600" />} color="bg-purple-100" onClick={() => onNavigate('/persetujuan')} />
                <StatCard title="Ajuan Lembur" count={summary.lembur} icon={<ClockIcon className="h-6 w-6 text-orange-600" />} color="bg-orange-100" onClick={() => onNavigate('/persetujuan')} />
                <StatCard title="Ajuan Sakit" count={summary.sakit} icon={<DocumentAddIcon className="h-6 w-6 text-red-600" />} color="bg-red-100" onClick={() => onNavigate('/persetujuan')} />
                <StatCard title="Ajuan Izin" count={summary.izin} icon={<DocumentAddIcon className="h-6 w-6 text-yellow-600" />} color="bg-yellow-100" onClick={() => onNavigate('/persetujuan')} />
                <StatCard title="Ajuan Koreksi" count={summary.koreksi} icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />} color="bg-green-100" onClick={() => onNavigate('/persetujuan')} />
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">KPI Kehadiran & Disiplin Bawahan</h3>
                        <p className="text-sm text-gray-500">Periode bulan ini (MTD)</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <ClockIcon className="h-4 w-4" /> Update otomatis
                    </div>
                </div>
                {subordinateKpis.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">Belum ada data bawahan untuk dihitung.</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                            <div className="p-4 rounded-lg border bg-slate-50">
                                <p className="text-xs text-gray-500">Rata-rata Kehadiran</p>
                                <p className="text-2xl font-semibold text-gray-900">{kpiSummary.avgPresence.toFixed(1)}%</p>
                            </div>
                            <div className="p-4 rounded-lg border bg-slate-50">
                                <p className="text-xs text-gray-500">Rata-rata Disiplin</p>
                                <p className="text-2xl font-semibold text-gray-900">{kpiSummary.avgDiscipline.toFixed(1)}%</p>
                            </div>
                            <div className="p-4 rounded-lg border bg-slate-50">
                                <p className="text-xs text-gray-500">Total Bawahan</p>
                                <p className="text-2xl font-semibold text-gray-900">{subordinateKpis.length}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="p-4 rounded-lg border bg-slate-50">
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Top 5 Kurang Disiplin</h4>
                                <div className="space-y-3">
                                    {leastDiscipline.map((item, idx) => (
                                        <div key={item.profile.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    #{idx + 1} {item.profile.full_name}
                                                </p>
                                                <p className="text-xs text-gray-500">Disiplin: {item.discipline.toFixed(1)}%</p>
                                            </div>
                                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                                                Kehadiran {item.presence.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 rounded-lg border bg-slate-50">
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Top 5 Skor KPI Tertinggi</h4>
                                <div className="space-y-3">
                                    {topFinalKpi.map((item, idx) => (
                                        <div key={item.profile.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    #{idx + 1} {item.profile.full_name}
                                                </p>
                                                <p className="text-xs text-gray-500">Skor akhir: {item.final.toFixed(1)}%</p>
                                            </div>
                                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                                                Disiplin {item.discipline.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AtasanDashboardPage;
