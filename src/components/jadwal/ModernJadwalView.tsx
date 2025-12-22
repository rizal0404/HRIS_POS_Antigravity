"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { UserProfile, JadwalKerjaTim, Shift, Holiday } from '../../types';
import { apiService } from '../../services/apiService';
import { getAllSubordinates } from '../../lib/utils';
import EditShiftModal from '../modals/EditShiftModal';

interface ModernJadwalViewProps {
    user: UserProfile;
    mode: 'team' | 'colleagues' | 'all';
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

const ModernJadwalView: React.FC<ModernJadwalViewProps> = ({ user, mode }) => {
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

    const canEdit = mode === 'team';

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
            // The employee column is 256px (w-64), so we scroll to position today column right after it
            const scrollLeft = todayColumn.offsetLeft - 16; // 16px for some padding

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
                    {mode === 'team' && (
                        <button className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span>Atur Shift</span>
                        </button>
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
                            <div className="w-64 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
                                {/* Header */}
                                <div className="p-5 font-bold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 h-[72px] flex items-center">
                                    Karyawan
                                </div>
                                {/* Employee List */}
                                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {usersToDisplay.map(employee => (
                                        <div key={employee.id} className="p-5 flex items-center gap-4 h-24 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <div className="relative">
                                                <div className="size-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold border-2 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                                    {employee.avatar_url ? (
                                                        <img src={employee.avatar_url} alt={employee.full_name} className="size-full object-cover" />
                                                    ) : (
                                                        employee.full_name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"></div>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900 dark:text-white truncate leading-none mb-1 capitalize">
                                                    {employee.full_name}
                                                </p>
                                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate uppercase tracking-tight">
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
