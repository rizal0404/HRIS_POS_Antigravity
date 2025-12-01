"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, Attendance, Request, JadwalKerjaTim, UserRole, Department, RequestType } from '../../types';
import { apiService } from '../../services/apiService';
import { getAllSubordinates } from '../../lib/utils';
import { PrintIcon, ExcelIcon } from '../icons';
import Spinner from '../ui/Spinner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';


interface MonitoringPresensiProps {
    user: UserProfile;
    mode?: 'self' | 'team';
}

interface TableCellProps {
    children?: React.ReactNode;
    className?: string;
    colSpan?: number;
}

const TableCell: React.FC<TableCellProps> = ({ children, className, colSpan }) => (
    <td colSpan={colSpan} className={`border border-black px-1 py-0.5 h-10 ${className}`}>{children}</td>
);

const MonitoringPresensi: React.FC<MonitoringPresensiProps> = ({ user, mode = 'team' }) => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [usersToDisplay, setUsersToDisplay] = useState<UserProfile[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<UserProfile | null>(null);
    const [orgStructure, setOrgStructure] = useState<Department[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const isSuperAdmin = user.role === UserRole.SUPERADMIN;

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [users, structure] = await Promise.all([
                    apiService.getProfiles(),
                    apiService.getOrganizationStructure()
                ]);
                setOrgStructure(structure);
                setAllUsers(users);

                let employees: UserProfile[];

                if (mode === 'self') {
                    employees = users.filter(u => u.id === user.id);
                } else {
                    if (isSuperAdmin) {
                        employees = users;
                    } else if (user.isManager) {
                        employees = getAllSubordinates(user.id, users);
                    } else {
                        employees = users.filter(u => u.id === user.id);
                    }
                }
                
                setUsersToDisplay(employees);
                if (employees.length > 0) {
                    setSelectedEmployee(employees[0]);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                setError("Gagal memuat data pegawai.");
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [user, isSuperAdmin, mode]);
    
    const managerName = useMemo(() => {
        if (!selectedEmployee) return '...';

        // 1. Direct Manager ID lookup - this is always the primary source of truth.
        if (selectedEmployee.manager_id) {
            const manager = allUsers.find(u => u.id === selectedEmployee.manager_id);
            if (manager) return manager.full_name;
        }

        // 2. For self-service reports, if direct manager_id isn't found, stop.
        //    Don't use complex fallback logic for the user's own report.
        if (mode === 'self') {
            return 'Tidak Ditemukan';
        }

        // 3. Fallback logic for TEAM mode only, for subordinates who might not have manager_id set.
        const findManagerByHierarchy = (position: string | undefined | null, profiles: UserProfile[]) => {
            if (!position) return undefined;
            const lowerPos = position.toLowerCase();

            // Staf Seksi -> Kepala Seksi
            if (lowerPos.startsWith('staf seksi')) {
                const sectionName = lowerPos.replace('staf seksi', '').trim();
                return profiles.find(p => p.position?.toLowerCase() === `kepala seksi ${sectionName}`);
            }

            // Kepala Seksi -> Kepala Biro (needs org structure)
            if (lowerPos.startsWith('kepala seksi')) {
                const sectionName = lowerPos.replace('kepala seksi', '').trim();
                for (const dept of orgStructure) {
                    for (const bureau of dept.bureaus) {
                        if (bureau.sections.some(sec => sec.name.toLowerCase().includes(sectionName))) {
                            return profiles.find(p => p.position?.toLowerCase() === `kepala biro ${bureau.name.toLowerCase()}`);
                        }
                    }
                }
            }
            return undefined;
        };

        const foundManager = findManagerByHierarchy(selectedEmployee.position || '', allUsers);
        return foundManager ? foundManager.full_name : 'Tidak Ditemukan';

    }, [selectedEmployee, allUsers, orgStructure, mode]);

    useEffect(() => {
        if (!selectedEmployee) {
            setReportData(null);
            return;
        };

        const fetchDataForReport = async () => {
            setLoading(true);
            setError(null);
            const startDate = new Date(selectedYear, selectedMonth, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(selectedYear, selectedMonth + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            
            const startDateStr = formatLocalDate(startDate);
            const endDateStr = formatLocalDate(endDate);

            try {
                const [attendance, overtime, schedule, corrections, otherReqs] = await Promise.all([
                    apiService.getAttendanceForSubordinates([selectedEmployee.id], startDate.toISOString(), endDate.toISOString()),
                    apiService.getOvertimeRequestsForSubordinates([selectedEmployee.id], startDateStr, endDateStr),
                    apiService.getTeamSchedules([selectedEmployee.id], startDateStr, endDateStr),
                    apiService.getCorrectionRequestsForSubordinates([selectedEmployee.id], startDateStr, endDateStr),
                    apiService.getOtherApprovedRequestsForPeriod([selectedEmployee.id], startDateStr, endDateStr)
                ]);

                const attendanceMap = new Map(attendance.map(a => {
                    const localDate = new Date(a.clock_in);
                    const key = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
                    return [key, a];
                }));
                const overtimeMap = new Map(overtime.map(o => [o.start_date, o]));
                const scheduleMap = new Map(schedule.map(s => [s.date, s]));
                const correctionMap = new Map(corrections.map(c => [String(c.attendance_id_to_correct), c]));
                
                const findRequestForDate = (dateStr: string, requests: Request[]): Request | null => {
                    for (const req of requests) {
                        if (dateStr >= req.start_date && dateStr <= req.end_date) {
                            return req;
                        }
                    }
                    return null;
                };

                let totalOvertimeHours = 0;
                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                const daysData = Array.from({ length: daysInMonth }, (_, i) => {
                    const date = new Date(selectedYear, selectedMonth, i + 1);
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    
                    const att = attendanceMap.get(dateStr);
                    const ot = overtimeMap.get(dateStr);
                    const sch = scheduleMap.get(dateStr);
                    const otherReq = findRequestForDate(dateStr, otherReqs);
                    const correction = att ? correctionMap.get(String(att.id)) : null;

                    let jamLembur = '';
                    if (ot?.start_time && ot.end_time) {
                        const start = new Date(`1970-01-01T${ot.start_time}`);
                        const end = new Date(`1970-01-01T${ot.end_time}`);
                        let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        if (diff < 0) diff += 24;
                        totalOvertimeHours += diff;
                        jamLembur = `${diff.toFixed(2)} Jam`;
                    }

                    let keterangan = '';
                    if (otherReq) {
                        keterangan = otherReq.request_type.toUpperCase();
                    } else if (att) {
                        if (att.status.toUpperCase() !== 'HADIR') {
                            keterangan = att.status.toUpperCase();
                        }
                        
                        if (correction) {
                            let correctionText = '';
                             try {
                                const reason = JSON.parse(correction.reason);
                                correctionText = `(Koreksi ${reason.type.toUpperCase()})`;
                            } catch(e) {
                                correctionText = '(Terkoreksi)';
                            }
                            keterangan = keterangan ? `${keterangan} ${correctionText}` : correctionText;
                        }
                    }

                    let menyetujui = '';
                    if (ot?.approvers?.full_name) {
                        menyetujui = ot.approvers.full_name;
                    } else if (otherReq?.approvers?.full_name) {
                        menyetujui = otherReq.approvers.full_name;
                    } else if (correction?.approvers?.full_name) {
                        menyetujui = correction.approvers.full_name;
                    }


                    return {
                        no: i + 1,
                        tgl: `${i + 1}`,
                        shiftMasuk: sch?.start_time || '-',
                        shiftPulang: sch?.end_time || '-',
                        jamKerjaAktual: att ? `${new Date(att.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })} - ${att.clock_out ? new Date(att.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) : ''}` : '',
                        lemburMulai: ot?.start_time || '',
                        lemburSelesai: ot?.end_time || '',
                        jamLembur,
                        realisasi: ot?.reason || '',
                        menyetujui,
                        keterangan,
                    };
                });

                const findOrgDetails = (position: string | undefined | null, structure: Department[]) => {
                    if (!position || !structure || structure.length === 0) {
                        return { unit: 'Tidak Ditemukan', departemen: 'Tidak Ditemukan' };
                    }

                    const lowerPosition = position.toLowerCase();

                    let bestMatch: { unit: string, departemen: string, matchLength: number } | null = null;

                    // Iterate from the most specific (sections) to find the longest, most accurate match
                    for (const dept of structure) {
                        for (const bureau of dept.bureaus) {
                            for (const section of bureau.sections) {
                                const lowerSectionName = section.name.toLowerCase();
                                if (lowerPosition.includes(lowerSectionName)) {
                                    if (!bestMatch || lowerSectionName.length > bestMatch.matchLength) {
                                        bestMatch = { unit: bureau.name, departemen: dept.name, matchLength: lowerSectionName.length };
                                    }
                                }
                            }
                        }
                    }
                    
                    // If a section match was found, return it
                    if (bestMatch) {
                        return { unit: bestMatch.unit, departemen: bestMatch.departemen };
                    }

                    // If no section match, fall back to checking bureau names
                     for (const dept of structure) {
                        for (const bureau of dept.bureaus) {
                            const lowerBureauName = bureau.name.toLowerCase();
                            if (lowerPosition.includes(lowerBureauName)) {
                                if (!bestMatch || lowerBureauName.length > bestMatch.matchLength) {
                                    bestMatch = { unit: bureau.name, departemen: dept.name, matchLength: lowerBureauName.length };
                                }
                            }
                        }
                    }

                    if (bestMatch) {
                        return { unit: bestMatch.unit, departemen: bestMatch.departemen };
                    }

                    return { unit: 'Tidak Ditemukan', departemen: 'Tidak Ditemukan' };
                };
        
                const orgDetails = findOrgDetails(selectedEmployee.position, orgStructure);
                const endDateForDisplay = new Date(selectedYear, selectedMonth + 1, 0);

                setReportData({
                    header: {
                        nama: selectedEmployee.full_name,
                        noId: selectedEmployee.nik || '-',
                        polaShift: selectedEmployee.default_shift || 'SHIFT',
                        seksi: selectedEmployee.position,
                        unit: orgDetails.unit,
                        departemen: orgDetails.departemen,
                    },
                    days: daysData,
                    footer: {
                        vendor: 'KOPKAR SEMEN TONASA',
                        signature1Name: 'Muh. Kasim',
                        signature2Title: `Pangkep, ${endDateForDisplay.getDate()} ${endDateForDisplay.toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })}`,
                        signature2Name: managerName,
                        totalJamLembur: `${totalOvertimeHours.toFixed(2)} Jam`,
                    }
                });

            } catch (err) {
                setError("Gagal memuat data laporan.");
            } finally {
                setLoading(false);
            }
        };

        fetchDataForReport();
    }, [selectedEmployee, selectedMonth, selectedYear, orgStructure, allUsers, managerName]);

    const handleExportPDF = () => {
        if (!reportData) return;
        setIsGeneratingPDF(true);
    
        const input = document.getElementById('print-area');
    
        if (!input) {
            setIsGeneratingPDF(false);
            return;
        }
    
        html2canvas(input, { scale: 2, logging: false, useCORS: true }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
            let heightLeft = pdfHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
    
            while (heightLeft > 0) {
                position -= pdf.internal.pageSize.getHeight();
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }
    
            const monthStr = String(selectedMonth + 1).padStart(2, '0');
            const fileName = `Monitoring_Presensi_Lembur_${selectedEmployee?.full_name}_${selectedYear}-${monthStr}.pdf`;
            pdf.save(fileName);
            
            setIsGeneratingPDF(false);
        }).catch(err => {
            console.error("Error generating PDF:", err);
            setIsGeneratingPDF(false);
        });
    };

    const handleDownload = () => {
        if (!reportData) return;
    
        const headers = [
            "No", "Tgl", "Jam Masuk Shift", "Jam Pulang Shift", "Jam Kerja Aktual",
            "Lembur Mulai", "Lembur Selesai", "Jam Lembur", "Realisasi Uraian Pekerjaan",
            "Memerintahkan / Menyetujui", "Keterangan"
        ];
    
        const csvRows = [headers.join(',')];
    
        reportData.days.forEach((day: any) => {
            const row = [
                day.no,
                day.tgl,
                day.shiftMasuk,
                day.shiftPulang,
                `"${day.jamKerjaAktual}"`, // Enclose in quotes if it contains commas or hyphens
                day.lemburMulai,
                day.lemburSelesai,
                `"${day.jamLembur}"`,
                `"${(day.realisasi || '').replace(/"/g, '""')}"`, // Escape quotes
                `"${(day.menyetujui || '').replace(/"/g, '""')}"`,
                `"${(day.keterangan || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });
    
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const fileName = `Monitoring_Presensi_${selectedEmployee?.full_name}_${selectedYear}-${monthStr}.csv`;
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-wrap items-center gap-3 sm:justify-between mb-4">
                 <h3 className="text-lg font-bold text-gray-800">Monitoring Daftar Hadir & Surat Perintah Lembur (SPL)</h3>
                 <div className="flex flex-wrap items-center gap-2">
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                        disabled={!reportData || loading}
                    >
                        <ExcelIcon className="h-5 w-5"/>
                        <span className="hidden sm:inline">Download</span>
                        <span className="inline sm:hidden">CSV</span>
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait min-w-[48px]"
                        disabled={!reportData || loading || isGeneratingPDF}
                    >
                        {isGeneratingPDF ? (
                            <>
                                <Spinner />
                                <span className="hidden sm:inline">Membuat PDF...</span>
                            </>
                        ) : (
                            <>
                                <PrintIcon className="h-5 w-5"/>
                                <span className="hidden sm:inline">Cetak Laporan</span>
                                <span className="inline sm:hidden">PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
             <div className="p-4 border-t flex flex-wrap items-center gap-4">
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
                            <select value={selectedEmployee?.id || ''} onChange={e => setSelectedEmployee(usersToDisplay.find(s => s.id === e.target.value) || null)} className="p-2 border rounded-md text-sm w-full" disabled={usersToDisplay.length === 0}>
                                {usersToDisplay.length > 0 ? (
                                    usersToDisplay.map(sub => <option key={sub.id} value={sub.id}>{`${sub.nik || sub.id.substring(0,8)} - ${sub.full_name}`}</option>)
                                ) : (
                                    <option>Tidak ada data pegawai</option>
                                )}
                            </select>
                        </div>
                    )}
                </div>

            <div className="overflow-x-auto">
                 {loading ? (
                    <div className="flex justify-center items-center h-64"><Spinner /> Memuat data laporan...</div>
                ) : error ? (
                    <div className="text-center p-8 text-red-500">{error}</div>
                ) : !reportData ? (
                    <div className="text-center p-8 text-gray-500">Pilih karyawan dan periode untuk melihat laporan.</div>
                ) : (
                <div id="print-area" className="bg-white p-4 text-xs min-w-[1024px]">
                    <header className="text-center mb-4">
                        <h1 className="font-bold text-sm">KOPKAR SEMEN TONASA</h1>
                        <h2 className="font-bold text-sm">MONITORING DAFTAR HADIR & SURAT PERINTAH LEMBUR (SPL)</h2>
                    </header>
                    
                    <div className="grid grid-cols-2 gap-x-8 mb-2">
                        <div className="grid grid-cols-[max-content,1fr] gap-x-2">
                            <span>Nama</span><span>: {reportData.header.nama}</span>
                            <span>No. ID</span><span>: {reportData.header.noId}</span>
                            <span>Pola Shift</span><span>: {reportData.header.polaShift}</span>
                        </div>
                        <div className="grid grid-cols-[max-content,1fr] gap-x-2">
                            <span>Seksi</span><span>: {reportData.header.seksi}</span>
                            <span>Unit</span><span>: {reportData.header.unit}</span>
                            <span>Departemen</span><span>: {reportData.header.departemen}</span>
                        </div>
                    </div>

                    <table className="w-full border-collapse border border-black text-center">
                        <thead>
                            <tr className="font-bold">
                                <td rowSpan={2} className="border border-black p-1">No.</td>
                                <td rowSpan={2} className="border border-black p-1">Tgl</td>
                                <td colSpan={2} className="border border-black p-1">Jam Kerja Shift</td>
                                <td rowSpan={2} className="border border-black p-1">Jam Kerja Aktual</td>
                                <td colSpan={3} className="border border-black p-1">Lembur</td>
                                <td rowSpan={2} className="border border-black p-1">Realisasi Uraian Pekerjaan</td>
                                <td rowSpan={2} className="border border-black p-1 w-24">Memerintahkan / Menyetujui</td>
                                <td rowSpan={2} className="border border-black p-1">Keterangan</td>
                            </tr>
                            <tr className="font-bold">
                                <td className="border border-black p-1">Masuk</td>
                                <td className="border border-black p-1">Pulang</td>
                                <td className="border border-black p-1">Mulai</td>
                                <td className="border border-black p-1">Selesai</td>
                                <td className="border border-black p-1">Jam Lembur</td>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.days.map((day: any) => (
                                <tr key={day.no}>
                                    <TableCell>{day.no}</TableCell>
                                    <TableCell>{day.tgl}</TableCell>
                                    <TableCell>{day.shiftMasuk}</TableCell>
                                    <TableCell>{day.shiftPulang}</TableCell>
                                    <TableCell>{day.jamKerjaAktual}</TableCell>
                                    <TableCell>{day.lemburMulai}</TableCell>
                                    <TableCell>{day.lemburSelesai}</TableCell>
                                    <TableCell>{day.jamLembur}</TableCell>
                                    <TableCell>{day.realisasi}</TableCell>
                                    <TableCell>{day.menyetujui}</TableCell>
                                    <TableCell>{day.keterangan}</TableCell>
                                </tr>
                            ))}
                            <tr>
                                <TableCell colSpan={7} className="text-right font-bold pr-4">Total Jam Lembur</TableCell>
                                <TableCell>{reportData.footer.totalJamLembur}</TableCell>
                                <TableCell colSpan={3}></TableCell>
                            </tr>
                        </tbody>
                    </table>
                    
                    <footer className="mt-8 grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p>Vendor</p>
                            <p className="font-bold">{reportData.footer.vendor}</p>
                            <div className="h-16"></div>
                            <p className="font-bold underline">{reportData.footer.signature1Name}</p>
                        </div>
                        <div></div>
                        <div>
                            <p className="whitespace-pre-line">{reportData.footer.signature2Title}</p>
                            <div className="h-16"></div>
                            <p className="font-bold underline">{reportData.footer.signature2Name}</p>
                        </div>
                    </footer>
                </div>
                )}
            </div>
        </div>
    );
};

export default MonitoringPresensi;
