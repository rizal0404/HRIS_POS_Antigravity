"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, Request, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { getAllSubordinates } from '../../lib/utils';
import Pagination from '../ui/Pagination';
import { SearchIcon, PrintIcon, ExcelIcon } from '../icons';
import Spinner from '../ui/Spinner';

interface RekapLemburProps {
    user: UserProfile;
    mode?: 'self' | 'team';
}

const RekapLembur: React.FC<RekapLemburProps> = ({ user, mode = 'team' }) => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [overtimeRequests, setOvertimeRequests] = useState<Request[]>([]);
    const isPrivileged = user.role === UserRole.SUPERADMIN || user.role === UserRole.ADMIN;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const users = await apiService.getProfiles();
                let employeeIds: string[];

                if (mode === 'self') {
                    employeeIds = [user.id];
                } else {
                    if (isPrivileged) {
                        employeeIds = users.map(u => u.id);
                    } else if (user.isManager) {
                        const subordinates = getAllSubordinates(user.id, users);
                        employeeIds = subordinates.map(s => s.id);
                    } else {
                        employeeIds = [user.id];
                    }
                }

                if (employeeIds.length > 0) {
                    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
                    const endDate = new Date(selectedYear, selectedMonth + 1, 0).toLocaleDateString('en-CA');
                    const requests = await apiService.getOvertimeRequestsForSubordinates(employeeIds, startDate, endDate);
                    setOvertimeRequests(requests);
                } else {
                    setOvertimeRequests([]);
                }
            } catch (err) {
                setError("Gagal memuat data lembur.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, selectedMonth, selectedYear, isPrivileged, mode]);

    const processedData = useMemo(() => {
        let accumulatedHours: { [key: string]: number } = {};

        return overtimeRequests.map(req => {
            let totalJamLembur = 0;
            if (req.start_time && req.end_time) {
                const start = new Date(`1970-01-01T${req.start_time}`);
                const end = new Date(`1970-01-01T${req.end_time}`);
                let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                if (diff < 0) diff += 24; // Handles overnight shifts
                totalJamLembur = Math.round(diff * 100) / 100;
            }

            if (!accumulatedHours[req.profile_id]) {
                accumulatedHours[req.profile_id] = 0;
            }
            accumulatedHours[req.profile_id] += totalJamLembur;

            return {
                noKaryawan: req.profiles?.nik || '-',
                namaKaryawan: req.profiles?.full_name || 'N/A',
                tanggalLembur: req.start_date,
                jamLembur: `${req.start_time} - ${req.end_time}`,
                totalJamLembur,
                shift1: '', // Placeholder, requires shift data
                shift2: '', // Placeholder
                shift3: '', // Placeholder
                akumulasi: Math.round(accumulatedHours[req.profile_id] * 100) / 100,
            };
        });
    }, [overtimeRequests]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return processedData.slice(start, end);
    }, [currentPage, pageSize, processedData]);

    const totalPages = Math.ceil(processedData.length / pageSize);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        if (processedData.length === 0) return;

        const headers = ["No Karyawan", "Nama Karyawan", "Tanggal Lembur", "Jam Lembur", "Total Jam Lembur", "Shift 1", "Shift 2", "Shift 3", "Akumulasi"];
        const csvRows = [headers.join(',')];

        processedData.forEach(row => {
            const csvRow = [
                `"${row.noKaryawan}"`,
                `"${row.namaKaryawan}"`,
                new Date(row.tanggalLembur + "T00:00:00").toLocaleDateString('id-ID'),
                `"${row.jamLembur}"`,
                row.totalJamLembur,
                row.shift1,
                row.shift2,
                row.shift3,
                row.akumulasi
            ];
            csvRows.push(csvRow.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const fileName = `Rekap_Lembur_${selectedYear}-${monthStr}.csv`;
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <header className="mb-4">
                <h3 className="text-xl font-bold text-gray-800">Rekap Data Lembur Karyawan</h3>
            </header>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-2">
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="p-2 border rounded-md text-sm">
                        {Array.from({ length: 5 }).map((_, i) => <option key={i} value={today.getFullYear() - i}>{today.getFullYear() - i}</option>)}
                    </select>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="p-2 border rounded-md text-sm">
                        {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDownload} className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 border" title="Download as CSV">
                        <ExcelIcon className="h-5 w-5" />
                    </button>
                    <button onClick={handlePrint} className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 border" title="Cetak Laporan">
                        <PrintIcon className="h-5 w-5" />
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
                    <div className="text-center p-8 text-gray-500">Tidak ada data lembur untuk periode ini.</div>
                ) : (
                    <table className="w-full text-sm text-left min-w-[900px]">
                        <thead className="bg-gray-100 text-gray-600 font-bold">
                            <tr>
                                <th className="p-3">No Karyawan</th>
                                <th className="p-3">Nama Karyawan</th>
                                <th className="p-3">Tanggal Lembur</th>
                                <th className="p-3">Jam Lembur</th>
                                <th className="p-3">Total Jam Lembur</th>
                                <th className="p-3">Shift 1</th>
                                <th className="p-3">Shift 2</th>
                                <th className="p-3">Shift 3</th>
                                <th className="p-3">Akumulasi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="p-3">{row.noKaryawan}</td>
                                    <td className="p-3">{row.namaKaryawan}</td>
                                    <td className="p-3">{new Date(row.tanggalLembur + "T00:00:00").toLocaleDateString('id-ID')}</td>
                                    <td className="p-3">{row.jamLembur}</td>
                                    <td className="p-3">{row.totalJamLembur} Jam</td>
                                    <td className="p-3">{row.shift1}</td>
                                    <td className="p-3">{row.shift2}</td>
                                    <td className="p-3">{row.shift3}</td>
                                    <td className="p-3">{row.akumulasi} Jam</td>
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
                totalRecords={processedData.length}
                pageSize={pageSize}
            />
        </div>
    );
};

export default RekapLembur;
