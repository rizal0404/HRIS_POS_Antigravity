"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, UserRole, Attendance } from '@/types';
import { CalculatorIcon, SaveIcon, RefreshIcon, LockClosedIcon, InformationCircleIcon } from '@/components/icons';
import Spinner from '@/components/ui/Spinner';
import { apiService } from '@/services/apiService';

type ShiftCategory = 'DAYSHIFT' | 'SHIFT';
type Period = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface KpiConfig {
    jamPerHari: Record<ShiftCategory, number>;
    jspPerPeriod: Record<Period, number>;
    weights: {
        presence: number;
        productivity: number;
        discipline: number;
    };
    toleranceUnauthorisedDays: number;
    presenceCap: number;
    productivityCap: number;
}

interface KpiInput {
    category: ShiftCategory;
    period: Period;
    plannedLeaveDays: number;
    actualWorkingHours: number;
    outputTarget: number;
    outputActual: number;
    unauthorisedAbsenceDays: number;
}

interface KpiResult {
    jamPerHari: number;
    jsp: number;
    jcr: number;
    jr: number;
    kpi1Presence: number;
    kpi2Productivity: number;
    kpi3Discipline: number;
    finalScore: number;
}

const STORAGE_KEY = 'kpi-config-v1';

const DEFAULT_CONFIG: KpiConfig = {
    jamPerHari: {
        DAYSHIFT: 7, // Non-shift/day shift
        SHIFT: 7.5, // Shift 1/2/3
    },
    jspPerPeriod: {
        WEEKLY: 45,
        MONTHLY: 196,
        YEARLY: 2349,
    },
    weights: {
        presence: 0.3,
        productivity: 0.5,
        discipline: 0.2,
    },
    toleranceUnauthorisedDays: 2,
    presenceCap: 100,
    productivityCap: 120,
};

const safeNumber = (value: number): number => (Number.isFinite(value) ? value : 0);

const normalizeConfig = (raw: Partial<KpiConfig> | null | undefined): KpiConfig => {
    if (!raw) return DEFAULT_CONFIG;
    return {
        jamPerHari: {
            DAYSHIFT: safeNumber(raw?.jamPerHari?.DAYSHIFT ?? DEFAULT_CONFIG.jamPerHari.DAYSHIFT),
            SHIFT: safeNumber(raw?.jamPerHari?.SHIFT ?? DEFAULT_CONFIG.jamPerHari.SHIFT),
        },
        jspPerPeriod: {
            WEEKLY: safeNumber(raw?.jspPerPeriod?.WEEKLY ?? DEFAULT_CONFIG.jspPerPeriod.WEEKLY),
            MONTHLY: safeNumber(raw?.jspPerPeriod?.MONTHLY ?? DEFAULT_CONFIG.jspPerPeriod.MONTHLY),
            YEARLY: safeNumber(raw?.jspPerPeriod?.YEARLY ?? DEFAULT_CONFIG.jspPerPeriod.YEARLY),
        },
        weights: {
            presence: safeNumber(raw?.weights?.presence ?? DEFAULT_CONFIG.weights.presence),
            productivity: safeNumber(raw?.weights?.productivity ?? DEFAULT_CONFIG.weights.productivity),
            discipline: safeNumber(raw?.weights?.discipline ?? DEFAULT_CONFIG.weights.discipline),
        },
        toleranceUnauthorisedDays: safeNumber(raw?.toleranceUnauthorisedDays ?? DEFAULT_CONFIG.toleranceUnauthorisedDays),
        presenceCap: safeNumber(raw?.presenceCap ?? DEFAULT_CONFIG.presenceCap),
        productivityCap: safeNumber(raw?.productivityCap ?? DEFAULT_CONFIG.productivityCap),
    };
};

