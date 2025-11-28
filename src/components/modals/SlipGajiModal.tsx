"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, RequestStatus, RequestType, OvertimeConfiguration, Holiday, JadwalKerjaTim, Shift, Request } from '../../types';
import { apiService } from '../../services/apiService';
import { XIcon, PrintIcon } from '../icons';
import Spinner from '../ui/Spinner';

interface SlipGajiModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

// Helper to get user's work day type (shift vs non-shift)
const getUserWorkDayType = (
    userSchedule: JadwalKerjaTim[], 
    allShiftsMap: Map<string, Shift>,
    userProfile: UserProfile
): 'shift' | 'non-shift' => {
    if (userSchedule) {
        const firstWorkDay = userSchedule.find(d => d.shift !== 'OFF');
        if (firstWorkDay) {
            const shiftDetails = allShiftsMap.get(firstWorkDay.shift);
            if (shiftDetails) {
                return shiftDetails.work_day_type;
            }
        }
    }

    if (userProfile?.default_shift?.toLowerCase().includes('office hour') || userProfile?.default_shift?.toLowerCase().includes('non-shift')) {
        return 'non-shift';
    }
    
    return 'shift';
};

const SlipGajiModal: React.FC<SlipGajiModalProps> = ({ isOpen, onClose, user }) => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    
    // Data fetching states
    const [loading, setLoading] = useState(true);
    const [overtimeConfig, setOvertimeConfig] = useState<OvertimeConfiguration | null>(null);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [teamSchedule, setTeamSchedule] = useState<JadwalKerjaTim[]>([]);
    const [allShifts, setAllShifts] = useState<Shift[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
                const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
                
                const [configRes, holidaysRes, scheduleRes, shiftsRes, historyRes] = await Promise.all([
                    apiService.getOvertimeConfiguration(),
                    apiService.getHolidays(),
                    apiService.getTeamSchedules([user.id], startDate, endDate), // Pass date range
                    apiService.getShifts(),
                    apiService.getHistory(user.id)
                ]);
                setOvertimeConfig(configRes);
                setHolidays(holidaysRes);
                setTeamSchedule(scheduleRes);
                setAllShifts(shiftsRes);
                setRequests(historyRes.requests);
            } catch (error) {
                console.error("Failed to load slip gaji data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isOpen, user.id, selectedMonth, selectedYear]);

    const salaryData = useMemo(() => {
        if (loading || !overtimeConfig) {
            return {
                gajiPokok: 0, tunjanganJabatan: 0, tunjanganLain: 0, totalUpahLembur: 0,
                totalPendapatan: 0, potongan: 0, takeHomePay: 0,
            };
        }

        const salary = user.salary || { gaji_pokok: 0, tunjangan_jabatan: 0, tunjangan_lain: 0 };
        const { gaji_pokok: gajiPokok, tunjangan_jabatan: tunjanganJabatan, tunjangan_lain: tunjanganLain } = salary;
        const totalPendapatanRutin = gajiPokok + tunjanganJabatan + tunjanganLain;

        const approvedOvertimeRequests = requests.filter(req => {
            if (req.request_type !== RequestType.LEMBUR || req.status !== RequestStatus.APPROVED) {
                return false;
            }
            // Safer date parsing to avoid timezone issues with 'YYYY-MM-DD' strings
            const parts = req.start_date.split('-');
            const requestDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
        
            return requestDate.getFullYear() === selectedYear && requestDate.getMonth() === selectedMonth;
        });

        const upahPerJam = totalPendapatanRutin / overtimeConfig.hourly_wage_divider;
        let totalUpahLembur = 0;

        const nationalHolidaysInMonth = new Set(
            holidays
                .filter(h => {
                    const hDate = new Date(Date.parse(h.date + 'T00:00:00Z'));
                    return hDate.getUTCFullYear() === selectedYear && hDate.getUTCMonth() === selectedMonth;
                })
                .map(h => new Date(Date.parse(h.date + 'T00:00:00Z')).toISOString().split('T')[0])
        );

        // FIX: Add explicit type to resolve type inference error
        const allShiftsMap: Map<string, Shift> = new Map(allShifts.map(s => [s.code, s]));
        const userWorkDayType = getUserWorkDayType(teamSchedule, allShiftsMap, user);
        const userScheduleMap = new Map((teamSchedule || []).map(d => [d.date, d.shift]));

        approvedOvertimeRequests.forEach(req => {
            if (!req.start_time || !req.end_time) return;
            const start = new Date(`1970-01-01T${req.start_time}:00`);
            const end = new Date(`1970-01-01T${req.end_time}:00`);
            let durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            if (durationHours < 0) durationHours += 24;

            const overtimeDateStr = new Date(Date.parse(req.start_date + 'T00:00:00Z')).toISOString().split('T')[0];
            const isNationalHoliday = nationalHolidaysInMonth.has(overtimeDateStr);
            const shiftOnDay = userScheduleMap.get(req.start_date);
            const isRestDay = shiftOnDay === 'OFF';
            const isHolidayOvertime = isNationalHoliday || isRestDay;

            let upahLemburReq = 0;
            let remainingHours = durationHours;
            
            if (isHolidayOvertime) {
                if (userWorkDayType === 'shift') {
                    const rules = overtimeConfig.shift;
                    const firstHours = Math.min(remainingHours, 7);
                    upahLemburReq += firstHours * upahPerJam * rules.first_seven_hours_multiplier;
                    remainingHours -= firstHours;
                    
                    if (remainingHours > 0) {
                        const eighthHour = Math.min(remainingHours, 1);
                        upahLemburReq += eighthHour * upahPerJam * rules.eighth_hour_multiplier;
                        remainingHours -= eighthHour;
                    }
                    if (remainingHours > 0) {
                        const subsequentHours = Math.min(remainingHours, 3);
                        upahLemburReq += subsequentHours * upahPerJam * rules.ninth_to_eleventh_hour_multiplier;
                    }
                } else {
                    const rules = overtimeConfig.non_shift;
                    const firstHours = Math.min(remainingHours, 8);
                    upahLemburReq += firstHours * upahPerJam * rules.first_eight_hours_multiplier;
                    remainingHours -= firstHours;
                    
                    if (remainingHours > 0) {
                        const ninthHour = Math.min(remainingHours, 1);
                        upahLemburReq += ninthHour * upahPerJam * rules.ninth_hour_multiplier;
                        remainingHours -= ninthHour;
                    }
                    if (remainingHours > 0) {
                        const subsequentHours = Math.min(remainingHours, 3);
                        upahLemburReq += subsequentHours * upahPerJam * rules.tenth_to_twelfth_hour_multiplier;
                    }
                }
            } else {
                const rules = overtimeConfig.normal_day;
                if (remainingHours > 0) {
                    const firstHour = Math.min(remainingHours, 1);
                    upahLemburReq += firstHour * upahPerJam * rules.first_hour_multiplier;
                    remainingHours -= firstHour;
                }
                if (remainingHours > 0) {
                    upahLemburReq += remainingHours * upahPerJam * rules.subsequent_hours_multiplier;
                }
            }
            totalUpahLembur += upahLemburReq;
        });
        
        const totalPendapatan = totalPendapatanRutin + totalUpahLembur;
        const potongan = totalPendapatan * 0.05; // Placeholder 5% tax
        const takeHomePay = totalPendapatan - potongan;

        return { gajiPokok, tunjanganJabatan, tunjanganLain, totalUpahLembur, totalPendapatan, potongan, takeHomePay };

    }, [user, selectedMonth, selectedYear, loading, overtimeConfig, holidays, teamSchedule, allShifts, requests]);

    if (!isOpen) return null;

    const handlePrint = () => {
        const printContents = document.getElementById('slip-gaji-print-area')?.innerHTML;
        const originalContents = document.body.innerHTML;
        if (printContents) {
            document.body.innerHTML = printContents;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload();
        }
    };
    
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('id-ID', { month: 'long' });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                 <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">Slip Gaji</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 flex items-center justify-center gap-4 bg-gray-50">
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="p-2 border rounded-md text-sm">
                        {Array.from({length: 12}).map((_, i) => (
                            <option key={i} value={i}>{new Date(0, i).toLocaleString('id-ID', {month: 'long'})}</option>
                        ))}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="p-2 border rounded-md text-sm">
                        {Array.from({length: 5}).map((_, i) => (
                             <option key={currentYear - i} value={currentYear - i}>{currentYear - i}</option>
                        ))}
                    </select>
                </div>
                
                {loading ? (
                    <div className="p-6 text-center flex items-center justify-center h-96">
                        <Spinner />
                        <span className="ml-2 text-gray-600">Memuat data slip gaji...</span>
                    </div>
                ) : (
                    <div id="slip-gaji-print-area" className="p-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold">SLIP GAJI KARYAWAN</h2>
                            <p className="text-gray-600">Periode {monthName} {selectedYear}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                            <div>
                                <p><strong>Nama:</strong> {user.full_name}</p>
                                <p><strong>Jabatan:</strong> {user.position}</p>
                            </div>
                            <div className="text-right">
                                <p><strong>ID Pegawai:</strong> {user.id.toUpperCase()}</p>
                            </div>
                        </div>

                        <div className="border-t border-b py-4">
                            <div className="flex justify-between mb-2">
                                <span className="font-semibold text-gray-700">Pendapatan</span>
                                <span className="font-semibold text-gray-700">Jumlah</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-gray-600">Gaji Pokok</span><span>{formatCurrency(salaryData.gajiPokok)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">Tunjangan Jabatan</span><span>{formatCurrency(salaryData.tunjanganJabatan)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">Tunjangan Lainnya</span><span>{formatCurrency(salaryData.tunjanganLain)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">Upah Lembur</span><span>{formatCurrency(salaryData.totalUpahLembur)}</span></div>
                            </div>
                        </div>

                        <div className="flex justify-between font-bold py-2 text-md">
                            <span>Total Pendapatan</span>
                            <span>{formatCurrency(salaryData.totalPendapatan)}</span>
                        </div>

                        <div className="border-t border-b py-4">
                            <div className="flex justify-between mb-2">
                                <span className="font-semibold text-gray-700">Potongan</span>
                                <span className="font-semibold text-gray-700">Jumlah</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-gray-600">Pajak (PPh 21)</span><span>({formatCurrency(salaryData.potongan)})</span></div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between font-bold text-lg py-4 bg-gray-100 px-4 rounded-md mt-4">
                            <span>GAJI BERSIH (TAKE HOME PAY)</span>
                            <span>{formatCurrency(salaryData.takeHomePay)}</span>
                        </div>
                    </div>
                )}


                <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Tutup
                    </button>
                    <button onClick={handlePrint} disabled={loading} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                        <PrintIcon className="h-4 w-4 mr-2" />
                        Cetak Slip
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SlipGajiModal;