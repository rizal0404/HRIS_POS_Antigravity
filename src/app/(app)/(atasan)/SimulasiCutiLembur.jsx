'use client';

import React, { useState, useEffect, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { apiService } from "../../../services/apiService";
import { getAllSubordinates } from "../../../lib/utils";

// Data Karyawan Awal
const initialEmployees = [
  "WASKITA DWI PUTRA",
  "ABDULLAH",
  "BAMBANG SUFRAYOGI",
  "MUH FADILLAH YUSUF",
];

// Konstanta jam kerja
const WORK_HOURS_PER_SHIFT = 8; // Asumsi shift normal 8 jam
const TARGET_MONTHLY_HOURS = 196; // Batas 196 jam/bulan

// Fungsi untuk membuat jadwal kosong 31 hari
const createEmptySchedule = (employeesList = initialEmployees) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const sched = {};
  days.forEach((d) => {
    sched[d] = {};
    employeesList.forEach((name) => {
      sched[d][name] = "OFF";
    });
  });
  return sched;
};

// Pilihan Shift
const shiftOptions = ["1T13", "2T13", "3T13", "OFF"];

const SimulasiCutiLemburPage = ({ user }) => {
  const buildDefaultSchedule = (list = initialEmployees) => {
    const defaultSched = createEmptySchedule(list);
    const shifts = ["1T13", "2T13", "3T13", "OFF", "OFF", "1T13", "2T13", "3T13"]; 
    list.forEach((name, empIndex) => {
      for (let d = 1; d <= 31; d++) {
        const shiftIndex = (empIndex * 31 + d - 1) % shifts.length;
        defaultSched[d][name] = shifts[shiftIndex];
      }
    });
    if (list.includes("WASKITA DWI PUTRA")) {
      defaultSched[4]["WASKITA DWI PUTRA"] = "2T13";
      defaultSched[5]["WASKITA DWI PUTRA"] = "2T13";
    }
    if (list.includes("BAMBANG SUFRAYOGI")) {
      defaultSched[4]["BAMBANG SUFRAYOGI"] = "3T13";
      defaultSched[5]["BAMBANG SUFRAYOGI"] = "3T13";
    }
    if (list.includes("MUH FADILLAH YUSUF")) {
      defaultSched[4]["MUH FADILLAH YUSUF"] = "1T13";
      defaultSched[5]["MUH FADILLAH YUSUF"] = "1T13";
    }
    return defaultSched;
  };

  const [employees, setEmployees] = useState(initialEmployees);
  const [availableShifts, setAvailableShifts] = useState(shiftOptions);
  const [schedule, setSchedule] = useState(() => buildDefaultSchedule(initialEmployees));
  const [replacements, setReplacements] = useState({});

  // State pengaturan simulasi
  const [otLimit, setOtLimit] = useState(30); 
  const [dailyOtLimit] = useState(4); 
  const [scenarioType, setScenarioType] = useState("shortLeave");

  // State Cuti Pendek
  const [leaveEmployee, setLeaveEmployee] = useState("WASKITA DWI PUTRA");
  const [leaveStartDay, setLeaveStartDay] = useState(4);
  const [leaveEndDay, setLeaveEndDay] = useState(5);
  const [shift3Scenario, setShift3Scenario] = useState("1");

  // State Cuti 1 Siklus
  const [cycleStartDay, setCycleStartDay] = useState(16);
  const [cycleEndDay, setCycleEndDay] = useState(21);

  // State Cuti + Sakit
  const [sickEmployee, setSickEmployee] = useState("ABDULLAH");
  const [sickDay, setSickDay] = useState(18);
  const [useExternal, setUseExternal] = useState(true);

  // State Hasil
  const [result, setResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [currentMonth] = useState(new Date());
  const [selectAll, setSelectAll] = useState(false);

  const formatDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const syncScheduleFromTeam = useCallback(async () => {
    setLoadingSchedule(true);
    setLoadError(null);
    try {
      const allUsers = await apiService.getProfiles();
      const subordinates = getAllSubordinates(user.id, allUsers);

      if (subordinates.length === 0) {
        setEmployees(initialEmployees);
        setSchedule(buildDefaultSchedule(initialEmployees));
        setAvailableShifts(shiftOptions);
        setLoadError("Tidak ada bawahan. Menggunakan jadwal contoh.");
        return;
      }

      const idToUser = new Map(subordinates.map((u) => [u.id, u]));
      const names = subordinates.map((u) => u.full_name);
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const schedules = await apiService.getTeamSchedules(
        subordinates.map((u) => u.id),
        formatDate(start),
        formatDate(end)
      );

      const newSchedule = createEmptySchedule(names);
      const shiftSet = new Set(shiftOptions);

      schedules.forEach((s) => {
        const day = new Date(s.date).getDate();
        const targetName = idToUser.get(s.profile_id)?.full_name;
        if (!targetName || !newSchedule[day]) return;
        const shiftCode = s.shift || "OFF";
        newSchedule[day][targetName] = shiftCode;
        if (shiftCode) shiftSet.add(shiftCode);
      });

      const nextLeaveEmployee = names.includes(leaveEmployee) ? leaveEmployee : names[0];
      const nextSickEmployee = names.includes(sickEmployee) && sickEmployee !== nextLeaveEmployee
        ? sickEmployee
        : names.find((n) => n !== nextLeaveEmployee) || names[0] || "";

      setEmployees(names);
      setSchedule(newSchedule);
      setAvailableShifts(Array.from(shiftSet));
      if (nextLeaveEmployee) setLeaveEmployee(nextLeaveEmployee);
      if (nextSickEmployee) setSickEmployee(nextSickEmployee);
    } catch (error) {
      setLoadError(error.message || "Gagal memuat jadwal tim.");
    } finally {
      setLoadingSchedule(false);
    }
  }, [currentMonth, leaveEmployee, sickEmployee, user.id]);

  const handleShiftChange = (day, name, value) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [name]: value,
      },
    }));
  };
  
  useEffect(() => {
    syncScheduleFromTeam();
  }, [syncScheduleFromTeam]);

  useEffect(() => {
    setReplacements((prev) => {
      const next = {};
      employees.forEach((n) => {
        next[n] = prev[n] ?? false;
      });
      return next;
    });
  }, [employees]);

  useEffect(() => {
    const allSelected = employees.length > 0 && employees.every((n) => replacements[n]);
    setSelectAll(allSelected);
  }, [employees, replacements]);

  // --- FUNGSI SIMULASI ASLI ---

  // --- 1. Simulasi Cuti Pendek (termasuk Penyesuaian Shift 3) ---
  const simulateShortLeaveLogic = () => {
    const resRows = [];
    const otSummary = {};
    employees.forEach((e) => (otSummary[e] = 0));
    const hasSelectedReplacement = Object.values(replacements).some(Boolean);

    for (let d = leaveStartDay; d <= leaveEndDay; d++) {
      const daySched = schedule[d];
      if (!daySched) continue;

      const leaveShift = daySched[leaveEmployee];

      employees.forEach((name) => {
        const normalShift = daySched[name];
        const isReplacement = replacements[name];
        if (hasSelectedReplacement && !isReplacement && name !== leaveEmployee) {
          resRows.push({
            day: d,
            name,
            normalShift,
            status: "BEKERJA",
            simShift: normalShift,
            ot: 0,
            actualHours: normalShift === "OFF" ? 0 : WORK_HOURS_PER_SHIFT,
            note: "Tidak ditunjuk sebagai pengganti.",
          });
          return;
        }
        let status = "BEKERJA";
        let simShift = normalShift;
        let ot = 0;
        let note = "";

        if (name === leaveEmployee) {
          status = "CUTI";
          simShift = "-";
          note = "Cuti (shift digantikan oleh rekan).";
        } else {
          // Case Shift 1
          if (leaveShift === "1T13") {
            if (normalShift === "2T13") {
              simShift = "1T13";
              ot = 4;
              note = "Geser dari 2T13 ke 1T13 + lembur 4 jam (cover sebagian Shift 2).";
            } else if (normalShift === "3T13") {
              ot = 3;
              note = "Tetap 3T13 + lembur 3 jam sebelum shift (cover akhir Shift 2).";
            } else if (normalShift === "OFF") {
              status = "OFF";
              note = "Tetap OFF.";
            } else {
              note = "Bekerja sesuai shift normal.";
            }
          }
          // Case Shift 2
          else if (leaveShift === "2T13") {
            if (normalShift === "1T13" || normalShift === "3T13") {
              ot = 2;
              note = "Lembur 2 jam untuk membantu menutup kekosongan Shift 2.";
            } else if (normalShift === "OFF") {
              status = "OFF";
              note = "Tetap OFF.";
            } else {
              note = "Bekerja sesuai shift normal.";
            }
          }
          // Case Shift 3
          else if (leaveShift === "3T13") {
            const isFirstLeaveDay = d === leaveStartDay;

            if (shift3Scenario === "1") {
              if (normalShift === "1T13") {
                simShift = "1T13";
                ot = 4;
                note = "Skenario 1: 1T13 + 4 jam lembur (1T13+4jam).";
              } else if (normalShift === "2T13") {
                simShift = "3T13";
                ot = 3;
                note = "Skenario 1: 2T13 pindah ke 3T13 + 3 jam lembur (3jam+3T13).";
              } else if (normalShift === "OFF") {
                status = "OFF";
                simShift = "OFF";
                note = "Skenario 1: tetap OFF, shift 3 ditanggung rekan lain.";
              } else {
                note = "Bekerja sesuai shift normal.";
              }
            } else if (shift3Scenario === "2") {
              if (isFirstLeaveDay) {
                if (normalShift === "1T13") {
                  simShift = "1T13";
                  ot = 4;
                  note = "Skenario 2 (H1): 1T13 + 4 jam lembur (1T13+4jam).";
                } else if (normalShift === "2T13") {
                  simShift = "3T13";
                  ot = 3;
                  note = "Skenario 2 (H1): 2T13 pindah ke 3T13 + 3 jam lembur (3jam+3T13).";
                } else if (normalShift === "OFF") {
                  status = "BEKERJA";
                  simShift = "3T13";
                  ot = 0;
                  note = "Skenario 2 (H1): dari OFF masuk shift 3 penuh (3T13).";
                } else {
                  note = "Bekerja sesuai shift normal.";
                }
              } else {
                // UPDATE LOGIKA DI SINI UNTUK HARI KE-2 DST
                if (normalShift === "1T13") {
                  simShift = "1T13";
                  ot = 0; // KOREKSI: Tidak ada lembur karena formasi lengkap
                  note = "Skenario 2 (H2+): Tetap 1T13 normal (karena Shift 3 sudah diisi oleh pengganti).";
                } else if (normalShift === "2T13") {
                  simShift = "2T13";
                  ot = 0;
                  note = "Skenario 2 (H2+): tetap 2T13 tanpa lembur (beban dipindah ke karyawan OFF).";
                } else if (normalShift === "OFF") {
                  status = "BEKERJA";
                  simShift = "3T13";
                  ot = 0;
                  note = "Skenario 2 (H2+): dari OFF menjadi 3T13 penuh (mengganti karyawan yang cuti).";
                } else {
                  note = "Bekerja sesuai shift normal.";
                }
              }
            }
          } else {
             note = "Bekerja sesuai shift normal.";
          }
        }

        const actualHours = (status === "BEKERJA") ? WORK_HOURS_PER_SHIFT + ot : 0;
        otSummary[name] += ot;

        resRows.push({
          day: d,
          name,
          normalShift,
          status,
          simShift,
          ot,
          actualHours,
          note,
        });
      });
    }

    const firstLeaveShift = schedule[leaveStartDay]?.[leaveEmployee];
    const adjustmentDay = leaveEndDay + 1;

    if (firstLeaveShift === "3T13" && schedule[adjustmentDay] && adjustmentDay <= 31) {
      const daySchedAdj = schedule[adjustmentDay];

      employees.forEach((name) => {
        const normalShift = daySchedAdj[name];
        let status = normalShift === "OFF" ? "OFF" : "BEKERJA";
        let simShift = normalShift;
        let ot = 0;
        let note = "Hari penyesuaian setelah cuti shift 3.";

        if (name === leaveEmployee) {
           status = normalShift === "OFF" ? "OFF" : "BEKERJA";
           simShift = normalShift;
           note = "Hari penyesuaian: kembali ke jadwal normal.";
        } else if (shift3Scenario === "1") {
           if (normalShift === "3T13") {
             simShift = "3T13";
             ot = 3;
             note = "Penyesuaian Skenario 1: 3jam+3T13.";
           } else if (normalShift === "2T13") {
             simShift = "1T13";
             ot = 4;
             note = "Penyesuaian Skenario 1: 1T13+4jam.";
           } else if (normalShift === "1T13") {
             status = "OFF";
             simShift = "OFF";
             note = "Penyesuaian Skenario 1: OFF (recovery setelah lembur).";
           }
        } else if (shift3Scenario === "2") {
           if (normalShift === "3T13") {
             simShift = "3T13";
             ot = 3;
             note = "Penyesuaian Skenario 2: 3jam+3T13.";
           } else if (normalShift === "2T13") {
             status = "OFF";
             simShift = "OFF";
             note = "Penyesuaian Skenario 2: OFF setelah bantu shift 3.";
           } else if (normalShift === "1T13") {
             simShift = "1T13";
             ot = 4;
             note = "Penyesuaian Skenario 2: 1T13+4jam.";
           }
        }

        const actualHours = (status === "BEKERJA") ? WORK_HOURS_PER_SHIFT + ot : 0;
        otSummary[name] += ot;

        resRows.push({
          day: adjustmentDay,
          name,
          normalShift,
          status,
          simShift,
          ot,
          actualHours,
          note: `[PENYESUAIAN] ${note}`, 
        });
      });
    }

    return { rows: resRows, otSummary };
  };

  // --- 2. Simulasi Cuti 1 Siklus ---
  const simulateCycleLeaveLogic = () => {
    const resRows = [];
    const otSummary = {};
    employees.forEach((e) => (otSummary[e] = 0));
    const hasSelectedReplacement = Object.values(replacements).some(Boolean);

    for (let d = cycleStartDay; d <= cycleEndDay; d++) {
      const daySched = schedule[d];
      if (!daySched) continue;
      const leaveShift = daySched[leaveEmployee];

      employees.forEach((name) => {
        const normalShift = daySched[name];
        const isReplacement = replacements[name];
        if (hasSelectedReplacement && !isReplacement && name !== leaveEmployee) {
          const actualHours = normalShift === "OFF" ? 0 : WORK_HOURS_PER_SHIFT;
          resRows.push({
            day: d,
            name,
            normalShift,
            status: actualHours > 0 ? "BEKERJA" : "OFF",
            simShift: normalShift,
            ot: 0,
            actualHours,
            note: "Tidak ditunjuk sebagai pengganti.",
          });
          return;
        }
        let status = normalShift === "OFF" ? "OFF" : "BEKERJA";
        let simShift = normalShift;
        let ot = 0;
        let note = "";

        if (name === leaveEmployee) {
          status = "CUTI";
          simShift = "-";
          note = "Cuti 1 siklus (2,1,3).";
        } else {
          if (leaveShift === "2T13") {
            if (normalShift === "1T13") {
              ot = 2;
              note = "Shift 1 + lembur 2 jam awal Shift 2.";
            } else if (normalShift === "3T13") {
              ot = 2;
              note = "Shift 3 + lembur 2 jam akhir Shift 2.";
            } else if (normalShift === "OFF") {
              note = "Tetap OFF.";
            } else {
              note = "Bekerja sesuai shift normal.";
            }
          } else if (leaveShift === "1T13") {
            if (normalShift === "2T13") {
              simShift = "1T13";
              ot = 4;
              note = "2T13 digeser ke 1T13 + lembur 4 jam.";
            } else if (normalShift === "3T13") {
              ot = 3;
              note = "3T13 + lembur 3 jam sebelum shift.";
            } else if (normalShift === "OFF") {
              note = "Tetap OFF.";
            } else {
              note = "Bekerja sesuai shift normal.";
            }
          } else if (leaveShift === "3T13") {
            if (normalShift === "2T13") {
              ot = 2;
              note = "2T13 + lembur 2 jam awal 3T13.";
            } else if (normalShift === "1T13") {
              ot = 2;
              note = "1T13 + lembur 2 jam akhir malam.";
            } else if (normalShift === "OFF") {
              note = "Tetap OFF.";
            } else {
              note = "Bekerja sesuai shift normal.";
            }
          } else {
            note = "Bekerja sesuai shift normal.";
          }
        }

        const actualHours = (status === "BEKERJA" || (status==="OFF" && simShift!=="OFF")) ? WORK_HOURS_PER_SHIFT + ot : 0;
        otSummary[name] += ot;

        resRows.push({
          day: d,
          name,
          normalShift,
          status,
          simShift,
          ot,
          actualHours,
          note,
        });
      });
    }
    return { rows: resRows, otSummary };
  };

  // --- 3. Simulasi Cuti + Sakit ---
  const simulateLeavePlusSickLogic = () => {
    const resRows = [];
    const otSummary = {};
    employees.forEach((e) => (otSummary[e] = 0));
    const hasSelectedReplacement = Object.values(replacements).some(Boolean);

    const d = sickDay;
    const daySched = schedule[d];
    if (!daySched) return { rows: resRows, otSummary };

    employees.forEach((name) => {
      const normalShift = daySched[name];
      const isReplacement = replacements[name];
      if (hasSelectedReplacement && !isReplacement && name !== leaveEmployee && name !== sickEmployee) {
        resRows.push({
          day: d,
          name,
          normalShift,
          status: normalShift === "OFF" ? "OFF" : "BEKERJA",
          simShift: normalShift,
          ot: 0,
          actualHours: normalShift === "OFF" ? 0 : WORK_HOURS_PER_SHIFT,
          note: "Tidak ditunjuk sebagai pengganti.",
        });
        return;
      }
      let status = "BEKERJA";
      let simShift = normalShift;
      let ot = 0;
      let note = "";

      if (name === leaveEmployee) {
        status = "CUTI";
        simShift = "-";
        note = "Cuti.";
      } else if (name === sickEmployee) {
        status = "SAKIT";
        simShift = "-";
        note = "Mendadak sakit.";
      } else {
        if (useExternal) {
          if (normalShift === "OFF") {
            status = "OFF";
            note = "Tetap OFF (tenaga eksternal mengisi shift kosong).";
          } else {
            note = "Bekerja sesuai shift normal, tambahan beban di-cover tenaga eksternal.";
          }
        } else {
          if (normalShift === "OFF") {
            status = "BEKERJA";
            simShift = "1T13";
            ot = 4;
            note = "Tanpa eksternal: dari OFF menjadi Shift 1 + lembur 4 jam (cover Shift 2).";
          } else if (normalShift === "3T13") {
            simShift = "3T13";
            ot = 4;
            note = "Tanpa eksternal: tetap Shift 3 + lembur 4 jam (cover sisa Shift 2/3).";
          } else {
            note = "Bekerja sesuai shift normal.";
          }
        }
      }

      const actualHours = (status === "BEKERJA" || (status==="OFF" && simShift!=="OFF")) ? WORK_HOURS_PER_SHIFT + ot : 0;
      otSummary[name] += ot;

      resRows.push({
        day: d,
        name,
        normalShift,
        status,
        simShift,
        ot,
        actualHours,
        note,
      });
    });

    return { rows: resRows, otSummary };
  };

  const runSimulation = useCallback(() => {
    if (!employees.length) {
      setResult(null);
      return;
    }
    let simResult;

    if (scenarioType === "shortLeave") {
        simResult = simulateShortLeaveLogic();
    } else if (scenarioType === "cycleLeave") {
        simResult = simulateCycleLeaveLogic();
    } else {
        simResult = simulateLeavePlusSickLogic();
    }

    // Filter detail hanya untuk karyawan terpilih (selalu sertakan karyawan cuti/sakit)
    const selectedNames = new Set(
      employees.filter((n) => replacements[n] || n === leaveEmployee || n === sickEmployee)
    );

    const filteredRows = simResult.rows.filter((r) => selectedNames.has(r.name));
    const { otSummary } = simResult;

    const totalNormalHours = employees.reduce((acc, name) => {
        let total = 0;
        for (let d = 1; d <= 31; d++) {
            if (schedule[d] && schedule[d][name] !== "OFF") {
                total += WORK_HOURS_PER_SHIFT;
            }
        }
        acc[name] = total;
        return acc;
    }, {});

    const monthlyHoursSummary = employees.reduce((acc, name) => {
        let totalCutisSickHours = 0;
        filteredRows.forEach(r => {
            if (r.name === name) {
                 if (r.status === "CUTI" || r.status === "SAKIT" || r.note.includes("OFF (recovery")) {
                     if (schedule[r.day] && schedule[r.day][name] !== "OFF") {
                       totalCutisSickHours += WORK_HOURS_PER_SHIFT;
                    }
                 }
            }
        });
        const netNormal = totalNormalHours[name] - totalCutisSickHours;
        const totalOT = otSummary[name];
        acc[name] = netNormal + totalOT;
        return acc;
    }, {});

    const breaches = Object.entries(otSummary)
      .filter(([_, hours]) => hours > otLimit)
      .map(([name, hours]) => ({ name, hours }));
      
    const hoursBreaches = Object.entries(monthlyHoursSummary)
      .filter(([_, hours]) => hours > TARGET_MONTHLY_HOURS)
      .map(([name, hours]) => ({ name, hours }));

    setResult({ rows: filteredRows, otSummary, monthlyHoursSummary, breaches, hoursBreaches });
  }, [employees, schedule, scenarioType, leaveStartDay, leaveEndDay, cycleStartDay, cycleEndDay, sickDay, leaveEmployee, sickEmployee, shift3Scenario, useExternal, otLimit, replacements]);

  useEffect(() => {
    if (typeof Papa === 'undefined' || typeof XLSX === 'undefined') {
        console.warn("Library PapaParse atau XLSX tidak terdeteksi.");
    }
  }, []);

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof Papa === 'undefined') {
        setImportError("Library PapaParse tidak tersedia.");
        return;
    }

    setImportError(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        if (!data || data.length === 0) {
            setImportError("File CSV kosong.");
            return;
        }

        const newSchedule = createEmptySchedule(employees);
        const shiftKeys = Array.from({ length: 31 }, (_, i) => String(i + 1));
        const newEmployees = [];
        const dynamicShifts = new Set(availableShifts);

        try {
          data.forEach(row => {
            const name = row.Nama?.trim() || row.NAME?.trim();
            if (!name || !employees.includes(name)) return;
            
            if (!newEmployees.includes(name)) newEmployees.push(name);

            for (let d = 1; d <= 31; d++) {
                if (!newSchedule[d]) newSchedule[d] = {};
                if (!newSchedule[d][name]) newSchedule[d][name] = "OFF";
            }

            shiftKeys.forEach(dayKey => {
              const day = parseInt(dayKey, 10);
              const shiftValue = (row[dayKey]?.trim() || 'OFF').toUpperCase();
              newSchedule[day][name] = shiftValue;
              dynamicShifts.add(shiftValue);
            });
          });
          
          if(newEmployees.length === 0) throw new Error("Tidak ada data karyawan valid.");

          setSchedule(newSchedule);
          setAvailableShifts(Array.from(dynamicShifts));
          setImportError(`Berhasil memuat jadwal.`);

        } catch (e) {
          setImportError("Format CSV tidak sesuai.");
        }
      },
      error: (error) => setImportError(`Gagal: ${error.message}`)
    });
  };

  const handleExportExcel = () => {
    if (!result || typeof XLSX === 'undefined') return;
    
    const workbook = XLSX.utils.book_new();
    const summaryData = [
        ["Nama", "Total Lembur (Jam)", "Total Jam Kerja (N+L)", `Batas Jam Normal (${TARGET_MONTHLY_HOURS})`, `Batas Lembur (${otLimit})`, "Status"],
        ...employees.map(name => [
            name,
            result.otSummary[name],
            result.monthlyHoursSummary[name],
            result.monthlyHoursSummary[name] > TARGET_MONTHLY_HOURS ? "LEBIH" : "OK",
            result.otSummary[name] > otLimit ? "LEBIH" : "OK",
            result.monthlyHoursSummary[name] > TARGET_MONTHLY_HOURS ? "OVERLOAD" : "AMAN",
        ])
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Rangkuman");

    const detailHeader = ["Hari", "Nama", "Shift Normal", "Status", "Shift Simulasi", "Lembur (Jam)", "Total Jam Hari Ini", "Catatan"];
    const detailData = result.rows.map(r => [
        r.day, r.name, r.normalShift, r.status, r.simShift, r.ot, r.actualHours, r.note
    ]);
    const detailSheet = XLSX.utils.aoa_to_sheet([detailHeader, ...detailData]);
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Detail Harian");

    XLSX.writeFile(workbook, "Hasil_Simulasi.xlsx");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 flex flex-col gap-6 font-sans">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
          Simulasi Cuti & Lembur Tim Shift
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Aplikasi HRD untuk menguji skenario cuti dan lembur dengan logika penyesuaian shift otomatis.
        </p>
      </header>

      {/* Panel Pengaturan */}
      <section className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-4">
        <h2 className="font-bold text-lg text-indigo-700 border-b pb-2">Pengaturan & Data</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700">Batas Lembur/Bulan</label>
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" value={otLimit} onChange={(e) => setOtLimit(Number(e.target.value) || 0)} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700">Batas Jam Kerja/Bulan</label>
            <input type="number" className="border rounded-lg px-3 py-2 text-sm bg-slate-100" value={TARGET_MONTHLY_HOURS} readOnly />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700">Skenario</label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={scenarioType} onChange={(e) => { setScenarioType(e.target.value); setResult(null); }}>
              <option value="shortLeave">Cuti 1–2 hari</option>
              <option value="cycleLeave">Cuti 1 Siklus</option>
              <option value="leavePlusSick">Cuti + Sakit</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700">Import CSV</label>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="text-sm file:py-2 file:px-4 file:rounded-full file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700">Sinkron Jadwal Tim (bulan ini)</label>
            <button
              type="button"
              onClick={syncScheduleFromTeam}
              disabled={loadingSchedule}
              className="px-3 py-2 rounded-lg text-sm font-semibold border border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60"
            >
              {loadingSchedule ? "Memuat jadwal..." : "Ambil dari Tim Saya"}
            </button>
            <p className="text-[11px] text-slate-500">Mengambil jadwal bawahan dari halaman Tim Saya untuk bulan berjalan.</p>
          </div>
        </div>
        {importError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{importError}</div>}
        {loadError && <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">{loadError}</div>}
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        {/* Parameter Kiri */}
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-4">
          <h2 className="font-bold text-lg text-indigo-700 border-b pb-2">Parameter Skenario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">Karyawan Cuti</span>
              <select className="border rounded-lg px-3 py-2" value={leaveEmployee} onChange={(e) => setLeaveEmployee(e.target.value)}>
                {employees.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            {scenarioType === "shortLeave" && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-slate-700">Mulai Cuti</span>
                  <input type="number" min={1} max={31} className="border rounded-lg px-3 py-2" value={leaveStartDay} onChange={(e) => setLeaveStartDay(Math.max(1, Math.min(31, Number(e.target.value))))} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-slate-700">Akhir Cuti</span>
                  <input type="number" min={1} max={31} className="border rounded-lg px-3 py-2" value={leaveEndDay} onChange={(e) => setLeaveEndDay(Math.max(1, Math.min(31, Number(e.target.value))))} />
                </div>
              </>
            )}

            {scenarioType === "cycleLeave" && (
               <>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-slate-700">Mulai Siklus</span>
                  <input type="number" min={1} max={31} className="border rounded-lg px-3 py-2" value={cycleStartDay} onChange={(e) => setCycleStartDay(Math.max(1, Math.min(31, Number(e.target.value))))} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-slate-700">Akhir Siklus</span>
                  <input type="number" min={1} max={31} className="border rounded-lg px-3 py-2" value={cycleEndDay} onChange={(e) => setCycleEndDay(Math.max(1, Math.min(31, Number(e.target.value))))} />
                </div>
              </>
            )}

            {(scenarioType === "shortLeave" || scenarioType === "cycleLeave") && (
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="font-medium text-slate-700">Skenario Shift 3 (Jika cuti di 3T13)</span>
                  <select className="border rounded-lg px-3 py-2" value={shift3Scenario} onChange={(e) => setShift3Scenario(e.target.value)}>
                    <option value="1">Skenario 1 (Standard)</option>
                    <option value="2">Skenario 2 (Off -&gt; 3T13)</option>
                  </select>
                </div>
            )}

            {scenarioType === "leavePlusSick" && (
                <>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-slate-700">Karyawan Sakit</span>
                  <select className="border rounded-lg px-3 py-2" value={sickEmployee} onChange={(e) => setSickEmployee(e.target.value)}>
                    {employees.filter(e => e !== leaveEmployee).map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-slate-700">Hari Sakit</span>
                  <input type="number" min={1} max={31} className="border rounded-lg px-3 py-2" value={sickDay} onChange={(e) => setSickDay(Number(e.target.value))} />
                </div>
                <div className="col-span-2 mt-2">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={useExternal} onChange={(e) => setUseExternal(e.target.checked)} /> Gunakan External</label>
                </div>
                </>
            )}
          </div>
          <button onClick={runSimulation} className="mt-4 px-6 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition transform hover:scale-[1.02]">
            Jalankan Simulasi
          </button>
        </div>

        {/* Editor Jadwal Kanan */}
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-4 overflow-hidden">
          <h2 className="font-bold text-lg text-indigo-700 border-b pb-2">Editor Jadwal</h2>
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 sticky top-0 shadow-sm">
                  <th className="border px-2 py-2 text-center text-xs font-semibold w-10 sticky left-0 bg-slate-100 z-20">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectAll(checked);
                        setReplacements((prev) => {
                          const next = {};
                          employees.forEach((n) => { next[n] = checked; });
                          return next;
                        });
                      }}
                      aria-label="Pilih semua pengganti"
                    />
                  </th>
                  <th className="border px-3 py-2 text-left text-xs font-semibold sticky left-10 bg-slate-100 z-10">Nama</th>
                  {Array.from({ length: 31 }, (_, i) => <th key={i} className="border px-1 py-1 text-center text-xs">{i+1}</th>)}
                </tr>
              </thead>
              <tbody>
                {employees.map((name) => (
                  <tr key={name} className="hover:bg-indigo-50/50">
                    <td className="border px-2 py-1 text-center bg-slate-50 sticky left-0 z-20">
                      <input
                        type="checkbox"
                        checked={!!replacements[name]}
                        onChange={(e) => setReplacements((prev) => ({ ...prev, [name]: e.target.checked }))}
                        aria-label={`Tandai ${name} sebagai pengganti`}
                      />
                    </td>
                    <td className="border px-3 py-1 font-medium text-xs bg-slate-50 sticky left-10 z-10">{name}</td>
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = i + 1;
                      if (!schedule[d]) return <td key={d}></td>;
                      const isLeave = (scenarioType!=="leavePlusSick" && d>=leaveStartDay && d<=leaveEndDay && name===leaveEmployee);
                      const isAdj = (scenarioType!=="leavePlusSick" && d===leaveEndDay+1);
                      return (
                        <td key={d} className="border px-0.5 py-0.5">
                          <select 
                            className={`w-full text-[10px] border-none p-1 rounded ${isLeave ? 'bg-red-100' : isAdj ? 'bg-purple-100' : 'bg-white'}`}
                            value={schedule[d][name]}
                            onChange={(e) => handleShiftChange(d, name, e.target.value)}
                          >
                            {availableShifts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* HASIL SIMULASI */}
      {result && (
        <section className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-4 mt-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="font-bold text-lg text-indigo-700">Hasil Simulasi</h2>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700">
               Export Excel
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {employees.map((name) => (
              <div key={name} className={`border rounded-xl p-3 flex flex-col gap-1 ${result.otSummary[name]>otLimit ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                <div className="font-bold text-sm text-slate-800">{name}</div>
                <div>Total Lembur: <span className="font-bold">{result.otSummary[name]} jam</span></div>
                <div>Total Jam Kerja: <span className="font-bold">{result.monthlyHoursSummary[name]} jam</span></div>
                {result.otSummary[name] > otLimit && <div className="text-red-600 font-bold mt-1">Over Lembur ({otLimit})</div>}
                {result.monthlyHoursSummary[name] > TARGET_MONTHLY_HOURS && <div className="text-orange-600 font-bold">Over Jam Bulanan ({TARGET_MONTHLY_HOURS})</div>}
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-slate-700 mt-2">Detail Harian</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 sticky top-0 text-left text-xs font-semibold">
                  <th className="border px-3 py-2">Hari</th>
                  <th className="border px-3 py-2">Nama</th>
                  <th className="border px-3 py-2">Shift Normal</th>
                  <th className="border px-3 py-2">Status</th>
                  <th className="border px-3 py-2">Shift Simulasi</th>
                  <th className="border px-3 py-2">Lembur</th>
                  <th className="border px-3 py-2">Total Jam</th>
                  <th className="border px-3 py-2">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, idx) => (
                  <tr key={idx} className={`text-xs ${r.note.includes("PENYESUAIAN") ? "bg-purple-100" : r.status==="CUTI" || r.status==="SAKIT" ? "bg-red-50" : idx%2===0 ? "bg-white" : "bg-slate-50"}`}>
                    <td className="border px-3 py-1.5 text-center font-bold">{r.day}</td>
                    <td className="border px-3 py-1.5">{r.name}</td>
                    <td className="border px-3 py-1.5 text-center">{r.normalShift}</td>
                    <td className="border px-3 py-1.5 text-center font-semibold">{r.status}</td>
                    <td className="border px-3 py-1.5 text-center font-bold">{r.simShift}</td>
                    <td className={`border px-3 py-1.5 text-center font-bold ${r.ot>0 ? 'text-indigo-600' : 'text-slate-400'}`}>{r.ot}</td>
                    <td className="border px-3 py-1.5 text-center font-bold">{r.actualHours}</td>
                    <td className="border px-3 py-1.5 text-slate-700">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="text-[11px] text-slate-500 mt-4 text-center">
        Aplikasi Simulasi Cuti & Lembur | Menggunakan logika penyesuaian shift sesuai lampiran.
      </footer>
    </div>
  );
};

export default SimulasiCutiLemburPage;