const calculateKpi = (input: KpiInput, config: KpiConfig): KpiResult => {
    const jamPerHari = config.jamPerHari[input.category] ?? 0;
    const jsp = config.jspPerPeriod[input.period] ?? 0;

    const jcr = Math.max(0, safeNumber(input.plannedLeaveDays)) * jamPerHari;
    const jr = Math.max(jsp - jcr, 0);

    let kpi1Presence = 0;
    if (jr > 0 && input.actualWorkingHours > 0) {
        kpi1Presence = Math.min((input.actualWorkingHours / jr) * 100, config.presenceCap);
    }

    let kpi2Productivity = 0;
    if (input.outputTarget > 0 && input.outputActual >= 0) {
        kpi2Productivity = Math.min((input.outputActual / input.outputTarget) * 100, config.productivityCap);
    }

    const jats = Math.max(0, safeNumber(input.unauthorisedAbsenceDays)) * jamPerHari;
    const toleranceHours = Math.max(0, config.toleranceUnauthorisedDays) * jamPerHari;

    let kpi3Discipline = 100;
    if (jats <= 0) {
        kpi3Discipline = 100;
    } else if (toleranceHours <= 0 || jats >= toleranceHours) {
        kpi3Discipline = 70;
    } else {
        const penalty = (jats / toleranceHours) * 30;
        kpi3Discipline = 100 - penalty;
    }

    const finalScore =
        kpi1Presence * config.weights.presence +
        kpi2Productivity * config.weights.productivity +
        kpi3Discipline * config.weights.discipline;

    return {
        jamPerHari,
        jsp,
        jcr,
        jr,
        kpi1Presence,
        kpi2Productivity,
        kpi3Discipline,
        finalScore,
    };
};

interface KpiCalculatorProps {
    user: UserProfile;
}

const formatPercent = (value: number, decimals = 1) =>
    Number.isFinite(value)
        ? value.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : '0';

const formatNumber = (value: number, decimals = 2) =>
    Number.isFinite(value)
        ? value.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : '0';

