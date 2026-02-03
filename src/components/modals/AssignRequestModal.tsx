"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { XIcon } from '../icons';
import { apiService } from '../../services';
import Spinner from '../ui/Spinner';
import { UserProfile } from '../../types';

interface MissingAttendanceInfo {
    subordinate: { id: string; full_name: string; nik: string | null };
    scheduled_shift: string | null;
    missing_date: string;
}

interface AssignRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    manager: UserProfile;
}

const AssignRequestModal: React.FC<AssignRequestModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    manager,
}) => {
    const [requestType, setRequestType] = useState<'Cuti' | 'Lembur'>('Cuti');
    const [selectedSubordinateId, setSelectedSubordinateId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [startTime, setStartTime] = useState('17:00');
    const [endTime, setEndTime] = useState('21:00');
    const [autoApprove, setAutoApprove] = useState(true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [missingAttendance, setMissingAttendance] = useState<MissingAttendanceInfo[]>([]);
    const [loadingMissing, setLoadingMissing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Fetch subordinates with missing attendance
    useEffect(() => {
        if (!isOpen) return;

        const fetchMissingAttendance = async () => {
            setLoadingMissing(true);
            try {
                const data = await apiService.getSubordinatesMissingAttendance(manager.id, selectedDate);
                setMissingAttendance(data);
            } catch (err) {
                console.error('Failed to fetch missing attendance:', err);
            } finally {
                setLoadingMissing(false);
            }
        };

        fetchMissingAttendance();
    }, [isOpen, manager.id, selectedDate]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setRequestType('Cuti');
            setSelectedSubordinateId('');
            setStartDate(selectedDate);
            setEndDate(selectedDate);
            setReason('Tidak hadir tanpa keterangan');
            setStartTime('17:00');
            setEndTime('21:00');
            setAutoApprove(true);
            setError(null);
        }
    }, [isOpen, selectedDate]);

    // Auto-select subordinate from missing attendance
    const handleSelectMissing = (item: MissingAttendanceInfo) => {
        setSelectedSubordinateId(item.subordinate.id);
        setStartDate(item.missing_date);
        setEndDate(item.missing_date);
        setReason(`Tidak hadir pada jadwal ${item.scheduled_shift}`);
    };

    // Get selected subordinate info
    const selectedSubordinate = useMemo(() => {
        return missingAttendance.find(m => m.subordinate.id === selectedSubordinateId) || null;
    }, [missingAttendance, selectedSubordinateId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubordinateId) {
            setError('Pilih bawahan terlebih dahulu');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await apiService.assignRequestForSubordinate({
                managerId: manager.id,
                subordinateId: selectedSubordinateId,
                requestType,
                startDate,
                endDate: requestType === 'Lembur' ? startDate : endDate,
                reason,
                startTime: requestType === 'Lembur' ? startTime : undefined,
                endTime: requestType === 'Lembur' ? endTime : undefined,
                autoApprove,
            });
            onSuccess();
        } catch (err: any) {
            let errorMessage = err.message || 'Gagal menyimpan pengajuan.';
            if (err.message === 'DUPLICATE_REQUEST') {
                errorMessage = 'Pengajuan serupa sudah ada untuk tanggal yang dipilih.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = useMemo(() => {
        if (!selectedSubordinateId || !startDate || !reason.trim()) return false;
        if (requestType === 'Cuti' && (!endDate || new Date(endDate) < new Date(startDate))) return false;
        if (requestType === 'Lembur' && (!startTime || !endTime)) return false;
        return true;
    }, [selectedSubordinateId, startDate, endDate, reason, requestType, startTime, endTime]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                        Assign Cuti/Lembur untuk Bawahan
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        {error && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-sm rounded">
                                <p>{error}</p>
                            </div>
                        )}

                        {/* Date Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tanggal untuk Dicek
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                            />
                        </div>

                        {/* Missing Attendance List */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Bawahan Tidak Hadir
                            </label>
                            {loadingMissing ? (
                                <div className="flex items-center justify-center p-4">
                                    <Spinner />
                                    <span className="ml-2 text-sm text-gray-500">Memuat data...</span>
                                </div>
                            ) : missingAttendance.length === 0 ? (
                                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-md text-sm">
                                    ✓ Semua bawahan sudah hadir pada tanggal ini
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {missingAttendance.map((item) => (
                                        <button
                                            key={item.subordinate.id}
                                            type="button"
                                            onClick={() => handleSelectMissing(item)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all ${selectedSubordinateId === item.subordinate.id
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-slate-600 hover:border-blue-300'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {item.subordinate.full_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Jadwal: {item.scheduled_shift}
                                                    </p>
                                                </div>
                                                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
                                                    Tidak Hadir
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Subordinate Info */}
                        {selectedSubordinate && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3 rounded-md">
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                    <span className="font-medium">⚠️ {selectedSubordinate.subordinate.full_name}</span> tidak hadir
                                    pada {selectedSubordinate.missing_date}<br />
                                    <span className="text-xs">Jadwal: {selectedSubordinate.scheduled_shift}</span>
                                </p>
                            </div>
                        )}

                        {/* Request Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Jenis Ajuan
                            </label>
                            <select
                                value={requestType}
                                onChange={(e) => setRequestType(e.target.value as 'Cuti' | 'Lembur')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                            >
                                <option value="Cuti">Cuti</option>
                                <option value="Lembur">Lembur</option>
                            </select>
                        </div>

                        {/* Date Range (for Leave) */}
                        {requestType === 'Cuti' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tanggal Mulai
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tanggal Selesai
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        min={startDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Date and Time (for Overtime) */}
                        {requestType === 'Lembur' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tanggal Lembur
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Jam Mulai
                                        </label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Jam Selesai
                                        </label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Alasan
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                                placeholder="Alasan penetapan cuti/lembur..."
                                required
                            />
                        </div>

                        {/* Auto-approve checkbox */}
                        <label className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer border border-blue-100 dark:border-blue-800">
                            <input
                                type="checkbox"
                                checked={autoApprove}
                                onChange={(e) => setAutoApprove(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-blue-800 dark:text-blue-300">
                                Langsung approve dan potong kuota cuti
                            </span>
                        </label>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-gray-50 dark:bg-slate-900 flex justify-end space-x-3 border-t border-gray-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid || loading}
                            className="w-36 flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? <Spinner /> : 'Assign & Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignRequestModal;
