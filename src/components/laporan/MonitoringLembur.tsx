"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, Request, UserRole, OvertimeConfiguration, Shift, Department } from '../../types';
import { apiService } from '../../services/apiService';
import { getAllSubordinates } from '../../lib/utils';
import Pagination from '../ui/Pagination';
import { ClockIcon, PrintIcon, ExcelIcon } from '../icons';
import Spinner from '../ui/Spinner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface MonitoringLemburProps {
    user: UserProfile;
    mode?: 'self' | 'team';
}

const MonitoringLembur: React.FC<MonitoringLemburProps> = ({ user, mode = 'team' }) => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any[]>([]);
    const [overtimeConfig, setOvertimeConfig] = useState<OvertimeConfiguration | null>(null);
    const [allShifts, setAllShifts] = useState<Shift[]>([]);
    const [orgStructure, setOrgStructure] = useState<Department[]>([]);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const isSuperAdmin = user.role === UserRole.SUPERADMIN;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [users, config, shiftsData, structure] = await Promise.all([
                    apiService.getProfiles(),
                    apiService.getOvertimeConfiguration(),
                    apiService.getShifts(),
                    apiService.getOrganizationStructure()
                ]);

                setOvertimeConfig(config);
                setAllShifts(shiftsData);
                setOrgStructure(structure);
                
                let employees: UserProfile[];
                if (mode === 'self') {
                    employees = [user];
                } else {
                    if (isSuperAdmin) {
                        employees = users;
                    } else if (user.isManager) {
                        employees = getAllSubordinates(user.id, users);
                    } else {
                        employees = [user];
                    }
                }
                const employeeIds = employees.map(s => s.id);
                
                if (employeeIds.length > 0 && config) {
                    const monthStartDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
                    const monthEndDateObj = new Date(selectedYear, selectedMonth + 1, 0);
                    const monthEndDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(monthEndDateObj.getDate()).padStart(2, '0')}`;
                    
                    const monthRequests = await apiService.getOvertimeRequestsForSubordinates(employeeIds, monthStartDate, monthEndDate);
                    
                    const calculateHours = (req: Request) => {
                        if (!req.start_time || !req.end_time) return 0;
                        const start = new Date(`1970-01-01T${req.start_time}`);
                        const end = new Date(`1970-01-01T${req.end_time}`);
                        let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        if (diff < 0) diff += 24;
                        return diff;
                    };
                    
                    const shiftsMap = new Map(shiftsData.map(s => [s.code, s]));
                    
                    const findOrgDetails = (position: string | undefined | null, structure: Department[]) => {
                        if (!position || !structure || structure.length === 0) {
                            return { bureau: 'Tidak Ditemukan', department: 'Tidak Ditemukan' };
                        }
                        const lowerPosition = position.toLowerCase();
                        let bestMatch: { bureau: string; department: string; matchLength: number } | null = null;
                        for (const dept of structure) {
                            for (const bureau of dept.bureaus) {
                                for (const section of bureau.sections) {
                                    const lowerSectionName = section.name.toLowerCase();
                                    if (lowerPosition.includes(lowerSectionName)) {
                                        if (!bestMatch || lowerSectionName.length > bestMatch.matchLength) {
                                            bestMatch = { bureau: bureau.name, department: dept.name, matchLength: lowerSectionName.length };
                                        }
                                    }
                                }
                            }
                        }
                        if (bestMatch) return { bureau: bestMatch.bureau, department: bestMatch.department };
                        
                        for (const dept of structure) {
                            for (const bureau of dept.bureaus) {
                                const lowerBureauName = bureau.name.toLowerCase();
                                if (lowerPosition.includes(lowerBureauName)) {
                                     if (!bestMatch || lowerBureauName.length > bestMatch.matchLength) {
                                        bestMatch = { bureau: bureau.name, department: dept.name, matchLength: lowerBureauName.length };
                                    }
                                }
                            }
                        }
                        if (bestMatch) return { bureau: bestMatch.bureau, department: bestMatch.department };

                        return { bureau: 'Tidak Ditemukan', department: 'Tidak Ditemukan' };
                    };

                    const data = employees.map(sub => {
                        const subMonthlyHours = monthRequests
                            .filter(r => r.profile_id === sub.id)
                            .reduce((sum, r) => sum + calculateHours(r), 0);
                        
                        const shiftDetails = shiftsMap.get(sub.default_shift || '');
                        const workType = shiftDetails?.work_day_type || 'shift';

                        const monthlyQuota = workType === 'shift'
                            ? config.max_hours_per_month_shift
                            : config.max_hours_per_month_non_shift;
                        
                        const percentage = monthlyQuota > 0 ? (subMonthlyHours / monthlyQuota) * 100 : 0;
                        
                        const orgDetails = findOrgDetails(sub.position, structure);
                        
                        return {
                            department: orgDetails.department,
                            bureau: orgDetails.bureau,
                            section: sub.position,
                            nik: sub.nik || '-',
                            nama: sub.full_name,
                            bulanan: { quota: monthlyQuota, terpakai: subMonthlyHours.toFixed(2), prosentase: percentage.toFixed(0) },
                        };
                    });
                    setReportData(data);
                } else {
                    setReportData([]);
                }
            } catch(err) {
                setError("Gagal memuat data monitoring lembur.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, selectedMonth, selectedYear, isSuperAdmin, mode]);

    
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return reportData.slice(start, end);
    }, [currentPage, pageSize, reportData]);
    
    const totalPages = Math.ceil(reportData.length / pageSize);

    const handleExportPDF = () => {
        if (paginatedData.length === 0) return;
        setIsGeneratingPDF(true);
        
        const input = document.getElementById('print-area');
    
        if (!input) {
            setIsGeneratingPDF(false);
            return;
        }
    
        html2canvas(input, { scale: 2, logging: false }).then((canvas) => {
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
            const fileName = `Monitoring_Quota_Lembur_${selectedYear}-${monthStr}.pdf`;
            pdf.save(fileName);
            
            setIsGeneratingPDF(false);
        }).catch(err => {
            console.error("Error generating PDF:", err);
            setIsGeneratingPDF(false);
        });
    };

    const handleDownload = () => {
        if (reportData.length === 0) return;

        const headers = ["Department", "Bureau", "Section/Posisi", "NIK", "Nama", "Quota Bulanan", "Terpakai", "Prosentase"];
        const csvRows = [headers.join(',')];

        reportData.forEach(row => {
            const csvRow = [
                `"${row.department}"`,
                `"${row.bureau}"`,
                `"${row.section}"`,
                `"${row.nik}"`,
                `"${row.nama}"`,
                row.bulanan.quota,
                row.bulanan.terpakai,
                `"${row.bulanan.prosentase}%"`
            ];
            csvRows.push(csvRow.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const fileName = `Monitoring_Lembur_${selectedYear}-${monthStr}.csv`;
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
         <div className="bg-white rounded-lg shadow-md p-6">
            <header className="mb-4">
                 <h3 className="text-xl font-bold text-gray-800">Monitoring Quota Lembur</h3>
            </header>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                 <div className="flex items-center gap-2">
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="p-2 border rounded-md text-sm">
                        {Array.from({length: 5}).map((_, i) => <option key={i} value={today.getFullYear() - i}>{today.getFullYear() - i}</option>)}
                    </select>
                     <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="p-2 border rounded-md text-sm">
                        {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('id-ID', {month: 'long'})}</option>)}
                    </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleDownload} className="flex items-center gap-2 p-2 bg-green-600 text-white rounded-md hover:bg-green-700 border">
                        <ExcelIcon className="h-5 w-5"/><span className="hidden sm:inline">Download</span><span className="inline sm:hidden">CSV</span>
                    </button>
                    <button 
                        onClick={handleExportPDF} 
                        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 border disabled:bg-red-400 disabled:cursor-wait" 
                        title="Cetak Laporan PDF"
                        disabled={loading || isGeneratingPDF}
                    >
                        {isGeneratingPDF ? <Spinner/> : <PrintIcon className="h-5 w-5"/>}
                        <span className="hidden sm:inline">{isGeneratingPDF ? 'Memproses...' : 'Cetak'}</span>
                        <span className="inline sm:hidden">{isGeneratingPDF ? '...' : 'PDF'}</span>
                    </button>
                    <span className="text-sm">Tampilkan</span>
                     <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="p-2 border rounded-md text-sm">
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                    <span className="text-sm">entri</span>
                </div>
            </div>
             <div id="print-area" className="overflow-x-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64"><Spinner /> Memuat data...</div>
                ) : error ? (
                    <div className="text-center p-8 text-red-500">{error}</div>
                ) : paginatedData.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">Tidak ada data untuk ditampilkan.</div>
                ) : (
                <table className="w-full text-sm text-left min-w-[1000px]">
                    <thead className="bg-gray-100 text-gray-600 font-bold">
                        <tr>
                            <th className="p-3 border">Department</th>
                            <th className="p-3 border">Bureau</th>
                            <th className="p-3 border">Section/Posisi</th>
                            <th className="p-3 border">NIK</th>
                            <th className="p-3 border">Nama</th>
                            <th className="p-3 border">Quota Bulanan</th>
                            <th className="p-3 border">Terpakai</th>
                            <th className="p-3 border">Prosentase</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((row, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="p-3 border">{row.department}</td>
                                <td className="p-3 border">{row.bureau}</td>
                                <td className="p-3 border">{row.section}</td>
                                <td className="p-3 border">{row.nik}</td>
                                <td className="p-3 border font-semibold">{row.nama}</td>
                                <td className="p-3 border">
                                     <span className="inline-flex items-center bg-green-200 text-green-900 text-xs font-medium px-2.5 py-1 rounded-full">
                                        {row.bulanan.quota} Jam
                                    </span>
                                </td>
                                <td className="p-3 border">
                                    <span className="inline-flex items-center bg-green-200 text-green-900 text-xs font-medium px-2.5 py-1 rounded-full">
                                        {row.bulanan.terpakai} Jam
                                    </span>
                                </td>
                                <td className="p-3 border">{row.bulanan.prosentase}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalRecords={reportData.length}
                pageSize={pageSize}
            />
        </div>
    );
};

export default MonitoringLembur;
