'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { apiService } from "../../../services/apiService";
import { getAllSubordinates } from "../../../lib/utils";
import { RequestType } from "../../../types";

// Konstanta jam kerja
const WORK_HOURS_PER_SHIFT = 8; // Asumsi shift normal 8 jam
const TARGET_MONTHLY_HOURS = 196; // Batas 196 jam/bulan

// Fungsi untuk membuat jadwal kosong 31 hari
const createEmptySchedule = (employeesList = []) => {
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
  const [employees, setEmployees] = useState([]);
  const [nameToId, setNameToId] = useState({});
  const [availableShifts, setAvailableShifts] = useState(shiftOptions);
  const [schedule, setSchedule] = useState({});
  const [replacements, setReplacements] = useState({});
  const [splModalRow, setSplModalRow] = useState(null);
  const [splReason, setSplReason] = useState("");
  const [splSubmitting, setSplSubmitting] = useState(false);

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
  const [cycleStartDay, setCycleStartDay] = useState("");
  const [cycleEndDay, setCycleEndDay] = useState("");

  // State Cuti + Sakit
  const [sickEmployee, setSickEmployee] = useState("ABDULLAH");
  const [sickDay, setSickDay] = useState(18);
  const [useExternal, setUseExternal] = useState(true);

  // State Hasil
  const [result, setResult] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [currentMonth] = useState(new Date());
  const [selectAll, setSelectAll] = useState(false);

  const displayNames = useMemo(() => {
    const selected = new Set();
    employees.forEach((n) => {
      if (replacements[n]) selected.add(n);
    });
    if (leaveEmployee) selected.add(leaveEmployee);
    if (sickEmployee) selected.add(sickEmployee);
    return employees.filter((n) => selected.has(n));
  }, [employees, replacements, leaveEmployee, sickEmployee]);

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
        setEmployees([]);
        setSchedule({});
        setAvailableShifts(shiftOptions);
        setLoadError("Tidak ada bawahan untuk disimulasikan.");
        return;
      }

      const idToUser = new Map(subordinates.map((u) => [u.id, u]));
      const names = subordinates.map((u) => u.full_name);
      const nameIdMap = {};
      subordinates.forEach((u) => { nameIdMap[u.full_name] = u.id; });
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const schedules = subordinates.length > 0
        ? await apiService.getTeamSchedules(
            subordinates.map((u) => u.id),
            formatDate(start),
            formatDate(end)
          )
        : [];

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
      setNameToId(nameIdMap);
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

  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
    return { h, m: m ?? 0 };
  };

  const addHours = (timeObj, hours) => {
    if (!timeObj) return null;
    const totalMinutes = timeObj.h * 60 + timeObj.m + hours * 60;
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const subtractHours = (timeObj, hours) => {
    if (!timeObj) return null;
    const totalMinutes = timeObj.h * 60 + timeObj.m - hours * 60;
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const defaultShiftTimes = {
    "1T13": { start: "07:30", end: "15:30" },
    "2T13": { start: "15:30", end: "22:30" },
    "3T13": { start: "22:30", end: "07:30" },
  };

  const formatOvertimePeriod = (row) => {
    if (!row || row.ot <= 0) return "-";
    const shiftCode = row.simShift && row.simShift !== "-" ? row.simShift : row.normalShift;
    const times = defaultShiftTimes[shiftCode];
    if (!times) return `+${row.ot} jam`;
    const startObj = formatTime(times.start);
    const endObj = formatTime(times.end);
    if (!startObj || !endObj) return `+${row.ot} jam`;

    // Untuk shift malam (3T13) tampilkan periode lembur sebelum shift dimulai (mis. 19:30-22:30)
    if (shiftCode === "3T13") {
      const otStart = subtractHours(startObj, row.ot);
      return otStart ? `${otStart} - ${times.start}` : `-${times.start}`;
    }

    // Default: lembur setelah jam selesai shift
    const otEnd = addHours(endObj, row.ot);
    return otEnd ? `${times.end} - ${otEnd}` : `${times.end} -`;
  };

  const computeOvertimeTimes = (row) => {
    if (!row || row.ot <= 0) return { start: null, end: null };
    const shiftCode = row.simShift && row.simShift !== "-" ? row.simShift : row.normalShift;
    const times = defaultShiftTimes[shiftCode];
    if (!times) return { start: null, end: null };
    const startObj = formatTime(times.start);
    const endObj = formatTime(times.end);
    if (!startObj || !endObj) return { start: null, end: null };

    if (shiftCode === "3T13") {
      const otStart = subtractHours(startObj, row.ot);
      return { start: otStart, end: times.start };
    }
    const otEnd = addHours(endObj, row.ot);
    return { start: times.end, end: otEnd };
  };

  // --- FUNGSI SIMULASI ASLI ---
  const handleCycleDayChange = (value, setter) => {
    if (value === "") {
      setter("");
      return;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    const clamped = Math.max(1, Math.min(31, num));
    setter(String(clamped));
  };

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
              ot = 3;
              note = "Lembur 3 jam untuk membantu menutup kekosongan Shift 2.";
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
    let lastShift3Day = null;

    const startDay = Number(cycleStartDay);
    const endDay = Number(cycleEndDay);
    if (!Number.isFinite(startDay) || !Number.isFinite(endDay) || cycleStartDay === "" || cycleEndDay === "") {
      return { rows: resRows, otSummary };
    }

    for (let d = startDay; d <= endDay; d++) {
      const daySched = schedule[d];
      if (!daySched) continue;
      const leaveShift = daySched[leaveEmployee];
      if (leaveShift === "3T13") lastShift3Day = d;

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
        } else if (leaveShift === "2T13") {
          if (normalShift === "1T13") {
            ot = 3;
            note = "Shift 1 + lembur 3 jam awal Shift 2.";
          } else if (normalShift === "3T13") {
            ot = 3;
            note = "Shift 3 + lembur 3 jam akhir Shift 2.";
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
          const isFirstLeaveDay = d === startDay;
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
              if (normalShift === "1T13") {
                simShift = "1T13";
                ot = 0;
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
          } else {
            note = "Bekerja sesuai shift normal.";
          }
        } else {
          note = "Bekerja sesuai shift normal.";
        }

        const actualHours = status === "BEKERJA" ? WORK_HOURS_PER_SHIFT + ot : 0;
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

    // Penyesuaian hari setelah cuti shift 3 (mengikuti logika simulateShortLeaveLogic)
    const adjustmentDay = (lastShift3Day ?? endDay) + 1;
    const leaveShiftOnLast3 = lastShift3Day ? "3T13" : schedule[endDay]?.[leaveEmployee];
    const adjSched = schedule[adjustmentDay];
    if (adjSched && leaveShiftOnLast3 === "3T13" && (shift3Scenario === "1" || shift3Scenario === "2")) {
      employees.forEach((name) => {
        const normalShift = adjSched[name];
        const isReplacement = replacements[name];
        if (hasSelectedReplacement && !isReplacement && name !== leaveEmployee) {
          resRows.push({
            day: adjustmentDay,
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
        let note = "Hari penyesuaian setelah cuti shift 3.";

        if (shift3Scenario === "1") {
          if (normalShift === "2T13") {
            simShift = "3T13";
            ot = 3;
            note = "Penyesuaian Skenario 1: 3jam+3T13.";
          } else if (normalShift === "1T13") {
            simShift = "1T13";
            ot = 4;
            note = "Penyesuaian Skenario 1: 1T13+4jam.";
          } else if (normalShift === "OFF") {
            simShift = "OFF";
            status = "OFF";
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

        const actualHours = status === "BEKERJA" ? WORK_HOURS_PER_SHIFT + ot : 0;
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
    const selectedNames = new Set(displayNames);

    const filteredRows = simResult.rows.filter((r) => selectedNames.has(r.name));
    const filteredOtSummary = Object.fromEntries(
      Object.entries(simResult.otSummary).filter(([name]) => selectedNames.has(name))
    );

    const totalNormalHours = displayNames.reduce((acc, name) => {
        let total = 0;
        for (let d = 1; d <= 31; d++) {
            if (schedule[d] && schedule[d][name] !== "OFF") {
                total += WORK_HOURS_PER_SHIFT;
            }
        }
        acc[name] = total;
        return acc;
    }, {});

    const monthlyHoursSummary = displayNames.reduce((acc, name) => {
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
        const totalOT = filteredOtSummary[name] ?? 0;
        acc[name] = netNormal + totalOT;
        return acc;
    }, {});

    const breaches = Object.entries(filteredOtSummary)
      .filter(([_, hours]) => hours > otLimit)
      .map(([name, hours]) => ({ name, hours }));
      
    const hoursBreaches = Object.entries(monthlyHoursSummary)
      .filter(([_, hours]) => hours > TARGET_MONTHLY_HOURS)
      .map(([name, hours]) => ({ name, hours }));

    setResult({ rows: filteredRows, otSummary: filteredOtSummary, monthlyHoursSummary, breaches, hoursBreaches });
  }, [employees, schedule, scenarioType, leaveStartDay, leaveEndDay, cycleStartDay, cycleEndDay, sickDay, leaveEmployee, sickEmployee, shift3Scenario, useExternal, otLimit, replacements, displayNames]);

  useEffect(() => {
    if (typeof XLSX === 'undefined') {
      console.warn("Library XLSX tidak terdeteksi.");
    }
  }, []);

  const handleExportExcel = () => {
    if (!result || typeof XLSX === 'undefined') return;
    
    const workbook = XLSX.utils.book_new();
    const summaryData = [
        ["Nama", "Total Lembur (Jam)", "Total Jam Kerja (N+L)", `Batas Jam Normal (${TARGET_MONTHLY_HOURS})`, `Batas Lembur (${otLimit})`, "Status"],
        ...displayNames.map(name => [
            name,
            result.otSummary[name] ?? 0,
            result.monthlyHoursSummary[name] ?? 0,
            (result.monthlyHoursSummary[name] ?? 0) > TARGET_MONTHLY_HOURS ? "LEBIH" : "OK",
            (result.otSummary[name] ?? 0) > otLimit ? "LEBIH" : "OK",
            (result.monthlyHoursSummary[name] ?? 0) > TARGET_MONTHLY_HOURS ? "OVERLOAD" : "AMAN",
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

  const handleCreateSpl = async (row, reasonText) => {
    try {
      setSplSubmitting(true);
      const targetProfileId = nameToId[row.name];
      if (!targetProfileId) {
        alert("Tidak dapat membuat SPL: ID bawahan tidak ditemukan.");
        setSplSubmitting(false);
        return;
      }
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
      const startDate = `${year}-${month}-${String(row.day).padStart(2, "0")}`;
      const prettyDate = `${String(row.day).padStart(2, "0")}-${month}-${year}`;
      const periodeLembur = formatOvertimePeriod(row);
      const { start: otStart, end: otEnd } = computeOvertimeTimes(row);
      const fallbackReason = `Mengganti Sdr. ${leaveEmployee} pada shift ${row.simShift || row.normalShift}, lembur ${row.ot} jam. Periode: ${periodeLembur}. Tanggal: ${prettyDate}.`;
      const requestData = {
        profile_id: targetProfileId,
        request_type: RequestType.LEMBUR,
        start_date: startDate,
        end_date: startDate,
        reason: reasonText || fallbackReason,
        approver_id: user.id,
        start_time: otStart || defaultShiftTimes[row.simShift || row.normalShift]?.start,
        end_time: otEnd || defaultShiftTimes[row.simShift || row.normalShift]?.end,
      };
      await apiService.submitRequest(requestData);
      alert("SPL berhasil diajukan.");
      setSplModalRow(null);
      setSplSubmitting(false);
    } catch (err) {
      setSplSubmitting(false);
      alert("Gagal membuat SPL: " + (err?.message || "unknown error"));
    }
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
        {loadError && <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">{loadError}</div>}
      </section>

      <section className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-4 overflow-hidden">
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
                      <td key={d} className={`border px-0.5 py-0.5 text-center text-[11px] font-semibold ${isLeave ? 'bg-red-100' : isAdj ? 'bg-purple-100' : 'bg-white'}`}>
                        {schedule[d][name]}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-lg p-5 flex flex-col gap-4">
        <h2 className="font-bold text-lg text-indigo-700 border-b pb-2">Parameter Skenario</h2>
        <div className="flex flex-wrap items-end gap-4 text-sm">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <span className="font-medium text-slate-700">Karyawan Cuti</span>
            <select className="border rounded-lg px-3 py-2" value={leaveEmployee} onChange={(e) => setLeaveEmployee(e.target.value)}>
              {employees.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {scenarioType === "shortLeave" && (
            <>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <span className="font-medium text-slate-700">Mulai Cuti</span>
                <input type="number" min={1} max={31} className="border rounded-lg px-3 py-2" value={leaveStartDay} onChange={(e) => setLeaveStartDay(Math.max(1, Math.min(31, Number(e.target.value))))} />
              </div>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <span className="font-medium text-slate-700">Akhir Cuti</span>
                <input type="number" min={1} max={31} className="border rounded-lg px-3 py-2" value={leaveEndDay} onChange={(e) => setLeaveEndDay(Math.max(1, Math.min(31, Number(e.target.value))))} />
              </div>
            </>
          )}

          {scenarioType === "cycleLeave" && (
            <>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <span className="font-medium text-slate-700">Mulai Siklus</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="border rounded-lg px-3 py-2"
                  value={cycleStartDay}
                  onChange={(e) => handleCycleDayChange(e.target.value, setCycleStartDay)}
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <span className="font-medium text-slate-700">Akhir Siklus</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="border rounded-lg px-3 py-2"
                  value={cycleEndDay}
                  onChange={(e) => handleCycleDayChange(e.target.value, setCycleEndDay)}
                />
              </div>
            </>
          )}

          {(scenarioType === "shortLeave" || scenarioType === "cycleLeave") && (
            <div className="flex flex-col gap-1 min-w-[220px] grow">
              <span className="font-medium text-slate-700">Skenario Shift 3 (Jika cuti di 3T13)</span>
              <select className="border rounded-lg px-3 py-2" value={shift3Scenario} onChange={(e) => setShift3Scenario(e.target.value)}>
                <option value="1">Skenario 1 (Standard)</option>
                <option value="2">Skenario 2 (Off -&gt; 3T13)</option>
              </select>
            </div>
          )}

          {scenarioType === "leavePlusSick" && (
            <>
              <div className="flex flex-col gap-1 min-w-[180px]">
                <span className="font-medium text-slate-700">Karyawan Sakit</span>
                <select className="border rounded-lg px-3 py-2" value={sickEmployee} onChange={(e) => setSickEmployee(e.target.value)}>
                  {employees.filter(e => e !== leaveEmployee).map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <span className="font-medium text-slate-700">Hari Sakit</span>
                <input type="number" min={1} max={31} className="border rounded-lg px-3 py-2" value={sickDay} onChange={(e) => setSickDay(Number(e.target.value))} />
              </div>
              <label className="flex items-center gap-2 min-w-[180px]">
                <input type="checkbox" checked={useExternal} onChange={(e) => setUseExternal(e.target.checked)} />
                <span className="text-sm text-slate-700">Gunakan External</span>
              </label>
            </>
          )}

          <div className="flex-1 min-w-[200px]">
            <button onClick={runSimulation} className="w-full px-6 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition transform hover:scale-[1.01]">
              Jalankan Simulasi
            </button>
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
            {displayNames.map((name) => (
              <div key={name} className={`border rounded-xl p-3 flex flex-col gap-1 ${result.otSummary[name]>otLimit ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                <div className="font-bold text-sm text-slate-800">{name}</div>
                <div>Total Lembur: <span className="font-bold">{result.otSummary[name] ?? 0} jam</span></div>
                <div>Total Jam Kerja: <span className="font-bold">{result.monthlyHoursSummary[name] ?? 0} jam</span></div>
                {(result.otSummary[name] ?? 0) > otLimit && <div className="text-red-600 font-bold mt-1">Over Lembur ({otLimit})</div>}
                {(result.monthlyHoursSummary[name] ?? 0) > TARGET_MONTHLY_HOURS && <div className="text-orange-600 font-bold">Over Jam Bulanan ({TARGET_MONTHLY_HOURS})</div>}
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
                  <th className="border px-3 py-2">Periode Lembur</th>
                  <th className="border px-3 py-2 text-center">Buat SPL</th>
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
                    <td className="border px-3 py-1.5 text-center font-bold">{formatOvertimePeriod(r)}</td>
                    <td className="border px-3 py-1.5 text-center">
                      {r.ot > 0 ? (
                        <button
                          onClick={() => {
                            setSplModalRow(r);
                            setSplReason(`Mengganti Sdr. ${leaveEmployee} (Cuti): shift menjadi ${r.simShift || r.normalShift}, + lembur ${r.ot} jam.`);
                          }}
                          className="px-3 py-1 text-[11px] bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 border border-emerald-200"
                        >
                          SPL
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>
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

      {splModalRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-800">Terbitkan SPL</h4>
              <button onClick={() => { if (!splSubmitting) { setSplModalRow(null); } }} className="text-slate-500 hover:text-slate-700 text-sm">✕</button>
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <div><span className="font-semibold">Nama:</span> {splModalRow.name}</div>
              <div><span className="font-semibold">Hari:</span> {`${String(splModalRow.day).padStart(2, "0")}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${currentMonth.getFullYear()}`}</div>
              <div><span className="font-semibold">Shift:</span> {splModalRow.simShift || splModalRow.normalShift}</div>
              <div><span className="font-semibold">Lembur:</span> {splModalRow.ot} jam</div>
              <div><span className="font-semibold">Periode Lembur:</span> {formatOvertimePeriod(splModalRow)}</div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700">Catatan/Alasan SPL</label>
              <textarea
                className="border rounded-lg px-3 py-2 text-sm min-h-[90px]"
                value={splReason}
                onChange={(e) => setSplReason(e.target.value)}
                disabled={splSubmitting}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { if (!splSubmitting) { setSplModalRow(null); } }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
                disabled={splSubmitting}
              >
                Batal
              </button>
              <button
                onClick={() => handleCreateSpl(splModalRow, splReason)}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                disabled={splSubmitting}
              >
                {splSubmitting ? "Memproses..." : "Terbitkan SPL"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulasiCutiLemburPage;
