"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, Request, LeaveType, UserRole, RequestType } from '../../types';
import { apiService } from '../../services/apiService';
import { getAllSubordinates } from '../../lib/utils';
import Pagination from '../ui/Pagination';
import { SearchIcon, PrintIcon, ExcelIcon } from '../icons';
import Spinner from '../ui/Spinner';

interface QuotaCutiProps {
    user: UserProfile;
    mode?: 'self' | 'team';
}

const QuotaCuti: React.FC<QuotaCutiProps> = ({ user, mode = 'team' }) => {
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any[]>([]);
    const isSuperAdmin = user.role === UserRole.SUPERADMIN;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const users = await apiService.getProfiles();
                let employees: UserProfile[];
                let employeeIds: string[];

                if (mode === 'self') {
                    employees = [user];
                    employeeIds = [user.id];
                } else {
                    if (isSuperAdmin) {
                        employees = users;
                        employeeIds = users.map(u => u.id);
                    } else if (user.isManager) {
                        employees = getAllSubordinates(user.id, users);
                        employeeIds = employees.map(s => s.id);
                    } else {
                        employees = [user];
                        employeeIds = [user.id];
                    }
                }

                if (employeeIds.length === 0) {
                    setReportData([]);
                    setLoading(false);
                    return;
                }

                const [leaveTypes, requests] = await Promise.all([
                    apiService.getLeaveTypes(),
                    apiService.getLeaveRequestsForSubordinates(employeeIds, selectedYear),
                ]);

                const data = employees.flatMap(sub => {
                    return leaveTypes.map(lt => {
                        let requestsToConsider: Request[];

                        // Differentiate calculation based on leave type name
                        if (lt.name === 'Cuti Tahunan') {
                            requestsToConsider = requests.filter(r => 
                                r.profile_id === sub.id && r.request_type === RequestType.CUTI
                            );
                        } else if (lt.name === 'Sakit') {
                             requestsToConsider = requests.filter(r => 
                                r.profile_id === sub.id && (r.request_type === RequestType.SAKIT || r.request_type === RequestType.IZIN)
                            );
                        } else {
                            requestsToConsider = [];
                        }

                        const daysTaken = requestsToConsider.reduce((total, req) => {
                            // Priority: Use pre-calculated work days if available
                            try {
                                if (req.reason && req.reason.startsWith('{')) {
                                    const parsedReason = JSON.parse(req.reason);
                                    if (parsedReason.leave_days && typeof parsedReason.leave_days === 'number') {
                                        return total + parsedReason.leave_days;
                                    }
                                }
                            } catch (e) { /* Fallback for non-JSON reasons */ }
                            
                            // Fallback for old data: calculate date difference
                            const start = new Date(req.start_date);
                            const end = new Date(req.end_date);
                            const diffTime = Math.abs(end.getTime() - start.getTime());
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            return total + diffDays;
                        }, 0);

                        return {
                            namaKaryawan: sub.full_name,
                            jenisCuti: lt.name,
                            periode: selectedYear,
                            masaBerlaku: `31-12-${selectedYear}`,
                            quota: lt.default_quota,
                            diambil: daysTaken,
                            sisa: lt.default_quota - daysTaken
                        };
                    });
                });
                setReportData(data);
            } catch (err) {
                setError("Gagal memuat data kuota cuti.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, selectedYear, isSuperAdmin, mode]);

    
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return reportData.slice(start, end);
    }, [currentPage, pageSize, reportData]);

    const totalPages = Math.ceil(reportData.length / pageSize);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        if (reportData.length === 0) return;

        const headers = ["Nama Karyawan", "Jenis Cuti", "Periode", "Masa Berlaku", "Quota", "Diambil", "Sisa"];
        const csvRows = [headers.join(',')];

        reportData.forEach(row => {
            const csvRow = [
                `"${row.namaKaryawan}"`,
                `"${row.jenisCuti}"`,
                row.periode,
                row.masaBerlaku,
                row.quota,
                row.diambil,
                row.sisa
            ];
            csvRows.push(csvRow.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const fileName = `Laporan_Quota_Cuti_${selectedYear}.csv`;
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
         <div className="bg-white rounded-lg shadow-md p-6">
            <header className="mb-4">
                 <h3 className="text-xl font-bold text-gray-800">Quota Cuti Bawahan</h3>
            </header>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                 <div className="flex items-center gap-2">
                     <label className="text-sm font-medium">Tahun</label>
                     <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="p-2 border rounded-md text-sm">
                        {Array.from({length: 5}).map((_, i) => <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDownload} className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 border" title="Download as CSV">
                        <ExcelIcon className="h-5 w-5"/>
                    </button>
                    <button onClick={handlePrint} className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 border" title="Cetak Laporan">
                        <PrintIcon className="h-5 w-5"/>
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
                <table className="w-full text-sm text-left min-w-[800px]">
                    <thead className="bg-gray-100 text-gray-600 font-bold">
                        <tr>
                            <th className="p-3">Nama Karyawan</th>
                            <th className="p-3">Jenis Cuti</th>
                            <th className="p-3">Periode</th>
                            <th className="p-3">Masa Berlaku</th>
                            <th className="p-3">Quota</th>
                            <th className="p-3">Diambil</th>
                            <th className="p-3">Sisa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((row, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-semibold">{row.namaKaryawan}</td>
                                <td className="p-3">{row.jenisCuti}</td>
                                <td className="p-3">{row.periode}</td>
                                <td className="p-3">{row.masaBerlaku}</td>
                                <td className="p-3">{row.quota} {typeof row.quota === 'number' ? 'Hari' : ''}</td>
                                <td className="p-3">{row.diambil} {typeof row.diambil === 'number' ? 'Hari' : ''}</td>
                                <td className="p-3 font-bold">{row.sisa} {typeof row.sisa === 'number' ? 'Hari' : ''}</td>
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

export default QuotaCuti;