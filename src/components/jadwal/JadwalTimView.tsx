"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { UserProfile, JadwalKerjaTim, Shift, Holiday } from '../../types';
import { apiService } from '../../services/apiService';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, DownloadIcon, UploadIcon, XIcon } from '../icons';
import EditShiftModal from '../modals/EditShiftModal';
import { getSubordinatesWithLevels, getAllSubordinates } from '../../lib/utils';

interface JadwalTimViewProps {
  user: UserProfile;
  mode: 'team' | 'colleagues';
}

const JadwalTimView: React.FC<JadwalTimViewProps> = ({ user, mode }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [levelFilter, setLevelFilter] = useState('all');
    
    // State for data from API
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [teamScheduleData, setTeamScheduleData] = useState<Record<string, JadwalKerjaTim[]>>({});
    const [allShifts, setAllShifts] = useState<Shift[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [usersToDisplay, setUsersToDisplay] = useState<UserProfile[]>([]);


    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0); // Normalize to start of day in local timezone
        return d;
    }, []);
    
    const todayISO = useMemo(() => {
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, [today]);
    
    const todayHeaderRef = useRef<HTMLTableCellElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal state
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [selectedShiftData, setSelectedShiftData] = useState<{
        employee: UserProfile;
        date: string;
        shiftCode: string;
    } | null>(null);
    
    const shiftStyles = useMemo(() => {
        const styles: Record<string, { bg: string; text: string; border: string; }> = {};
        allShifts.forEach(shift => {
            styles[shift.code] = {
                bg: 'bg-white',
                text: 'text-gray-800',
                border: `border-b-[3px] ${shift.color ? shift.color.replace('bg-', 'border-') : 'border-transparent'}`
            };
        });
        styles['OFF'] = { bg: 'bg-white', text: 'text-gray-500', border: 'border-b-[3px] border-red-500' };
        styles['DEFAULT'] = { bg: 'bg-white', text: 'text-gray-400', border: 'border-b-[3px] border-transparent' };
        return styles;
    }, [allShifts]);

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
            
            let usersForSchedule: UserProfile[];
            if (mode === 'colleagues') {
                if (user.manager_id) {
                    usersForSchedule = users.filter(u => u.manager_id === user.manager_id);
                } else {
                    usersForSchedule = [user]; // If no manager, just show self
                }
            } else { // mode === 'team'
                usersForSchedule = getAllSubordinates(user.id, users);
            }
            setUsersToDisplay(usersForSchedule);
            const userIds = usersForSchedule.map(u => u.id);
            
            if (userIds.length > 0) {
                const year = date.getFullYear();
                const month = date.getMonth();
                const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                
                const endDateObj = new Date(year, month + 1, 0);
                const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
                
                const [schedulesFromApi, approvedSubs] = await Promise.all([
                    apiService.getTeamSchedules(userIds, startDate, endDate),
                    apiService.getApprovedSubstitutionRequests(userIds, startDate, endDate),
                ]);

                // Apply approved Substitusi to schedules
                const shiftMap = new Map(shifts.map(s => [s.code, s]));
                const scheduleMap = new Map<string, JadwalKerjaTim>();
                schedulesFromApi.forEach(s => {
                    scheduleMap.set(`${s.profile_id}-${s.date}`, { ...s });
                });
                approvedSubs.forEach(req => {
                    let newShiftCode = '';
                    try {
                        const parsed = JSON.parse(req.reason);
                        newShiftCode = parsed?.shift_baru?.code || parsed?.shift_baru || '';
                    } catch (e) {
                        // ignore malformed payload
                    }
                    if (!newShiftCode) return;
                    const shiftMeta = shiftMap.get(newShiftCode);
                    const start = new Date(req.start_date);
                    const end = new Date(req.end_date);
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const key = `${req.profile_id}-${dateStr}`;
                        const existing = scheduleMap.get(key) || { profile_id: req.profile_id, date: dateStr, shift: '' };
                        scheduleMap.set(key, {
                            ...existing,
                            shift: newShiftCode,
                            start_time: shiftMeta?.start_time ?? existing.start_time,
                            end_time: shiftMeta?.end_time ?? existing.end_time,
                        });
                    }
                });

                const schedulesByUser: Record<string, JadwalKerjaTim[]> = {};
                Array.from(scheduleMap.values()).forEach(schedule => {
                    if (!schedulesByUser[schedule.profile_id]) {
                        schedulesByUser[schedule.profile_id] = [];
                    }
                    schedulesByUser[schedule.profile_id].push(schedule);
                });
                setTeamScheduleData(schedulesByUser);
            } else {
                setTeamScheduleData({});
            }

        } catch (error) {
            console.error("Failed to fetch team data:", error);
        } finally {
            setLoading(false);
        }
    }, [user.id, user.manager_id, mode]);
    
    useEffect(() => {
        fetchData(currentDate);
    }, [fetchData, currentDate]);


    const holidaysMap = useMemo(() => {
        return new Map(holidays.map(h => [h.date, h.name]));
    }, [holidays]);

    useEffect(() => {
        if (todayHeaderRef.current) {
            todayHeaderRef.current.scrollIntoView({
                behavior: 'auto',
                inline: 'center',
                block: 'nearest'
            });
        }
    }, [loading]); 

    const subordinatesWithLevels = useMemo(() => {
        if (mode !== 'team') return [];
        return getSubordinatesWithLevels(user.id, allUsers);
    }, [user.id, allUsers, mode]);

    const maxLevel = useMemo(() => {
        if (!subordinatesWithLevels.length) return 0;
        return Math.max(...subordinatesWithLevels.map(s => s.level));
    }, [subordinatesWithLevels]);

    const filteredUsersToDisplay = useMemo(() => {
        if (mode !== 'team') return usersToDisplay; // No level filtering for colleagues

        const users = levelFilter === 'all'
            ? subordinatesWithLevels.map(s => s.user)
            : subordinatesWithLevels.filter(s => s.level.toString() === levelFilter).map(s => s.user);
        
        const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
        return uniqueUsers;

    }, [levelFilter, subordinatesWithLevels, usersToDisplay, mode]);

    const handlePrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            dateObj.setHours(0, 0, 0, 0);
            const fullDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const holidayName = holidaysMap.get(fullDateStr);
            
            days.push({
                date: i,
                dayName: dateObj.toLocaleDateString('id-ID', { weekday: 'short' }),
                fullDate: fullDateStr,
                isPast: dateObj < today,
                isToday: fullDateStr === todayISO,
                isHoliday: !!holidayName,
                holidayName: holidayName || '',
            });
        }
        return days;
    }, [currentDate, today, todayISO, holidaysMap]);

    const handleCellClick = (employee: UserProfile, date: string, shiftCode: string) => {
        if (mode === 'colleagues') return; // Disable editing for colleagues view
        setSelectedShiftData({ employee, date, shiftCode });
        setEditModalOpen(true);
    };
    
    const handleUpdateShift = async (employeeId: string, date: string, newShift: Shift) => {
        try {
            await apiService.updateWorkSchedule(employeeId, date, newShift.code);
            await fetchData(currentDate); // Re-fetch all data to ensure UI is in sync
        } catch (error) {
            console.error("Failed to update work schedule:", error);
        } finally {
            setEditModalOpen(false);
        }
    };

    const handleDownload = () => {
        if (filteredUsersToDisplay.length === 0) {
            setUploadStatus({ type: 'error', message: "Tidak ada data untuk diunduh." });
            return;
        }

        const days = calendarData.map(day => day.date);
        const headers = ['nik', 'nama', ...days];
        const csvRows = [headers.join(',')];

        filteredUsersToDisplay.forEach(sub => {
            const schedule = teamScheduleData[sub.id] || [];
            const scheduleMap = new Map(schedule.map(s => [s.date, s.shift]));
            
            const row = [`"${sub.id}"`, `"${sub.full_name}"`];
            calendarData.forEach(day => {
                const shiftCode = scheduleMap.get(day.fullDate) || 'OFF';
                row.push(shiftCode);
            });
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
        const yearStr = currentDate.getFullYear();
        link.setAttribute('download', `jadwal_tim_${yearStr}-${monthStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            try {
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error("File CSV kosong atau hanya berisi header.");
                
                const headerLine = lines[0].trim();
                const headers = headerLine.split(',');
                const days = headers.slice(2).map(d => parseInt(d, 10));
                
                if (headers[0].toLowerCase() !== 'nik' || headers[1].toLowerCase() !== 'nama' || days.some(isNaN)) {
                    throw new Error("Header CSV tidak valid. Harap gunakan format: nik,nama,1,2,3,...");
                }

                const validShiftCodes = new Set(allShifts.map(s => s.code));
                const managedUserIds = new Set(getAllSubordinates(user.id, allUsers).map(s => s.id));

                const schedulesToUpdate: { profile_id: string, date: string, shift_code: string }[] = [];
                const errors: string[] = [];
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    const values = line.split(',');
                    const profile_id = values[0]?.trim().replace(/"/g, '');
                    if (!profile_id) {
                        errors.push(`Baris ${i + 1}: NIK/profile_id tidak ditemukan.`);
                        continue;
                    }
                    if (!managedUserIds.has(profile_id as string)) continue;

                    for (let j = 2; j < values.length; j++) {
                        const day = days[j - 2];
                        const shift_code = values[j]?.trim();
                        if (day === undefined || !shift_code) continue;

                        if (!validShiftCodes.has(shift_code)) {
                            errors.push(`Baris ${i + 1}, Kolom hari ke-${day}: Kode shift '${shift_code}' tidak valid.`);
                            continue;
                        }
                        
                        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        schedulesToUpdate.push({ profile_id, date, shift_code });
                    }
                }

                if (errors.length > 0) throw new Error(`Ditemukan ${errors.length} error:\n- ${errors.slice(0, 5).join('\n- ')}`);
                if (schedulesToUpdate.length > 0) {
                    await apiService.bulkUpdateWorkSchedules(schedulesToUpdate);
                    setUploadStatus({ type: 'success', message: "Jadwal berhasil diperbarui!" });
                    await fetchData(currentDate);
                } else {
                    setUploadStatus({ type: 'success', message: "Tidak ada jadwal valid untuk diperbarui." });
                }
            } catch (error: any) {
                setUploadStatus({ type: 'error', message: `Gagal memproses file: ${error.message}` });
            } finally {
                setIsUploading(false);
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <div className="flex flex-col h-full">
                <header className={`text-white p-3 flex flex-col gap-3 flex-shrink-0 ${mode === 'team' ? 'bg-red-700' : 'bg-blue-700'} md:flex-row md:items-center md:justify-between`}>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <button onClick={handlePrevMonth} className={`p-2 rounded-full ${mode === 'team' ? 'hover:bg-red-600' : 'hover:bg-blue-600'} transition-colors`}>
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                        <div className="bg-white text-black px-3 py-2 rounded-md font-semibold flex items-center gap-2 text-sm sm:text-base">
                            <span>{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                            <CalendarIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <button onClick={handleNextMonth} className={`p-2 rounded-full ${mode === 'team' ? 'hover:bg-red-600' : 'hover:bg-blue-600'} transition-colors`}>
                            <ChevronRightIcon className="h-6 w-6" />
                        </button>
                        {mode === 'team' && (
                        <div className="flex items-center gap-2">
                            <label htmlFor="level-filter" className="text-sm font-medium sr-only">Level Bawahan</label>
                            <select
                                id="level-filter"
                                value={levelFilter}
                                onChange={(e) => setLevelFilter(e.target.value)}
                                className="bg-white text-black px-3 py-2 rounded-md text-sm font-medium"
                            >
                                <option value="all">Semua Level</option>
                                {Array.from({ length: maxLevel }, (_, i) => i + 1).map(level => (
                                    <option key={level} value={level}>Level {level}</option>
                                ))}
                            </select>
                        </div>
                        )}
                    </div>
                    {mode === 'team' && (
                    <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                        <button onClick={handleDownload} className="flex items-center gap-2 bg-white text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-100">
                            <DownloadIcon className="h-5 w-5"/><span className="hidden sm:inline">Download</span>
                            <span className="inline sm:hidden">DL</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-2 bg-white text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed">
                            <UploadIcon className="h-5 w-5"/><span className="hidden sm:inline">{isUploading ? 'Mengunggah...' : 'Upload'}</span>
                            <span className="inline sm:hidden">{isUploading ? '...' : 'UP'}</span>
                        </button>
                    </div>
                    )}
                </header>

                {uploadStatus && (
                    <div className={`p-4 mx-4 my-2 rounded-md flex justify-between items-center ${uploadStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <p className="text-sm">{uploadStatus.message}</p>
                        <button onClick={() => setUploadStatus(null)} className="p-1 rounded-full hover:bg-black/10"><XIcon className="h-4 w-4" /></button>
                    </div>
                )}

                <div className="flex-1 overflow-auto">
                    {loading ? <div className="flex items-center justify-center h-full text-gray-600">Memuat jadwal...</div> : (
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-gray-200 z-20">
                            <tr>
                                <th className="sticky left-0 bg-gray-200 p-1 border-r border-b min-w-[150px] text-left font-semibold text-xs text-gray-600 z-30">Karyawan</th>
                                {calendarData.map(day => (
                                    <th key={day.date} ref={day.isToday ? todayHeaderRef : null} className={`p-1 border-b border-r text-center font-medium min-w-[70px] transition-colors ${day.isToday ? 'bg-blue-200 ring-2 ring-blue-500 z-20' : (day.isHoliday ? 'bg-red-200' : 'bg-gray-200')}`}>
                                        <div className={`text-[10px] text-gray-500 ${day.isHoliday ? 'text-red-700' : ''}`}>{day.dayName}</div>
                                        <div className={`text-sm font-bold ${day.isHoliday ? 'text-red-800' : ''}`}>{day.date}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-gray-50">
                            {filteredUsersToDisplay.map(sub => {
                                const schedule = teamScheduleData[sub.id] || [];
                                const scheduleMap = new Map(schedule.map(s => [s.date, s]));
                                
                                return (
                                    <tr key={sub.id}>
                                        <td className="sticky left-0 bg-white p-1 border-r border-b z-10 min-w-[150px] max-w-[150px]">
                                            <div className="font-semibold text-[11px] truncate" title={sub.full_name}>{sub.full_name}</div>
                                        </td>
                                        {calendarData.map(day => {
                                            const daySchedule = scheduleMap.get(day.fullDate);
                                            const effectiveShiftCode = daySchedule?.shift || 'DEFAULT';
                                            const style = shiftStyles[effectiveShiftCode] || shiftStyles.DEFAULT;
                                            
                                            let cellBgClass = style.bg;
                                            if (day.isToday) cellBgClass = 'bg-blue-100';
                                            else if (day.isHoliday) cellBgClass = 'bg-red-50';

                                            return (
                                                <td key={day.fullDate} 
                                                    className={`p-0.5 border-r ${cellBgClass} ${style.border} ${mode === 'team' ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''} hover:z-20 relative transition-colors ${day.isToday ? 'ring-2 ring-blue-500' : 'border-b'}`}
                                                    onClick={() => handleCellClick(sub, day.fullDate, daySchedule?.shift || 'OFF')}>
                                                    <div className={`font-bold text-[11px] ${style.text}`}>{daySchedule?.shift || '-'}</div>
                                                    {daySchedule?.start_time && (
                                                        <div className="text-[9px] mt-0.5 space-y-0 leading-tight text-gray-500">
                                                            <div>{daySchedule.start_time?.substring(0,5)}</div>
                                                            <div>{daySchedule.end_time?.substring(0,5)}</div>
                                                        </div>
                                                    )}
                                                    {day.isHoliday && <div className="text-[8px] text-red-700 truncate px-0.5 font-semibold mt-1" title={day.holidayName}>{day.holidayName}</div>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    )}
                </div>
            </div>
            {selectedShiftData && (
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
        </>
    );
};

export default JadwalTimView;