const KpiCalculator: React.FC<KpiCalculatorProps> = ({ user }) => {
    const isPrivileged = user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;
    const [config, setConfig] = useState<KpiConfig>(DEFAULT_CONFIG);
    const [configDraft, setConfigDraft] = useState<KpiConfig>(DEFAULT_CONFIG);
    const [configMessage, setConfigMessage] = useState<string | null>(null);

    const [period, setPeriod] = useState<Period>('MONTHLY');

    const [inputSim, setInputSim] = useState<KpiInput>({
        category: 'DAYSHIFT',
        period,
        plannedLeaveDays: 0,
        actualWorkingHours: 0,
        outputTarget: 0,
        outputActual: 0,
        unauthorisedAbsenceDays: 0,
    });

    const [inputReal, setInputReal] = useState<KpiInput>({
        category: (user.default_shift || '').toLowerCase().includes('shift') ? 'SHIFT' : 'DAYSHIFT',
        period,
        plannedLeaveDays: 0,
        actualWorkingHours: 0,
        outputTarget: 0,
        outputActual: 0,
        unauthorisedAbsenceDays: 0,
    });
    const [loadingReal, setLoadingReal] = useState(false);
    const [errorReal, setErrorReal] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<KpiConfig>;
                const normalized = normalizeConfig(parsed);
                setConfig(normalized);
                setConfigDraft(normalized);
            }
        } catch (err) {
            console.warn('Gagal memuat konfigurasi KPI dari penyimpanan lokal.', err);
        }
    }, []);

    useEffect(() => {
        setInputSim((prev) => ({ ...prev, period }));
        setInputReal((prev) => ({ ...prev, period }));
    }, [period]);

    const kpiResultSim = useMemo(() => calculateKpi(inputSim, config), [inputSim, config]);
    const kpiResultReal = useMemo(() => calculateKpi(inputReal, config), [inputReal, config]);

    const totalWeight = useMemo(
        () => configDraft.weights.presence + configDraft.weights.productivity + configDraft.weights.discipline,
        [configDraft.weights],
    );

    const handleConfigChange = (path: keyof KpiConfig | string, value: number) => {
        setConfigDraft((prev) => {
            const next = { ...prev };
            if (path === 'jamPerHari.DAYSHIFT') next.jamPerHari = { ...prev.jamPerHari, DAYSHIFT: value };
            else if (path === 'jamPerHari.SHIFT') next.jamPerHari = { ...prev.jamPerHari, SHIFT: value };
            else if (path === 'jspPerPeriod.WEEKLY') next.jspPerPeriod = { ...prev.jspPerPeriod, WEEKLY: value };
            else if (path === 'jspPerPeriod.MONTHLY') next.jspPerPeriod = { ...prev.jspPerPeriod, MONTHLY: value };
            else if (path === 'jspPerPeriod.YEARLY') next.jspPerPeriod = { ...prev.jspPerPeriod, YEARLY: value };
            else if (path === 'weights.presence') next.weights = { ...prev.weights, presence: value };
            else if (path === 'weights.productivity') next.weights = { ...prev.weights, productivity: value };
            else if (path === 'weights.discipline') next.weights = { ...prev.weights, discipline: value };
            else if (path === 'toleranceUnauthorisedDays') next.toleranceUnauthorisedDays = value;
            else if (path === 'presenceCap') next.presenceCap = value;
            else if (path === 'productivityCap') next.productivityCap = value;
            return next;
        });
    };

    const handleSaveConfig = () => {
        const normalized = normalizeConfig(configDraft);
        setConfig(normalized);
        setConfigDraft(normalized);
        setConfigMessage('Konfigurasi KPI disimpan (lokal).');
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        }
        setTimeout(() => setConfigMessage(null), 3000);
    };

    const handleResetConfig = () => {
        setConfig(DEFAULT_CONFIG);
        setConfigDraft(DEFAULT_CONFIG);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
        }
        setConfigMessage('Parameter dikembalikan ke standar.');
        setTimeout(() => setConfigMessage(null), 2500);
    };

    const handleInputChangeSim = (field: keyof KpiInput, value: number | ShiftCategory | Period) => {
        setInputSim((prev) => ({ ...prev, [field]: value }));
    };

    const handleInputChangeReal = (field: keyof KpiInput, value: number | ShiftCategory | Period) => {
        setInputReal((prev) => ({ ...prev, [field]: value }));
    };

    const getRangeForPeriod = (current: Date, p: Period) => {
        if (p === 'WEEKLY') {
            const end = new Date(current);
            end.setHours(23, 59, 59, 999);
            const start = new Date(current);
            start.setDate(current.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            return { start, end };
        }
        if (p === 'YEARLY') {
            const start = new Date(current.getFullYear(), 0, 1, 0, 0, 0, 0);
            const end = new Date(current.getFullYear(), 11, 31, 23, 59, 59, 999);
            return { start, end };
        }
        const start = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    };

    const handleFetchRealisation = async () => {
        setLoadingReal(true);
        setErrorReal(null);
        try {
            const now = new Date();
            const { start, end } = getRangeForPeriod(now, period);
            const startIso = start.toISOString();
            const endIso = end.toISOString();
            const startDateStr = startIso.slice(0, 10);
            const endDateStr = endIso.slice(0, 10);

            const [attendance, leaves] = await Promise.all([
                apiService.getAttendanceForSubordinates([user.id], startIso, endIso),
                apiService.getOtherApprovedRequestsForPeriod([user.id], startDateStr, endDateStr),
            ]);

            const leaveDays = new Set<string>();
            leaves.forEach((req) => {
                const startReq = new Date(req.start_date);
                const endReq = new Date(req.end_date);
                for (let d = new Date(startReq); d <= endReq; d.setDate(d.getDate() + 1)) {
                    const ds = d.toISOString().slice(0, 10);
                    if (ds >= startDateStr && ds <= endDateStr) {
                        leaveDays.add(ds);
                    }
                }
            });

            const allDays = new Set<string>();
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                allDays.add(d.toISOString().slice(0, 10));
            }

            const attendanceByDate = new Map<string, Attendance>();
            attendance.forEach((att) => {
                const ds = new Date(att.clock_in).toISOString().slice(0, 10);
                attendanceByDate.set(ds, att);
            });

            let workedHours = 0;
            let unauthDays = 0;
            allDays.forEach((ds) => {
                const att = attendanceByDate.get(ds);
                if (att) {
                    if (att.clock_in && att.clock_out) {
                        const diff = (new Date(att.clock_out).getTime() - new Date(att.clock_in).getTime()) / (1000 * 60 * 60);
                        if (Number.isFinite(diff) && diff > 0) {
                            workedHours += diff;
                        }
                    }
                    if (att.status && att.status.toLowerCase() !== 'hadir') {
                        unauthDays += 1;
                    }
                } else if (!leaveDays.has(ds)) {
                    unauthDays += 1;
                }
            });

            const plannedLeaveDays = leaveDays.size;
            const defaultCategory = (user.default_shift || '').toLowerCase().includes('shift') ? 'SHIFT' : 'DAYSHIFT';

            setInputReal((prev) => ({
                ...prev,
                category: defaultCategory,
                plannedLeaveDays,
                actualWorkingHours: Number(workedHours.toFixed(2)),
                unauthorisedAbsenceDays: unauthDays,
                period,
            }));
        } catch (err: any) {
            setErrorReal(err?.message || 'Gagal memuat realisasi KPI.');
        } finally {
            setLoadingReal(false);
        }
    };

    const renderNumberInput = (
        id: string,
        label: string,
        value: number,
        onChange: (val: number) => void,
        props?: { step?: number; min?: number; disabled?: boolean },
    ) => (
        <label className="block">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <input
                id={id}
                type="number"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                value={value}
                step={props?.step ?? 0.5}
                min={props?.min ?? 0}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                disabled={props?.disabled}
            />
        </label>
    );

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <CalculatorIcon className="h-7 w-7" />
                </span>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Hitungan KPI Berbasis Jam Kerja & Produktivitas</h1>
                    <p className="text-sm text-gray-600">
                        Mendukung 2 kategori: Day Shift (non-shift) dan Shift. Semua role bisa melakukan simulasi, parameter hanya bisa diubah admin & superadmin.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,1fr] gap-6">
                <div className="space-y-6">
                    <section className="bg-white rounded-xl shadow-sm border p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-800">Simulasi KPI</h2>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">Live update</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-sm font-medium text-gray-700">Kategori Shift</span>
                                <select
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    value={inputSim.category}
                                    onChange={(e) => handleInputChangeSim('category', e.target.value as ShiftCategory)}
                                >
                                    <option value="DAYSHIFT">Day Shift (Non-Shift)</option>
                                    <option value="SHIFT">Shift (1/2/3)</option>
                                </select>
                            </label>

                            <label className="block">
                                <span className="text-sm font-medium text-gray-700">Periode Penilaian</span>
                                <select
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value as Period)}
                                >
                                    <option value="WEEKLY">Mingguan</option>
                                    <option value="MONTHLY">Bulanan</option>
                                    <option value="YEARLY">Tahunan</option>
                                </select>
                            </label>

                            {renderNumberInput(
                                'plannedLeaveDays',
                                'Hari cuti/izin resmi dalam periode',
                                inputSim.plannedLeaveDays,
                                (val) => handleInputChangeSim('plannedLeaveDays', val),
                                { step: 0.5, min: 0 },
                            )}
                            {renderNumberInput(
                                'actualWorkingHours',
                                'Jam kerja aktual (tanpa lembur)',
                                inputSim.actualWorkingHours,
                                (val) => handleInputChangeSim('actualWorkingHours', val),
                                { step: 0.5, min: 0 },
                            )}
                            {renderNumberInput(
                                'outputTarget',
                                'Target output periode',
                                inputSim.outputTarget,
                                (val) => handleInputChangeSim('outputTarget', val),
                                { step: 1, min: 0 },
                            )}
                            {renderNumberInput(
                                'outputActual',
                                'Output aktual periode',
                                inputSim.outputActual,
                                (val) => handleInputChangeSim('outputActual', val),
                                { step: 1, min: 0 },
                            )}
                            {renderNumberInput(
                                'unauthorisedAbsenceDays',
                                'Hari absen tidak sah (alpa/bolos)',
                                inputSim.unauthorisedAbsenceDays,
                                (val) => handleInputChangeSim('unauthorisedAbsenceDays', val),
                                { step: 0.5, min: 0 },
                            )}
                        </div>
                    </section>

                    <section className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Hasil Simulasi</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-slate-50 border">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Parameter Dasar</h3>
                                <div className="space-y-1 text-sm text-gray-700">
                                    <p>Jam per hari: <span className="font-mono text-gray-900">{formatNumber(kpiResultSim.jamPerHari)}</span></p>
                                    <p>JSP (Jam Standar Periode): <span className="font-mono text-gray-900">{formatNumber(kpiResultSim.jsp)}</span></p>
                                    <p>Jam cuti resmi (JCR): <span className="font-mono text-gray-900">{formatNumber(kpiResultSim.jcr)}</span></p>
                                    <p>Jam rencana (JR): <span className="font-mono text-gray-900">{formatNumber(kpiResultSim.jr)}</span></p>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50 border">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Skor KPI</h3>
                                <div className="space-y-1 text-sm text-gray-700">
                                    <p>
                                        Kehadiran ({formatNumber(config.weights.presence * 100, 0)}%):{' '}
                                        <span className="font-mono text-gray-900">{formatPercent(kpiResultSim.kpi1Presence)}%</span>
                                    </p>
                                    <p>
                                        Produktivitas ({formatNumber(config.weights.productivity * 100, 0)}%):{' '}
                                        <span className="font-mono text-gray-900">{formatPercent(kpiResultSim.kpi2Productivity)}%</span>
                                    </p>
                                    <p>
                                        Disiplin ({formatNumber(config.weights.discipline * 100, 0)}%):{' '}
                                        <span className="font-mono text-gray-900">{formatPercent(kpiResultSim.kpi3Discipline)}%</span>
                                    </p>
                                    <p className="pt-2 text-base font-semibold text-gray-900">
                                        Skor Akhir: <span className="font-mono">{formatPercent(kpiResultSim.finalScore)}%</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                            Rumus mengacu pada referensi internal: Kehadiran dihitung terhadap JR, produktivitas plafon {config.productivityCap}%,
                            disiplin dengan penalti linear terhadap toleransi alpa. Bobot dapat diubah oleh admin/superadmin bila kebijakan berubah.
                        </p>
                    </section>

                    <section className="bg-white rounded-xl shadow-sm border p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-800">Realisasi KPI</h2>
                            <button
                                type="button"
                                onClick={handleFetchRealisation}
                                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-400"
                                disabled={loadingReal}
                            >
                                {loadingReal ? <Spinner /> : <RefreshIcon className="h-4 w-4" />} Tarik Data Aktual
                            </button>
                        </div>

                        {errorReal && <p className="text-sm text-red-600 mb-3">{errorReal}</p>}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-sm font-medium text-gray-700">Kategori Shift (auto)</span>
                                <select
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    value={inputReal.category}
                                    onChange={(e) => handleInputChangeReal('category', e.target.value as ShiftCategory)}
                                >
                                    <option value="DAYSHIFT">Day Shift (Non-Shift)</option>
                                    <option value="SHIFT">Shift (1/2/3)</option>
                                </select>
                            </label>

                            <div className="block">
                                <span className="text-sm font-medium text-gray-700">Periode Penilaian</span>
                                <select
                                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value as Period)}
                                >
                                    <option value="WEEKLY">Mingguan (7 hari terakhir)</option>
                                    <option value="MONTHLY">Bulanan (bulan berjalan)</option>
                                    <option value="YEARLY">Tahunan (tahun berjalan)</option>
                                </select>
                            </div>

                            {renderNumberInput(
                                'plannedLeaveDaysReal',
                                'Hari cuti/izin/sakit (disetujui)',
                                inputReal.plannedLeaveDays,
                                (val) => handleInputChangeReal('plannedLeaveDays', val),
                                { step: 0.5, min: 0 },
                            )}
                            {renderNumberInput(
                                'actualWorkingHoursReal',
                                'Jam kerja aktual (tanpa lembur)',
                                inputReal.actualWorkingHours,
                                (val) => handleInputChangeReal('actualWorkingHours', val),
                                { step: 0.25, min: 0 },
                            )}
                            {renderNumberInput(
                                'outputTargetReal',
                                'Target output periode',
                                inputReal.outputTarget,
                                (val) => handleInputChangeReal('outputTarget', val),
                                { step: 1, min: 0 },
                            )}
                            {renderNumberInput(
                                'outputActualReal',
                                'Output aktual periode',
                                inputReal.outputActual,
                                (val) => handleInputChangeReal('outputActual', val),
                                { step: 1, min: 0 },
                            )}
                            {renderNumberInput(
                                'unauthorisedAbsenceDaysReal',
                                'Hari absen/telat (tanpa izin)',
                                inputReal.unauthorisedAbsenceDays,
                                (val) => handleInputChangeReal('unauthorisedAbsenceDays', val),
                                { step: 0.5, min: 0 },
                            )}
                        </div>
                    </section>

                    <section className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Hasil Realisasi</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-slate-50 border">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Parameter Dasar</h3>
                                <div className="space-y-1 text-sm text-gray-700">
                                    <p>Jam per hari: <span className="font-mono text-gray-900">{formatNumber(kpiResultReal.jamPerHari)}</span></p>
                                    <p>JSP (Jam Standar Periode): <span className="font-mono text-gray-900">{formatNumber(kpiResultReal.jsp)}</span></p>
                                    <p>Jam cuti resmi (JCR): <span className="font-mono text-gray-900">{formatNumber(kpiResultReal.jcr)}</span></p>
                                    <p>Jam rencana (JR): <span className="font-mono text-gray-900">{formatNumber(kpiResultReal.jr)}</span></p>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50 border">
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Skor KPI</h3>
                                <div className="space-y-1 text-sm text-gray-700">
                                    <p>
                                        Kehadiran ({formatNumber(config.weights.presence * 100, 0)}%):{' '}
                                        <span className="font-mono text-gray-900">{formatPercent(kpiResultReal.kpi1Presence)}%</span>
                                    </p>
                                    <p>
                                        Produktivitas ({formatNumber(config.weights.productivity * 100, 0)}%):{' '}
                                        <span className="font-mono text-gray-900">{formatPercent(kpiResultReal.kpi2Productivity)}%</span>
                                    </p>
                                    <p>
                                        Disiplin ({formatNumber(config.weights.discipline * 100, 0)}%):{' '}
                                        <span className="font-mono text-gray-900">{formatPercent(kpiResultReal.kpi3Discipline)}%</span>
                                    </p>
                                    <p className="pt-2 text-base font-semibold text-gray-900">
                                        Skor Akhir: <span className="font-mono">{formatPercent(kpiResultReal.finalScore)}%</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-gray-500">
                            Data realisasi dihitung dari kehadiran, cuti/sakit/izin disetujui, dan status terlambat/absen pada periode berjalan. Target output sementara diisi manual.
                        </p>
                    </section>
                </div>

                <section className="bg-white rounded-xl shadow-sm border p-5 h-fit">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Parameter KPI</h2>
                            <p className="text-xs text-gray-500">Hanya admin & superadmin yang bisa mengubah nilai dasar.</p>
                        </div>
                        {!isPrivileged && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                                <LockClosedIcon className="h-4 w-4" /> Read only
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {renderNumberInput(
                                'jamPerHariDay',
                                'Jam per hari - Day Shift',
                                configDraft.jamPerHari.DAYSHIFT,
                                (val) => handleConfigChange('jamPerHari.DAYSHIFT', val),
                                { step: 0.25, min: 0, disabled: !isPrivileged },
                            )}
                            {renderNumberInput(
                                'jamPerHariShift',
                                'Jam per hari - Shift',
                                configDraft.jamPerHari.SHIFT,
                                (val) => handleConfigChange('jamPerHari.SHIFT', val),
                                { step: 0.25, min: 0, disabled: !isPrivileged },
                            )}
                            {renderNumberInput(
                                'jspWeekly',
                                'JSP Mingguan',
                                configDraft.jspPerPeriod.WEEKLY,
                                (val) => handleConfigChange('jspPerPeriod.WEEKLY', val),
                                { step: 1, min: 0, disabled: !isPrivileged },
                            )}
                            {renderNumberInput(
                                'jspMonthly',
                                'JSP Bulanan',
                                configDraft.jspPerPeriod.MONTHLY,
                                (val) => handleConfigChange('jspPerPeriod.MONTHLY', val),
                                { step: 1, min: 0, disabled: !isPrivileged },
                            )}
                            {renderNumberInput(
                                'jspYearly',
                                'JSP Tahunan',
                                configDraft.jspPerPeriod.YEARLY,
                                (val) => handleConfigChange('jspPerPeriod.YEARLY', val),
                                { step: 1, min: 0, disabled: !isPrivileged },
                            )}
                            {renderNumberInput(
                                'toleranceUnauth',
                                'Toleransi alpa (hari/tahun)',
                                configDraft.toleranceUnauthorisedDays,
                                (val) => handleConfigChange('toleranceUnauthorisedDays', val),
                                { step: 0.5, min: 0, disabled: !isPrivileged },
                            )}
                            {renderNumberInput(
                                'presenceCap',
                                'Plafon Kehadiran (%)',
                                configDraft.presenceCap,
                                (val) => handleConfigChange('presenceCap', val),
                                { step: 1, min: 50, disabled: !isPrivileged },
                            )}
                            {renderNumberInput(
                                'productivityCap',
                                'Plafon Produktivitas (%)',
                                configDraft.productivityCap,
                                (val) => handleConfigChange('productivityCap', val),
                                { step: 1, min: 50, disabled: !isPrivileged },
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {renderNumberInput(
                                'weightPresence',
                                'Bobot Kehadiran',
                                configDraft.weights.presence,
                                (val) => handleConfigChange('weights.presence', val),
                                { step: 0.05, min: 0, disabled: !isPrivileged },
                            )}
                            {renderNumberInput(
                                'weightProductivity',
                                'Bobot Produktivitas',
                                configDraft.weights.productivity,
                                (val) => handleConfigChange('weights.productivity', val),
                                { step: 0.05, min: 0, disabled: !isPrivileged },
                            )}
                            {renderNumberInput(
                                'weightDiscipline',
                                'Bobot Disiplin',
                                configDraft.weights.discipline,
                                (val) => handleConfigChange('weights.discipline', val),
                                { step: 0.05, min: 0, disabled: !isPrivileged },
                            )}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                                <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                                <span>
                                    Total bobot: <strong>{formatNumber(totalWeight, 2)}</strong> {totalWeight !== 1 ? '(disarankan 1.00)' : '(OK)'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleResetConfig}
                                    disabled={!isPrivileged}
                                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                >
                                    <RefreshIcon className="h-4 w-4" /> Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveConfig}
                                    disabled={!isPrivileged}
                                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                                >
                                    <SaveIcon className="h-4 w-4" /> Simpan
                                </button>
                            </div>
                        </div>
                        {configMessage && (
                            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{configMessage}</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default KpiCalculator;

// Shared KPI helpers for other dashboards (keeps logic in one place)
export {
    DEFAULT_CONFIG as KPI_DEFAULT_CONFIG,
    normalizeConfig as normalizeKpiConfig,
    calculateKpi as computeKpiScore,
    STORAGE_KEY as KPI_STORAGE_KEY,
};
