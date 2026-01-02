"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { UserProfile, JadwalKerjaTim, Shift, Holiday } from '../../types';
import { apiService } from '../../services/apiService';
import { getAllSubordinates } from '../../lib/utils';
import EditShiftModal from '../modals/EditShiftModal';

interface ModernJadwalViewProps {
    user: UserProfile;
    mode: 'team' | 'colleagues' | 'all';
    forceEdit?: boolean;
}

const COLOR_MAP: Record<string, string> = {
    'bg-gray-500': '#6b7280',
    'bg-red-600': '#dc2626',
    'bg-orange-500': '#f97316',
    'bg-yellow-500': '#eab308',
    'bg-green-500': '#22c55e',
    'bg-teal-500': '#14b8a6',
    'bg-blue-600': '#2563eb',
    'bg-indigo-600': '#4f46e5',
    'bg-purple-600': '#9333ea',
    'bg-pink-600': '#db2777',
    'bg-gray-800': '#1f2937',
};

// Indonesian day names mapping
const DAY_NAMES_ID: Record<string, string> = {
    'Sun': 'Ming',
    'Mon': 'Sen',
    'Tue': 'Sel',
    'Wed': 'Rab',
    'Thu': 'Kam',
    'Fri': 'Jum',
    'Sat': 'Sab',
};

