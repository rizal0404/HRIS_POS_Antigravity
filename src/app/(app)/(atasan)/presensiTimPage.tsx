"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { UserProfile, Attendance, JadwalKerjaTim, Shift, UserRole } from '@/types';
import { apiService } from '@/services/apiService';
import { getAllSubordinates, APP_TIME_ZONE, getStartOfDayISO, getEndOfDayISO, formatDateKey } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon, RefreshIcon } from '@/components/icons';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import DetailAbsensiModal from '@/components/modals/DetailAbsensiModal';

interface PresensiTimPageProps {
    user: UserProfile;
}

const PresensiTimPage: React.FC<PresensiTimPageProps> = ({ user }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonthView, setCurrentMonthView] = useState(new Date());

    const [usersToDisplay, setUsersToDisplay] = useState<UserProfile[]>([]);
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [scheduleData, setScheduleData] = useState<JadwalKerjaTim[]>([]);
    const [allShifts, setAllShifts] = useState<Shift[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedDetailData, setSelectedDetailData] = useState<{ user: UserProfile; attendance: Attendance; schedule?: JadwalKerjaTim; } | null>(null);

    const activeDateRef = useRef<HTMLButtonElement>(null);

    // Initial data fetch (all users, all shifts)
    const fetchInitialData = useCallback(async () => {
        try {
            const [users, shifts] = await Promise.all([
                apiService.getProfiles(),
                apiService.getShifts(),
            ]);

            let employees: UserProfile[];
            if (user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN) {
                employees = users;
            } else if (user.isManager) {
                const subordinates = getAllSubordinates(user.id, users);
                employees = [user, ...subordinates];
            } else {
                employees = [user];
            }

            setUsersToDisplay(employees);
            setAllShifts(shifts);
        } catch (err) {
            setError("Gagal memuat data awal.");
        }
    }, [user]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Fetch attendance and schedule for selected date
    const fetchDataForDate = useCallback(async () => {
        if (usersToDisplay.length === 0) {
            setLoading(false);
            return;
        }

        setRefreshing(true);
        setError(null);

        const startOfDay = getStartOfDayISO(selectedDate, APP_TIME_ZONE);
        const endOfDay = getEndOfDayISO(selectedDate, APP_TIME_ZONE);
        const dateStr = formatDateKey(selectedDate, APP_TIME_ZONE);

        const userIds = usersToDisplay.map(u => u.id);

        try {
            const [attendance, schedules, substitutions] = await Promise.all([
                apiService.getAttendanceForSubordinates(userIds, startOfDay, endOfDay),
                apiService.getTeamSchedules(userIds, dateStr, dateStr),
                apiService.getApprovedSubstitutionRequests(userIds, dateStr, dateStr),
            ]);

            const shiftMap = new Map<string, Shift>(allShifts.map(s => [s.code, s]));
            const scheduleMap = new Map<string, JadwalKerjaTim>();
            schedules.forEach(s => scheduleMap.set(s.profile_id, { ...s }));

            substitutions.forEach(req => {
                let newShiftCode = '';
                try {
                    const parsed = JSON.parse(req.reason);
                    newShiftCode = parsed?.shift_baru?.code || parsed?.shift_baru || '';
                } catch (e) {
                    // ignore malformed payloads
                }
                if (!newShiftCode) return;
                const meta = shiftMap.get(newShiftCode);
                const key = req.profile_id;
                const existing = scheduleMap.get(key) || { profile_id: req.profile_id, date: dateStr, shift: '', start_time: undefined, end_time: undefined } as JadwalKerjaTim;
                scheduleMap.set(key, {
                    ...existing,
                    date: dateStr,
                    shift: newShiftCode,
                    start_time: meta?.start_time ?? existing.start_time,
                    end_time: meta?.end_time ?? existing.end_time,
                });
            });

            setAttendanceData(attendance);
            setScheduleData(Array.from(scheduleMap.values()));
        } catch (err) {
            setError("Gagal memuat data presensi dan jadwal.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate, usersToDisplay, allShifts]);

    useEffect(() => {
        fetchDataForDate();
    }, [fetchDataForDate]);

    // Scroll to active date
    useEffect(() => {
        if (activeDateRef.current) {
            activeDateRef.current.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    }, [currentMonthView]);

    const handlePrevMonth = () => {
        setCurrentMonthView(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonthView(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleRowClick = (item: { user: UserProfile; attendance?: Attendance; schedule?: JadwalKerjaTim; }) => {
        if (item.attendance) {
            setSelectedDetailData({ user: item.user, attendance: item.attendance, schedule: item.schedule });
            setIsDetailModalOpen(true);
        }
    };

    const calendarHeaderData = useMemo(() => {
        const year = currentMonthView.getFullYear();
        const month = currentMonthView.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            days.push({
                date: i,
                dayName: dateObj.toLocaleDateString('id-ID', { weekday: 'short' }),
                fullDate: dateObj,
            });
        }
        return days;
    }, [currentMonthView]);

    const attendanceList = useMemo(() => {
        const scheduleMap = new Map(scheduleData.map(s => [s.profile_id, s]));
        const attendanceMap = new Map(attendanceData.map(a => [a.profile_id, a]));

        return usersToDisplay.map(u => ({
            user: u,
            schedule: scheduleMap.get(u.id),
            attendance: attendanceMap.get(u.id),
        })).sort((a, b) => a.user.full_name.localeCompare(b.user.full_name));
    }, [usersToDisplay, scheduleData, attendanceData]);

    // Summary statistics
    const stats = useMemo(() => {
        const total = attendanceList.length;
        const hadir = attendanceList.filter(item => item.attendance?.clock_in).length;
        const belumHadir = total - hadir;
        const sudahPulang = attendanceList.filter(item => item.attendance?.clock_out).length;
        return { total, hadir, belumHadir, sudahPulang };
    }, [attendanceList]);

    const getShiftBadge = (shiftCode: string) => {
        if (shiftCode === 'OFF' || !shiftCode) {
            return <Badge variant="secondary">OFF</Badge>;
        }
        const shift = allShifts.find(s => s.code === shiftCode);
        if (shift?.work_day_type === 'shift') {
            return <Badge variant="info">{shiftCode}</Badge>;
        }
        return <Badge variant="warning">{shiftCode}</Badge>;
    };

    if (loading && usersToDisplay.length === 0) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Spinner /> <span className="ml-2 text-text-secondary font-medium">Memuat Data Presensi...</span>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
                {/* Header Section */}
                <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">Presensi Tim</h2>
                        <p className="text-xs text-slate-500">Pantau kehadiran tim Anda secara real-time</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchDataForDate}
                            disabled={refreshing}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        >
                            {refreshing ? <Spinner className="w-5 h-5" /> : <RefreshIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Month Navigator & Date Picker */}
                        <Card className="p-4">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={handlePrevMonth}
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                </button>
                                <h3 className="font-bold text-slate-800 dark:text-white">
                                    {currentMonthView.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                </h3>
                                <button
                                    onClick={handleNextMonth}
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                                >
                                    <ChevronRightIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Date Scroller */}
                            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
                                {calendarHeaderData.map(day => {
                                    const isSelected = day.fullDate.toDateString() === selectedDate.toDateString();
                                    const isToday = day.fullDate.toDateString() === new Date().toDateString();
                                    return (
                                        <button
                                            key={day.date}
                                            ref={isSelected ? activeDateRef : null}
                                            onClick={() => setSelectedDate(day.fullDate)}
                                            className={`flex-shrink-0 w-12 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 border-2
                                                ${isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105'
                                                    : isToday
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                                                }`}
                                        >
                                            <span className="text-[10px] font-medium uppercase">{day.dayName}</span>
                                            <span className="font-bold text-lg">{day.date}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Card className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Total Tim</p>
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</span>
                                    </div>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                        <span className="material-symbols-outlined text-slate-500 text-[20px]">group</span>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Hadir</p>
                                        <span className="text-2xl font-black text-green-600">{stats.hadir}</span>
                                    </div>
                                    <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-xl">
                                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Belum Hadir</p>
                                        <span className="text-2xl font-black text-orange-600">{stats.belumHadir}</span>
                                    </div>
                                    <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                                        <span className="material-symbols-outlined text-orange-500 text-[20px]">pending</span>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Sudah Pulang</p>
                                        <span className="text-2xl font-black text-blue-600">{stats.sudahPulang}</span>
                                    </div>
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                        <span className="material-symbols-outlined text-blue-500 text-[20px]">logout</span>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Attendance List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-600 text-[20px]">schedule</span>
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                                        {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h3>
                                </div>
                                <span className="text-xs text-slate-500">{attendanceList.length} karyawan</span>
                            </div>

                            <Card className="overflow-hidden">
                                {error ? (
                                    <div className="p-8 text-center text-red-500">
                                        <span className="material-symbols-outlined text-4xl mb-2">error</span>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                ) : attendanceList.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-2">group_off</span>
                                        <p className="text-sm">Tidak ada data untuk ditampilkan.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Karyawan</th>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Shift</th>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Lokasi</th>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-center">Masuk</th>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-center">Pulang</th>
                                                    <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                {attendanceList.map((item) => {
                                                    const { user: employee, schedule, attendance } = item;
                                                    const shiftCode = schedule?.shift || 'OFF';
                                                    const clockInTime = attendance?.clock_in ? new Date(attendance.clock_in) : null;
                                                    const clockOutTime = attendance?.clock_out ? new Date(attendance.clock_out) : null;

                                                    // Determine status
                                                    let statusBadge;
                                                    if (shiftCode === 'OFF') {
                                                        statusBadge = <Badge variant="secondary">Libur</Badge>;
                                                    } else if (clockOutTime) {
                                                        statusBadge = <Badge variant="success">Selesai</Badge>;
                                                    } else if (clockInTime) {
                                                        statusBadge = <Badge variant="info">Bekerja</Badge>;
                                                    } else {
                                                        statusBadge = <Badge variant="warning">Belum Hadir</Badge>;
                                                    }

                                                    return (
                                                        <tr
                                                            key={employee.id}
                                                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${attendance ? 'cursor-pointer' : ''}`}
                                                            onClick={() => handleRowClick(item)}
                                                        >
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden flex-shrink-0">
                                                                        {employee.avatar_url ? (
                                                                            <img src={employee.avatar_url} alt={employee.full_name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                                                {employee.full_name.charAt(0)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{employee.full_name}</p>
                                                                        <p className="text-[10px] text-slate-400">{employee.nik || employee.id.slice(0, 8)}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {getShiftBadge(shiftCode)}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <p className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                                                                    {attendance?.lokasi_kerja || '-'}
                                                                </p>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {clockInTime ? (
                                                                    <span className="font-mono text-sm font-bold text-green-600">
                                                                        {clockInTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: APP_TIME_ZONE })}
                                                                    </span>
                                                                ) : (
                                                                    <span className="font-mono text-sm text-slate-300 dark:text-slate-600">--:--</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {clockOutTime ? (
                                                                    <span className="font-mono text-sm font-bold text-blue-600">
                                                                        {clockOutTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: APP_TIME_ZONE })}
                                                                    </span>
                                                                ) : (
                                                                    <span className="font-mono text-sm text-slate-300 dark:text-slate-600">--:--</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {statusBadge}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {selectedDetailData && (
                <DetailAbsensiModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    attendance={selectedDetailData.attendance}
                    user={selectedDetailData.user}
                    schedule={selectedDetailData.schedule}
                />
            )}
        </>
    );
};

export default PresensiTimPage;
