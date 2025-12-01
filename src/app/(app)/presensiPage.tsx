"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { UserProfile, Attendance, JadwalKerjaTim, Shift, UserRole } from '@/types';
import { apiService } from '@/services/apiService';
import { getAllSubordinates } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@/components/icons';
import Spinner from '@/components/ui/Spinner';
import DetailAbsensiModal from '@/components/modals/DetailAbsensiModal';

interface PresensiPageProps {
  user: UserProfile;
}

const PresensiPage: React.FC<PresensiPageProps> = ({ user }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonthView, setCurrentMonthView] = useState(new Date());
    
    const [usersToDisplay, setUsersToDisplay] = useState<UserProfile[]>([]);
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [scheduleData, setScheduleData] = useState<JadwalKerjaTim[]>([]);
    const [allShifts, setAllShifts] = useState<Shift[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedDetailData, setSelectedDetailData] = useState<{ user: UserProfile; attendance: Attendance; schedule?: JadwalKerjaTim; } | null>(null);

    const activeDateRef = useRef<HTMLButtonElement>(null);

    // Initial data fetch (all users, all shifts)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [users, shifts] = await Promise.all([
                    apiService.getProfiles(),
                    apiService.getShifts(),
                ]);

                let employees: UserProfile[];
                if (user.role === UserRole.SUPERADMIN) {
                    employees = users;
                } else if (user.isManager) {
                    const subordinates = getAllSubordinates(user.id, users);
                    employees = [user, ...subordinates]; // Manager can see their own attendance too
                } else {
                    employees = [user];
                }
                
                setUsersToDisplay(employees);
                setAllShifts(shifts);

            } catch (err) {
                setError("Gagal memuat data awal.");
            }
        };
        fetchInitialData();
    }, [user]);

    // Fetch attendance and schedule for selected date and users
    useEffect(() => {
        if (usersToDisplay.length === 0) {
            setLoading(false);
            return;
        }

        const fetchDataForDate = async () => {
            setLoading(true);
            setError(null);

            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const day = selectedDate.getDate();

            const startOfDay = new Date(year, month, day, 0, 0, 0, 0).toISOString();
            const endOfDay = new Date(year, month, day, 23, 59, 59, 999).toISOString();
            
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const userIds = usersToDisplay.map(u => u.id);

            try {
            const [attendance, schedules, substitutions] = await Promise.all([
                apiService.getAttendanceForSubordinates(userIds, startOfDay, endOfDay),
                apiService.getTeamSchedules(userIds, dateStr, dateStr),
                apiService.getApprovedSubstitutionRequests(userIds, dateStr, dateStr),
            ]);
                const shiftMap = new Map(allShifts.map(s => [s.code, s]));
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
                    const existing = scheduleMap.get(key) || { profile_id: req.profile_id, date: dateStr, shift: '' };
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
            }
        };

        fetchDataForDate();
    }, [selectedDate, usersToDisplay, allShifts]);

    // For scrolling to the active date
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
        })).sort((a,b) => a.user.full_name.localeCompare(b.user.full_name));
    }, [usersToDisplay, scheduleData, attendanceData]);

    const shiftStyles = useMemo(() => {
        const styles: Record<string, string> = {};
        allShifts.forEach(shift => {
             // Extract color name from class, e.g., 'bg-red-600' -> 'text-red-600'
            const colorClass = shift.color?.replace('bg-', 'text-') || 'text-gray-800';
            styles[shift.code] = colorClass;
        });
        styles['OFF'] = 'text-red-500';
        styles['DEFAULT'] = 'text-gray-400';
        return styles;
    }, [allShifts]);

    return (
        <>
        <div className="flex flex-col h-full bg-gray-100">
            {/* Header with Month Navigation */}
            <header className="flex-shrink-0 bg-red-700 text-white p-2 flex items-center justify-between shadow-md">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-red-600 transition-colors">
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <div className="bg-white text-red-700 px-4 py-1.5 rounded-md font-bold flex items-center gap-2 text-lg">
                    <span>{currentMonthView.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                    <CalendarIcon className="h-5 w-5" />
                </div>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-red-600 transition-colors">
                    <ChevronRightIcon className="h-6 w-6" />
                </button>
            </header>

            {/* Date Scroller */}
            <div className="flex-shrink-0 bg-white p-2 border-b">
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
                    {calendarHeaderData.map(day => {
                        const isSelected = day.fullDate.toDateString() === selectedDate.toDateString();
                        return (
                            <button
                                key={day.date}
                                ref={isSelected ? activeDateRef : null}
                                onClick={() => setSelectedDate(day.fullDate)}
                                className={`flex-shrink-0 w-14 h-16 rounded-lg flex flex-col items-center justify-center transition-all duration-200
                                    ${isSelected
                                        ? 'bg-red-600 text-white shadow-lg scale-105'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <span className="text-xs">{day.dayName}</span>
                                <span className="font-bold text-xl">{day.date}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h2>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Spinner /> <span className="ml-2 text-gray-600">Memuat data presensi...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">{error}</div>
                    ) : attendanceList.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">Tidak ada data untuk ditampilkan.</div>
                    ) : (
                        <div className="space-y-3">
                            {attendanceList.map((item) => {
                                const { user: employee, schedule, attendance } = item;
                                const shiftCode = schedule?.shift || 'OFF';
                                const shiftColor = shiftStyles[shiftCode] || shiftStyles['DEFAULT'];
                                const clockInTime = attendance?.clock_in ? new Date(attendance.clock_in) : null;
                                const clockOutTime = attendance?.clock_out ? new Date(attendance.clock_out) : null;
                                
                                const isEarlyClockIn = clockInTime && clockInTime.getHours() < 7;

                                return (
                                    <div 
                                        key={employee.id} 
                                        className={`grid grid-cols-[1fr,2fr] md:grid-cols-[1fr,3fr,2fr] gap-4 p-3 border-b items-center ${attendance ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                        onClick={() => handleRowClick(item)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`font-bold text-lg w-12 text-center ${shiftColor}`}>{shiftCode}</span>
                                            <div>
                                                <p className="text-xs text-gray-500">{employee.nik || employee.id.slice(0, 8)}</p>
                                                <p className="font-semibold text-gray-800 truncate" title={employee.full_name}>{employee.full_name}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="text-sm text-gray-600 text-right md:text-left">
                                            <p>{attendance?.lokasi_kerja || ''}</p>
                                        </div>

                                        <div className="col-span-2 md:col-span-1 flex justify-between md:justify-end items-center gap-4 text-sm">
                                            <div className="text-center">
                                                {clockInTime ? (
                                                    <p className={`font-mono text-lg font-bold ${isEarlyClockIn ? 'text-green-600' : 'text-gray-800'}`}>
                                                        {clockInTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })}
                                                    </p>
                                                ) : (
                                                    <p className="font-mono text-lg text-gray-400">--:--</p>
                                                )}
                                                <p className="text-xs text-gray-500">WITA</p>
                                            </div>
                                            <div className="text-center">
                                                {clockOutTime ? (
                                                    <p className="font-mono text-lg font-bold text-gray-800">
                                                        {clockOutTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })}
                                                    </p>
                                                ) : (
                                                    <p className="font-mono text-lg text-gray-400">--:--</p>
                                                )}
                                                <p className="text-xs text-gray-500">WITA</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
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

export default PresensiPage;
