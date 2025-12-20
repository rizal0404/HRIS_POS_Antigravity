import React, { useState } from "react";

// =========================
// Types & Helper Functions
// =========================

export type ShiftCategory = "DAY" | "SHIFT_123" | "SHIFT_77";

export type Period = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface KpiInput {
  category: ShiftCategory;
  period: Period;
  plannedLeaveDays: number; // Cuti + izin resmi (dalam hari)
  actualWorkingHours: number; // Jam kerja aktual (tidak termasuk lembur)
  outputTarget: number; // Target output periode (misal jumlah sampel)
  outputActual: number; // Output aktual periode
  unauthorisedAbsenceDays: number; // Absen tidak sah (dalam hari)
  toleranceUnauthorisedDays?: number; // Toleransi hari absen tidak sah (default 2 hari / tahun, diskalakan manual oleh user)
}

export interface KpiResult {
  jamPerHari: number;
  jsp: number; // Jam Standar Periode
  jcr: number; // Jam Cuti Resmi
  jr: number; // Jam Rencana
  kpi1Presence: number; // 0 - 120 (dibatasi di 100 dalam rumus)
  kpi2Productivity: number; // 0 - 120
  kpi3Discipline: number; // 0 - 100
  finalScore: number; // 0 - 120 (praktiknya 0 - 100)
}

const JAM_PER_HARI: Record<ShiftCategory, number> = {
  DAY: 7,
  SHIFT_123: 7.5,
  SHIFT_77: 10,
};

const JSP_PER_PERIOD: Record<Period, number> = {
  WEEKLY: 45,
  MONTHLY: 196,
  YEARLY: 2349, // menyesuaikan tabel FTE (Total effective working hour)
};

export function calculateKpi(input: KpiInput): KpiResult {
  const {
    category,
    period,
    plannedLeaveDays,
    actualWorkingHours,
    outputTarget,
    outputActual,
    unauthorisedAbsenceDays,
    toleranceUnauthorisedDays,
  } = input;

  const jamPerHari = JAM_PER_HARI[category];
  const jsp = JSP_PER_PERIOD[period];

  const safeNumber = (value: number): number => (Number.isFinite(value) ? value : 0);

  // Jam cuti resmi (Cuti tahunan, izin, sakit berizin, dll) dalam jam
  const jcr = safeNumber(plannedLeaveDays) * jamPerHari;

  // Jam rencana (tidak boleh negatif)
  const jr = Math.max(jsp - jcr, 0);

  // =====================
  // KPI 1 - Kehadiran
  // =====================
  let kpi1Presence = 0;
  if (jr > 0 && actualWorkingHours > 0) {
    kpi1Presence = Math.min((actualWorkingHours / jr) * 100, 100);
  }

  // =====================
  // KPI 2 - Produktivitas
  // =====================
  let kpi2Productivity = 0;
  if (outputTarget > 0 && outputActual >= 0) {
    kpi2Productivity = Math.min((outputActual / outputTarget) * 100, 120); // plafon 120%
  }

  // =====================
  // KPI 3 - Disiplin
  // =====================
  const jats = safeNumber(unauthorisedAbsenceDays) * jamPerHari; // Jam absen tidak sah

  // Toleransi default 2 hari (bisa disesuaikan di parameter)
  const toleranceDays =
    typeof toleranceUnauthorisedDays === "number" && toleranceUnauthorisedDays >= 0
      ? toleranceUnauthorisedDays
      : 2;

  const toleranceHours = toleranceDays * jamPerHari;

  let kpi3Discipline = 100;
  if (jats <= 0) {
    kpi3Discipline = 100;
  } else if (toleranceHours <= 0) {
    // bila toleransi tidak diatur dengan benar
    kpi3Discipline = 70;
  } else if (jats >= toleranceHours) {
    kpi3Discipline = 70; // nilai minimum bila melebihi toleransi
  } else {
    // linear dari 100 turun ke 70
    const penalty = (jats / toleranceHours) * 30;
    kpi3Discipline = 100 - penalty;
  }

  // =====================
  // Skor Akhir (bobot)
  // =====================
  const finalScore =
    kpi1Presence * 0.3 + // 30%
    kpi2Productivity * 0.5 + // 50%
    kpi3Discipline * 0.2; // 20%

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
}

// =========================
// React Component (UI)
// =========================