// Indonesian month names
const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ModernJadwalView: React.FC<ModernJadwalViewProps> = ({ user, mode, forceEdit }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [teamScheduleData, setTeamScheduleData] = useState<Record<string, JadwalKerjaTim[]>>({});
    const [allShifts, setAllShifts] = useState<Shift[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [usersToDisplay, setUsersToDisplay] = useState<UserProfile[]>([]);

    // Ref for scrollable container
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const todayColumnRef = useRef<HTMLDivElement>(null);

    // Modal state
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedShiftData, setSelectedShiftData] = useState<{
        employee: UserProfile;
        date: string;
        shiftCode: string;
    } | null>(null);

    const canEdit = mode === 'team' || !!forceEdit;

    const fetchData = useCallback(async (date: Date) => {
        setLoading(true);
        try {
            const [users, shifts, holidayData] = await Promise.all([
                apiService.getProfiles(),
                apiService.getShifts(),
                apiService.getHolidays()
            ]);
            setAllUsers(users);
            setAllShifts(shifts);
            setHolidays(holidayData);

            let filteredUsers: UserProfile[];
            if (mode === 'colleagues') {
                filteredUsers = user.manager_id
                    ? users.filter(u => u.manager_id === user.manager_id)
                    : [user];
            } else if (mode === 'all') {
                filteredUsers = users;
            } else {
                filteredUsers = getAllSubordinates(user.id, users);
            }
            setUsersToDisplay(filteredUsers);

            const userIds = filteredUsers.map(u => u.id);
            if (userIds.length > 0) {
                const year = date.getFullYear();
                const month = date.getMonth();
                const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                const endDateObj = new Date(year, month + 1, 0);
                const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

                const schedules = await apiService.getTeamSchedules(userIds, startDate, endDate);
                const schedulesByUser: Record<string, JadwalKerjaTim[]> = {};
                schedules.forEach(s => {
                    if (!schedulesByUser[s.profile_id]) schedulesByUser[s.profile_id] = [];
                    schedulesByUser[s.profile_id].push(s);
                });
                setTeamScheduleData(schedulesByUser);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    }, [user.id, mode]);

    useEffect(() => {
        fetchData(currentDate);
    }, [fetchData, currentDate]);

    // Auto-scroll to today's column when data is loaded
    useEffect(() => {
        if (!loading && todayColumnRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const todayColumn = todayColumnRef.current;

            // Calculate scroll position to show today column next to employee column
            // The employee column is 176px (w-44), so we scroll to position today column right after it
            const scrollLeft = todayColumn.offsetLeft - 8; // 8px for some padding

            container.scrollTo({
                left: scrollLeft,
                behavior: 'smooth'
            });
        }
    }, [loading, currentDate]);

    const monthDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayNameEn = date.toLocaleDateString('en-US', { weekday: 'short' });
            days.push({
                date: i,
                dayName: DAY_NAMES_ID[dayNameEn] || dayNameEn,
                fullDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
                isToday: date.getTime() === today.getTime()
            });
        }
        return days;
    }, [currentDate]);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const handleCellClick = (employee: UserProfile, date: string, shiftCode: string) => {
        if (!canEdit) return;
        setSelectedShiftData({ employee, date, shiftCode });
        setEditModalOpen(true);
    };

    const handleUpdateShift = async (employeeId: string, date: string, newShift: Shift) => {
        try {
            await apiService.updateWorkSchedule(employeeId, date, newShift.code);
            fetchData(currentDate);
        } catch (error) {
            console.error("Failed to update shift:", error);
        } finally {
            setEditModalOpen(false);
        }
    };

    const handleDownloadTemplate = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Header row
        const header = ['User ID', 'Nama Karyawan'];
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            header.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        }

        // Data rows
        const data = usersToDisplay.map(employee => {
            const row = [employee.id, employee.full_name];
            const schedule = teamScheduleData[employee.id] || [];
            const scheduleMap = new Map<string, string>(schedule.map(s => [s.date, s.shift]));

            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                row.push(scheduleMap.get(dateStr) || 'OFF');
            }
            return row;
        });

        const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Jadwal Shift");
        XLSX.writeFile(wb, `Jadwal_Shift_${MONTH_NAMES_ID[month]}_${year}.xlsx`);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                if (data.length < 2) {
                    alert('File kosong atau format salah');
                    return;
                }

                // Extract dates from header (row 0), skipping first 2 columns (ID, Name)
                const headerRow = data[0];
                const dates = headerRow.slice(2);

                const updates: { profile_id: string; date: string; shift_code: string }[] = [];

                // Process data rows
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    const userId = row[0];
                    if (!userId) continue;

                    for (let j = 0; j < dates.length; j++) {
                        const date = dates[j];
                        const shiftCode = row[j + 2];
                        if (date && shiftCode) {
                            // Basic validation to ensure shift code exists within allShifts could be added here
                            // For now assuming user inputs valid codes or 'OFF'
                            updates.push({
                                profile_id: userId,
                                date: String(date).trim(),
                                shift_code: String(shiftCode).trim()
                            });
                        }
                    }
                }

                if (updates.length > 0) {
                    setLoading(true);
                    await apiService.bulkUpdateWorkSchedules(updates);
                    await fetchData(currentDate);
                    alert('Jadwal berhasil diperbarui!');
                }
            } catch (error) {
                console.error("Error processing file:", error);
                alert('Gagal memproses file. Pastikan format sesuai.');
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleContinueSchedule = async () => {
        if (!confirm(`Apakah Anda yakin ingin melanjutkan pola shift dari bulan sebelumnya ke ${MONTH_NAMES_ID[currentDate.getMonth()]} ${currentDate.getFullYear()}? Jadwal yang sudah ada di bulan ini akan tertimpa.`)) {
            return;
        }

        setLoading(true);
        try {
            // 1. Determine Previous Month Range
            const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const prevYear = prevDate.getFullYear();
            const prevMonth = prevDate.getMonth();
            const prevDaysInMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

            const prevStartDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
            const prevEndDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDaysInMonth).padStart(2, '0')}`;

            // 2. Fetch Previous Month Data
            const userIds = usersToDisplay.map(u => u.id);
            if (userIds.length === 0) {
                setLoading(false);
                return;
            }

            const prevSchedules = await apiService.getTeamSchedules(userIds, prevStartDate, prevEndDate);

            // Organize by User
            const prevSchedulesByUser: Record<string, JadwalKerjaTim[]> = {};
            prevSchedules.forEach(s => {
                if (!prevSchedulesByUser[s.profile_id]) prevSchedulesByUser[s.profile_id] = [];
                prevSchedulesByUser[s.profile_id].push(s);
            });

            // 3. Calculate New Month Shifts
            const newUpdates: { profile_id: string; date: string; shift_code: string }[] = [];
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // Prepare Map for Previous Month: DateStr -> ShiftCode
            // To detect pattern efficiently

            usersToDisplay.forEach(user => {
                const userPrevShifts = prevSchedulesByUser[user.id] || [];
                if (userPrevShifts.length === 0) return; // No history, skip

                // Map Date -> Shift Code
                // We also need numerical day index (1..DaysInPrevMonth)
                const shiftMap: Record<number, string> = {};
                userPrevShifts.forEach(s => {
                    const d = new Date(s.date).getDate();
                    shiftMap[d] = s.shift;
                });

                // Detect Pattern
                // Try periods P = 1 to 8. Preferred small P if strong match? 
                // We check the LAST 14 days of previous month for consistency.
                const checkDays = 14;
                let bestPeriod = 7; // Default to weekly
                let bestScore = -1;

                // Heuristic: Check periods 
                for (let p = 1; p <= 8; p++) {
                    let matchCount = 0;
                    let checkCount = 0;

                    // Check backwards from end of month
                    for (let d = prevDaysInMonth; d > prevDaysInMonth - checkDays && d > p; d--) {
                        const sCurrent = shiftMap[d];
                        const sPrev = shiftMap[d - p];
                        if (sCurrent && sPrev) {
                            checkCount++;
                            if (sCurrent === sPrev) matchCount++;
                        }
                    }

                    if (checkCount > 3) { // Min data to establish pattern
                        const score = matchCount / checkCount;
                        if (score > 0.9 && score > bestScore) { // Allow minor variations but prefer exact
                            bestScore = score;
                            bestPeriod = p;
                        }
                    }
                }

                // If no strong short cycle found, stick to P=7 (Weekly)
                const P = bestPeriod;

                // Generate for current month
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(year, month, day);
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                    // Logic to project:
                    // Find a reference date in prev month such that (RefDate + k*P) = NewDate
                    // Or simply: Shift[NewDate] = Shift[PrevDateOfSamePatternIndex]

                    // Let's use the END of prev month as anchor
                    // Days elapsed since PrevMonthEnd = day (since NewMonth starts at day 1, which is PrevEnd+1)
                    // Wait, simple math:
                    // Total days from PrevMonth Day 1 to NewMonth Day X?
                    // Let's map everything to a continuous index?
                    // Simpler: 
                    // Ref Day in Prev Month = PrevDaysInMonth - ( (DaysSincePrevMonthEnd - 1) % P ) ? No.

                    // Continuos Pattern:
                    // If pattern is P days long.
                    // The shift at NewDate should be same as shift at (NewDate - k*P) where (NewDate - k*P) is inside PrevMonth.

                    // We need to find `k` such that `NewDate - k*P` falls within `[PrevStartDate, PrevEndDate]`
                    // But we only care about the Cyclic Index.
                    // Let last day of prev month range be `RefIndex = prevDaysInMonth`.
                    // The `day` of new month is essentially `RefIndex + day`.
                    // We want shift at `(RefIndex + day)`
                    // Assuming cyclic: `Shift[x] == Shift[x - P]`
                    // So `Shift[RefIndex + day] == Shift[RefIndex + day - m*P]`
                    // We reduce `RefIndex + day` by P until it is <= prevDaysInMonth.

                    let targetPrevDay = prevDaysInMonth + day;
                    while (targetPrevDay > prevDaysInMonth) {
                        targetPrevDay -= P;
                    }

                    // Special Handling for P=7 (Weekly) to matches Day of Week exactly if disjoint?
                    // Actually P=7 logic above (modulo based) ensures Monday maps to Monday IF contiguous.
                    // But if P=7 specifically, user expects "Monday is Shift A".
                    // The modulo logic preserves this only if P=7.

                    const shiftCode = shiftMap[targetPrevDay];
                    if (shiftCode) {
                        newUpdates.push({
                            profile_id: user.id,
                            date: dateStr,
                            shift_code: shiftCode
                        });
                    }
                }
            });

            if (newUpdates.length > 0) {
                await apiService.bulkUpdateWorkSchedules(newUpdates);
                await fetchData(currentDate);
                alert(`Jadwal berhasil dibuat! Pola yang terdeteksi diterapkan.`);
            } else {
                alert('Tidak ada data jadwal bulan sebelumnya untuk dilanjutkan.');
            }

        } catch (error) {
            console.error("Failed to continue schedule:", error);
            alert('Gagal melanjutkan jadwal.');
        } finally {
            setLoading(false);
        }
    };

    // Format month in Indonesian
    const formattedMonth = `${MONTH_NAMES_ID[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header Section */}
            <header className="flex h-20 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 shrink-0 z-10">
                <div className="flex items-center gap-6">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Jadwal Shift</h2>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm text-slate-600 dark:text-slate-300">
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        <span className="px-4 text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[140px] text-center">
                            {formattedMonth}
                        </span>
                        <button onClick={handleNextMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm text-slate-600 dark:text-slate-300">
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {(mode === 'team' || forceEdit) && (
                        <button className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span>Atur Shift</span>
                        </button>
                    )}
                    {(mode === 'team' || forceEdit) && (
                        <>
                            <button
                                onClick={handleDownloadTemplate}
                                className="flex h-10 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-bold text-white shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all"
                                title="Download Template Excel"
                            >
                                <span className="material-symbols-outlined text-[20px]">download</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleUploadTemplate}
                                className="hidden"
                                accept=".xlsx, .xls"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                                title="Upload Template Excel"
                            >
                                <span className="material-symbols-outlined text-[20px]">upload</span>
                            </button>
                            <button
                                onClick={handleContinueSchedule}
                                className="flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-sm font-bold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-700 transition-all"
                                title="Lanjutkan pola dari bulan lalu"
                            >
                                <span className="material-symbols-outlined text-[20px]">update</span>
                                <span className="hidden md:inline">Lanjut Jadwal</span>
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden p-6">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent shadow-lg"></div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-full flex flex-col">
                        {/* Table Container with frozen column */}
                        <div className="flex-1 overflow-hidden flex">
                            {/* Frozen Employee Column */}
                            <div className="w-44 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
                                {/* Header */}
                                <div className="px-3 py-4 font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 h-[72px] flex items-center">
                                    Karyawan
                                </div>
                                {/* Employee List */}
                                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {usersToDisplay.map(employee => (
                                        <div key={employee.id} className="px-2 py-3 flex items-center gap-2 h-24 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <div className="relative flex-shrink-0">
                                                <div className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold border-2 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                                    {employee.avatar_url ? (
                                                        <img src={employee.avatar_url} alt={employee.full_name} className="size-full object-cover" />
                                                    ) : (
                                                        employee.full_name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"></div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight mb-0.5 capitalize">
                                                    {employee.full_name}
                                                </p>
                                                <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 truncate uppercase tracking-tight">
                                                    {employee.position || 'Staff'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scrollable Schedule Area */}
                            <div ref={scrollContainerRef} className="flex-1 overflow-auto scrollbar-hide">
                                {/* Header Row */}
                                <div className="flex sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                                    {monthDays.map((day, index) => (
                                        <div
                                            key={day.fullDate}
                                            ref={day.isToday ? todayColumnRef : undefined}
                                            className={`min-w-[100px] w-[100px] flex flex-col items-center justify-center py-4 border-r border-slate-200 dark:border-slate-800 last:border-r-0 h-[72px] ${day.isToday ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-slate-50 dark:bg-slate-800'}`}
                                        >
                                            <span className={`text-[11px] uppercase font-black mb-1 tracking-tighter ${day.isToday ? 'text-orange-600' : 'text-slate-400'}`}>
                                                {day.dayName}
                                            </span>
                                            <span className={`text-base font-black ${day.isToday ? 'text-orange-600' : 'text-slate-900 dark:text-white'}`}>
                                                {String(day.date).padStart(2, '0')}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Schedule Rows */}
                                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {usersToDisplay.map(employee => {
                                        const schedule = teamScheduleData[employee.id] || [];
                                        const scheduleMap = new Map<string, JadwalKerjaTim>(schedule.map(s => [s.date, s]));

                                        return (
                                            <div key={employee.id} className="flex hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                                {monthDays.map(day => {
                                                    const daySchedule = scheduleMap.get(day.fullDate);
                                                    const shiftDetail = allShifts.find(s => s.code === daySchedule?.shift);
                                                    const rawColor = shiftDetail?.color || '';
                                                    const hexColor = rawColor.startsWith('#') ? rawColor : (COLOR_MAP[rawColor] || '#f97316');

                                                    return (
                                                        <div
                                                            key={`${employee.id}-${day.fullDate}`}
                                                            className={`min-w-[100px] w-[100px] border-r border-slate-100 dark:border-slate-800 p-2 flex items-center justify-center h-24 last:border-r-0 ${day.isToday ? 'bg-orange-500/5' : ''}`}
                                                            onClick={() => handleCellClick(employee, day.fullDate, daySchedule?.shift || 'OFF')}
                                                        >
                                                            {daySchedule ? (
                                                                <div
                                                                    className="w-full h-full rounded-xl flex flex-col justify-center items-center p-2 text-center shadow-sm border-2 transition-transform active:scale-95 group-hover:shadow-md cursor-pointer"
                                                                    style={{
                                                                        backgroundColor: `${hexColor}20`,
                                                                        borderColor: `${hexColor}40`,
                                                                    }}
                                                                >
                                                                    <span
                                                                        className="text-[10px] font-black uppercase tracking-widest truncate w-full mb-1"
                                                                        style={{ color: hexColor }}
                                                                    >
                                                                        {shiftDetail?.name || daySchedule.shift}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white/30 dark:bg-black/10 px-1.5 py-0.5 rounded-md">
                                                                        {daySchedule.start_time?.slice(0, 5) || '??'} - {daySchedule.end_time?.slice(0, 5) || '??'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className={`p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 size-full flex items-center justify-center transition-all ${canEdit ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 cursor-pointer opacity-0 group-hover:opacity-100' : 'opacity-10 grayscale'}`}>
                                                                    <span className="material-symbols-outlined text-slate-300">add</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {canEdit && selectedShiftData && (
                <EditShiftModal
                    isOpen={isEditModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    onSave={handleUpdateShift}
                    employee={selectedShiftData.employee}
                    date={selectedShiftData.date}
                    currentShiftCode={selectedShiftData.shiftCode}
                    allShifts={allShifts}
                />
            )}
        </div>
    );
};

export default ModernJadwalView;
