"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, Attendance, JadwalKerjaTim, UserRole, Request } from '../../types';
import { apiService } from '../../services/apiService';
import { SearchIcon, ExcelIcon, PrintIcon, XIcon } from '../icons';
import { getAllSubordinates } from '../../lib/utils';
import Spinner from '../ui/Spinner';

interface PresensiBawahanProps {
    user: UserProfile;
    mode?: 'self' | 'team';
}

const PresensiBawahan: React.FC<PresensiBawahanProps> = ({ user, mode = 'team' }) => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    
    const [usersToDisplay, setUsersToDisplay] = useState<UserProfile[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [scheduleData, setScheduleData] = useState<JadwalKerjaTim[]>([]);
    const [correctionData, setCorrectionData] = useState<Request[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isPrivileged = user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN;

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const users = await apiService.getProfiles();
                let employees: UserProfile[];

                if (mode === 'self') {
                    employees = [user];
                } else {
                    if (isPrivileged) {
                        employees = users;
                    } else if (user.isManager) {
                        employees = getAllSubordinates(user.id, users);
                    } else {
                        employees = [user];
                    }
                }
                
                setUsersToDisplay(employees);
                if (employees.length > 0) {
                    setSelectedEmployeeId(employees[0].id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                setError("Gagal memuat data pegawai.");
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [user, isPrivileged, mode]);

    useEffect(() => {
        if (!selectedEmployeeId) return;

        const fetchDataForEmployee = async () => {
            setLoading(true);
            setError(null);
            const startDate = new Date(selectedYear, selectedMonth, 1);
            const endDate = new Date(selectedYear, selectedMonth + 1, 0);
            endDate.setHours(23, 59, 59, 999); // Set to end of day
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            try {
                const [attendance, schedules, corrections, shiftsResp, substitutions] = await Promise.all([
                    apiService.getAttendanceForSubordinates([selectedEmployeeId], startDate.toISOString(), endDate.toISOString()),
                    apiService.getTeamSchedules([selectedEmployeeId], startDateStr, endDateStr),
                    apiService.getCorrectionRequestsForSubordinates([selectedEmployeeId], startDateStr, endDateStr),
                    apiService.getShifts(),
                    apiService.getApprovedSubstitutionRequests([selectedEmployeeId], startDateStr, endDateStr),
                ]);
                setAttendanceData(attendance);

                const shiftMap = new Map(shiftsResp.map(s => [s.code, s]));
                const scheduleMap = new Map<string, JadwalKerjaTim>();
                schedules.forEach(s => scheduleMap.set(`${s.profile_id}-${s.date}`, { ...s }));
                substitutions.forEach(req => {
                    let newShiftCode = '';
                    try {
                        const parsed = JSON.parse(req.reason);
                        newShiftCode = parsed?.shift_baru?.code || parsed?.shift_baru || '';
                    } catch (e) {
                        // ignore
                    }
                    if (!newShiftCode) return;
                    const meta = shiftMap.get(newShiftCode);
                    const d = new Date(req.start_date);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const key = `${req.profile_id}-${dateStr}`;
                    const existing = scheduleMap.get(key) || { profile_id: req.profile_id, date: dateStr, shift: '' };
                    scheduleMap.set(key, {
                        ...existing,
                        shift: newShiftCode,
                        start_time: meta?.start_time ?? existing.start_time,
                        end_time: meta?.end_time ?? existing.end_time,
                    });
                });
                setScheduleData(Array.from(scheduleMap.values()));
                setCorrectionData(corrections);
            } catch (err) {
                setError("Gagal memuat data presensi.");
            } finally {
                setLoading(false);
            }
        };
        fetchDataForEmployee();
    }, [selectedEmployeeId, selectedMonth, selectedYear]);

    const selectedEmployee = useMemo(() => {
        return usersToDisplay.find(u => u.id === selectedEmployeeId);
    }, [usersToDisplay, selectedEmployeeId]);

    const reportData = useMemo(() => {
        if (!selectedEmployee) return [];
        
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const scheduleMap = new Map(scheduleData.map(s => [s.date, s]));
        const attendanceMap = new Map(attendanceData.map(a => {
            const localDate = new Date(a.clock_in);
            const key = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
            return [key, a];
        }));
        const correctionMap = new Map(correctionData.map(c => [String(c.attendance_id_to_correct), c]));
        
        return Array.from({ length: daysInMonth }, (_, i) => {
            const date = new Date(selectedYear, selectedMonth, i + 1);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            // FIX: Add explicit types to resolve 'unknown' type errors
            const schedule = scheduleMap.get(dateStr) as JadwalKerjaTim | undefined;
            const attendance = attendanceMap.get(dateStr) as Attendance | undefined;

            let keterangan = attendance?.status.toUpperCase() || 'ABSEN';
            if (attendance) {
                // FIX: Add explicit type to resolve 'unknown' type error
                const correction = correctionMap.get(String(attendance.id)) as Request | undefined;
                if (correction) {
                    try {
                        // FIX: Add explicit type to resolve 'unknown' type error
                        const reason = JSON.parse(correction.reason) as { type: string };
                        keterangan += ` (Koreksi ${reason.type.toUpperCase()})`;
                    } catch(e) {
                        keterangan += ' (Terkoreksi)';
                    }
                }
            }

            return {
                no: i + 1,
                noKaryawan: selectedEmployee?.nik || '-',
                tanggal: date.toLocaleDateString('id-ID'),
                shift: schedule?.shift || '-',
                regularMasuk: schedule?.start_time || '-',
                regularPulang: schedule?.end_time || '-',
                realisasiMasuk: attendance ? new Date(attendance.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
                realisasiPulang: attendance?.clock_out ? new Date(attendance.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
                keterangan,
                ft: '', tt: '', dt: '', otNormal: '', otFlat: '', otStart: '', otEnd: '', kom: '', hariLiburNasional: ''
            };
        });
    }, [attendanceData, scheduleData, correctionData, selectedEmployee, selectedMonth, selectedYear]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        if (reportData.length === 0) return;

        const headers = [
            "No", "No Karyawan", "Tanggal", "Shift", "Regular Masuk", "Regular Pulang",
            "Realisasi Masuk", "Realisasi Pulang", "FT", "TT", "DT", "OTNormal", "OTFlat",
            "OT Start", "OT End", "KOM", "Hari Libur Nasional", "Keterangan"
        ];
        const csvRows = [headers.join(',')];

        reportData.forEach(row => {
            const csvRow = [
                row.no,
                `"${row.noKaryawan}"`,
                row.tanggal,
                row.shift,
                row.regularMasuk,
                row.regularPulang,
                row.realisasiMasuk,
                row.realisasiPulang,
                row.ft, row.tt, row.dt, row.otNormal, row.otFlat,
                row.otStart, row.otEnd, row.kom, row.hariLiburNasional,
                `"${row.keterangan.replace(/"/g, '""')}"`
            ];
            csvRows.push(csvRow.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const fileName = `Laporan_Presensi_${selectedEmployee?.full_name}_${selectedYear}-${monthStr}.csv`;
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Bulan</label>
                        <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="p-2 border rounded-md text-sm">
                            {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('id-ID', {month: 'long'})}</option>)}
                        </select>
                    </div>
                     <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Tahun</label>
                        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="p-2 border rounded-md text-sm">
                            {Array.from({length: 5}).map((_, i) => <option key={i} value={today.getFullYear() - i}>{today.getFullYear() - i}</option>)}
                        </select>
                    </div>
                    {usersToDisplay.length > 1 && (
                        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                            <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="p-2 border rounded-md text-sm w-full" disabled={usersToDisplay.length === 0}>
                                {usersToDisplay.length > 0 ? (
                                    usersToDisplay.map(sub => <option key={sub.id} value={sub.id}>{`${sub.nik || sub.id.substring(0,8)} - ${sub.full_name}`}</option>)
                                ) : (
                                    <option>Tidak ada data pegawai</option>
                                )}
                            </select>
                            <button className="p-2 text-gray-500 hover:text-gray-700" onClick={() => setSelectedEmployeeId('')}>
                                <XIcon className="h-4 w-4"/>
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                         <button onClick={handleDownload} className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 border" title="Download as CSV">
                           <ExcelIcon className="h-5 w-5"/>
                        </button>
                         <button onClick={handlePrint} className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 border" title="Cetak Laporan">
                           <PrintIcon className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            </div>
            <div id="print-area" className="overflow-x-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64"><Spinner /> Memuat data...</div>
                ) : error ? (
                    <div className="text-center p-8 text-red-500">{error}</div>
                ) : reportData.length === 0 && selectedEmployeeId ? (
                    <div className="text-center p-8 text-gray-500">Tidak ada data untuk ditampilkan.</div>
                ) : (
                <table className="w-full text-sm text-left min-w-[1200px]">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                            <th rowSpan={2} className="px-4 py-3 border">No</th>
                            <th rowSpan={2} className="px-4 py-3 border">No Karyawan</th>
                            <th rowSpan={2} className="px-4 py-3 border">Tanggal</th>
                            <th rowSpan={2} className="px-4 py-3 border">Shift</th>
                            <th colSpan={2} className="px-4 py-3 border text-center">Regular</th>
                            <th colSpan={5} className="px-4 py-3 border text-center">Realisasi</th>
                            <th colSpan={5} className="px-4 py-3 border text-center">Lembur</th>
                            <th rowSpan={2} className="px-4 py-3 border">Hari Libur Nasional</th>
                            <th rowSpan={2} className="px-4 py-3 border">Keterangan</th>
                        </tr>
                        <tr>
                            <th className="px-2 py-2 border">Masuk</th>
                            <th className="px-2 py-2 border">Pulang</th>
                            <th className="px-2 py-2 border">Masuk</th>
                            <th className="px-2 py-2 border">Pulang</th>
                            <th className="px-2 py-2 border">FT</th>
                            <th className="px-2 py-2 border">TT</th>
                            <th className="px-2 py-2 border">DT</th>
                            <th className="px-2 py-2 border">OTNormal</th>
                            <th className="px-2 py-2 border">OTFlat</th>
                            <th className="px-2 py-2 border">OT Start</th>
                            <th className="px-2 py-2 border">OT End</th>
                            <th className="px-2 py-2 border">KOM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((row, index) => (
                            <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-2 border">{row.no}</td>
                                <td className="px-4 py-2 border">{row.noKaryawan}</td>
                                <td className="px-4 py-2 border">{row.tanggal}</td>
                                <td className="px-4 py-2 border">{row.shift}</td>
                                <td className="px-4 py-2 border">{row.regularMasuk}</td>
                                <td className="px-4 py-2 border">{row.regularPulang}</td>
                                <td className="px-4 py-2 border">{row.realisasiMasuk}</td>
                                <td className="px-4 py-2 border">{row.realisasiPulang}</td>
                                <td className="px-4 py-2 border text-center">{row.ft}</td>
                                <td className="px-4 py-2 border text-center">{row.tt}</td>
                                <td className="px-4 py-2 border text-center">{row.dt}</td>
                                <td className="px-4 py-2 border text-center">{row.otNormal}</td>
                                <td className="px-4 py-2 border text-center">{row.otFlat}</td>
                                <td className="px-4 py-2 border">{row.otStart}</td>
                                <td className="px-4 py-2 border">{row.otEnd}</td>
                                <td className="px-4 py-2 border text-center">{row.kom}</td>
                                <td className="px-4 py-2 border text-center">{row.hariLiburNasional}</td>
                                <td className="px-4 py-2 border">{row.keterangan}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>
        </div>
    );
};

export default PresensiBawahan;