const HitunganKPI: React.FC = () => {
  const [category, setCategory] = useState<ShiftCategory>("DAY");
  const [period, setPeriod] = useState<Period>("MONTHLY");

  const [plannedLeaveDays, setPlannedLeaveDays] = useState<number>(0);
  const [actualWorkingHours, setActualWorkingHours] = useState<number>(0);
  const [outputTarget, setOutputTarget] = useState<number>(0);
  const [outputActual, setOutputActual] = useState<number>(0);
  const [unauthorisedAbsenceDays, setUnauthorisedAbsenceDays] = useState<number>(0);
  const [toleranceUnauthorisedDays, setToleranceUnauthorisedDays] = useState<number>(2);

  const kpi = calculateKpi({
    category,
    period,
    plannedLeaveDays,
    actualWorkingHours,
    outputTarget,
    outputActual,
    unauthorisedAbsenceDays,
    toleranceUnauthorisedDays,
  });

  const formatNumber = (value: number, decimals = 2): string => {
    if (!Number.isFinite(value)) return "0";
    return value.toLocaleString("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-4 rounded-2xl shadow-md border bg-white">
      <h2 className="text-xl font-semibold mb-2">Perhitungan KPI Berbasis Jam Kerja &amp; Produktivitas</h2>

      {/* Pilihan kategori & periode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Kategori Shift</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as ShiftCategory)}
          >
            <option value="DAY">Day Shift</option>
            <option value="SHIFT_123">Shift 1/2/3</option>
            <option value="SHIFT_77">Shift 7/7</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Periode Penilaian</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            <option value="WEEKLY">Mingguan</option>
            <option value="MONTHLY">Bulanan</option>
            <option value="YEARLY">Tahunan</option>
          </select>
        </div>
      </div>

      {/* Input angka utama */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Total hari cuti/izin resmi dalam periode
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={plannedLeaveDays}
            onChange={(e) => setPlannedLeaveDays(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Jam kerja aktual (tanpa lembur)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={actualWorkingHours}
            onChange={(e) => setActualWorkingHours(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Target output periode</label>
          <input
            type="number"
            min={0}
            step={1}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={outputTarget}
            onChange={(e) => setOutputTarget(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Output aktual periode</label>
          <input
            type="number"
            min={0}
            step={1}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={outputActual}
            onChange={(e) => setOutputActual(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Hari absen tidak sah (alpa, bolos, dll)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={unauthorisedAbsenceDays}
            onChange={(e) => setUnauthorisedAbsenceDays(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Toleransi hari absen tidak sah (default 2 hari)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={toleranceUnauthorisedDays}
            onChange={(e) => setToleranceUnauthorisedDays(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Ringkasan perhitungan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="p-3 rounded-xl border bg-slate-50 text-sm space-y-1">
          <h3 className="font-semibold mb-1">Parameter Dasar</h3>
          <p>Jam per hari: <span className="font-mono">{formatNumber(kpi.jamPerHari, 2)} jam</span></p>
          <p>Jam standar periode (JSP): <span className="font-mono">{formatNumber(kpi.jsp, 2)} jam</span></p>
          <p>Jam cuti resmi (JCR): <span className="font-mono">{formatNumber(kpi.jcr, 2)} jam</span></p>
          <p>Jam rencana (JR): <span className="font-mono">{formatNumber(kpi.jr, 2)} jam</span></p>
        </div>

        <div className="p-3 rounded-xl border bg-slate-50 text-sm space-y-1">
          <h3 className="font-semibold mb-1">Skor KPI</h3>
          <p>KPI 1 - Kehadiran: <span className="font-mono">{formatNumber(kpi.kpi1Presence)}%</span></p>
          <p>KPI 2 - Produktivitas: <span className="font-mono">{formatNumber(kpi.kpi2Productivity)}%</span></p>
          <p>KPI 3 - Disiplin: <span className="font-mono">{formatNumber(kpi.kpi3Discipline)}%</span></p>
          <p className="mt-2 font-semibold text-base">
            Skor Akhir: <span className="font-mono">{formatNumber(kpi.finalScore)}%</span>
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Catatan: Rumus mengikuti skema HRD internal berbasis jam kerja efektif &amp; produktivitas. Bobot: Kehadiran 30%,
        Produktivitas 50%, Disiplin 20%. Nilai dapat disesuaikan di helper <code>calculateKpi</code> bila kebijakan berubah.
      </p>
    </div>
  );
};

export default HitunganKPI;
