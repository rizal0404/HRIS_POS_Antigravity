"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfile } from '../../../types';
import PresensiBawahan from '../../../components/laporan/PresensiBawahan';
import RekapLembur from '../../../components/laporan/RekapLembur';
import MonitoringLembur from '../../../components/laporan/MonitoringLembur';
import QuotaCuti from '../../../components/laporan/QuotaCuti';
import MonitoringPresensi from '../../../components/laporan/MonitoringPresensi';
import { apiService } from '../../../services/apiService';
import { getAllSubordinates, formatDateKey } from '../../../lib/utils';
import Spinner from '../../../components/ui/Spinner';
import { KPI_DEFAULT_CONFIG, computeKpiScore } from '@/components/kpi/KpiCalculator';

interface LaporanTimPageProps {
  user: UserProfile;
}

type Tab = 'presensi' | 'rekap_lembur' | 'monitoring_lembur' | 'quota_cuti' | 'monitoring_presensi' | 'kpi';

const tabConfig: { id: Tab; label: string }[] = [
    { id: 'monitoring_presensi', label: 'Monitoring Presensi & Lembur' },
    { id: 'presensi', label: 'Presensi Bawahan' },    
    { id: 'rekap_lembur', label: 'Rekap Data Lembur' },
    { id: 'monitoring_lembur', label: 'Monitoring Quota Lembur' },
    { id: 'quota_cuti', label: 'Quota Cuti Bawahan' },
    { id: 'kpi', label: 'Laporan KPI' },
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

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Laporan KPI Kehadiran & Disiplin</h3>
                    <p className="text-sm text-gray-500">Periode bulan ini (MTD)</p>
                </div>
                <button
                    type="button"
                    onClick={fetchKpi}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                >
                    Segarkan data
                </button>
            </div>

            {error && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>}

            {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-600">
                    <Spinner />
                    <span className="ml-2 text-sm">Menghitung KPI bawahan...</span>
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-gray-500">
                    Belum ada bawahan atau data KPI untuk periode ini.
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-lg border bg-slate-50 p-4">
                            <p className="text-xs text-gray-500">Rata-rata Kehadiran</p>
                            <p className="text-2xl font-semibold text-gray-900">{summary.avgPresence.toFixed(1)}%</p>
                        </div>
                        <div className="rounded-lg border bg-slate-50 p-4">
                            <p className="text-xs text-gray-500">Rata-rata Disiplin</p>
                            <p className="text-2xl font-semibold text-gray-900">{summary.avgDiscipline.toFixed(1)}%</p>
                        </div>
                        <div className="rounded-lg border bg-slate-50 p-4">
                            <p className="text-xs text-gray-500">Jumlah Bawahan</p>
                            <p className="text-2xl font-semibold text-gray-900">{rows.length}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border bg-white">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        #
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Pegawai
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Kehadiran
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Disiplin
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Skor Akhir
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Jam Kerja (aktual)
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Alpa/TA
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Cuti/Izin
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {rows.map((item, idx) => (
                                    <tr key={item.profile.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-600">#{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-semibold text-gray-900">{item.profile.full_name}</p>
                                            <p className="text-xs text-gray-500">{item.profile.position || '-'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatPercent(item.presence)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatPercent(item.discipline)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatPercent(item.final)}</td>
                                        <td className="px-4 py-3 text-right text-sm text-gray-700">{item.workedHours.toFixed(1)} jam</td>
                                        <td className="px-4 py-3 text-right text-sm text-gray-700">{item.unauthDays}</td>
                                        <td className="px-4 py-3 text-right text-sm text-gray-700">{item.plannedLeaveDays}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-lg border border-dashed border-gray-300 bg-slate-50 p-4 text-sm text-gray-700">
                        <p className="font-semibold text-gray-900">Keterangan perhitungan KPI</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                            <li>Kehadiran: jam kerja aktual dibanding jam rencana periode (JSP - jam cuti resmi), dibatasi plafon 100%. Contoh: JR 160 jam, jam aktual 150 jam ⇒ 150/160 = 93,8%.</li>
                            <li>Disiplin: penalti proporsional atas alpa/tidak hadir tanpa izin dibanding toleransi, nilai turun hingga batas minimum. Contoh: toleransi 2 hari, alpa 1 hari ⇒ penalti 15%, disiplin 85%.</li>
                            <li>Skor akhir: bobot default kehadiran 30%, produktivitas 50% (jika ada target/output), disiplin 20%. Contoh: 94% kehadiran, 0% produktivitas, 85% disiplin ⇒ skor akhir 0.3*94 + 0.5*0 + 0.2*85 = 54,7%.</li>
                            <li>Periode MTD: data dihitung sejak awal bulan sampai hari berjalan, termasuk data lembur/pembetulan terbaru. Contoh: 1–15 setiap bulan.</li>
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

const LaporanTimPage: React.FC<LaporanTimPageProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<Tab>('presensi');

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
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-red-700 text-white p-3">
                <h2 className="text-xl font-bold">Laporan Tim</h2>
            </div>

            <div className="flex-shrink-0 border-b border-gray-200 bg-white">
                <nav className="-mb-px flex space-x-6 px-6 overflow-x-auto" aria-label="Tabs">
                    {tabConfig.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-red-500 text-red-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                {renderContent()}
            </div>
        </div>
    );
};

export default LaporanTimPage;
