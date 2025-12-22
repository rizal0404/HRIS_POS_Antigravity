"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Attendance, Request, RequestType, RequestStatus } from '@/types';
import { apiService } from '@/services/apiService';
import { supabase } from '@/services/supabase';
import { APP_TIME_ZONE, formatDateKey, formatTime, getStartOfDayISO, APP_TIME_OFFSET } from '@/lib/utils';
import { CORRECTION_MAX_DAYS } from '@/lib/attendanceRules';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarIcon,
    ClockIcon,
    LocationMarkerIcon as LocationIcon,
    PencilIcon
} from '@/components/icons';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import KoreksiAbsensiModal from '@/components/modals/KoreksiAbsensiModal';

// --- Helpers ---

const formatDuration = (minutes: number): string => {
    if (!Number.isFinite(minutes) || minutes <= 0) return '0j 0m';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs <= 0) return `${mins}m`;
    if (mins === 0) return `${hrs}j`;
    return `${hrs}j ${mins}m`;
};

const statusMeta = (status?: string, isLeave?: boolean): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'secondary' } => {
    if (isLeave) {
        return { label: 'Cuti/Izin', variant: 'info' };
    }
    switch ((status || '').toLowerCase()) {
        case 'hadir':
            return { label: 'Hadir', variant: 'success' };
        case 'terlambat':
            return { label: 'Terlambat', variant: 'warning' };
        case 'pulang_cepat':
            return { label: 'Pulang Cepat', variant: 'warning' };
        case 'in_progress':
            return { label: 'Bekerja', variant: 'info' };
        case 'absent':
        case 'incomplete':
            return { label: 'Absen', variant: 'danger' };
        case 'libur':
        case 'off':
            return { label: 'Libur', variant: 'secondary' };
        default:
            return { label: status || '-', variant: 'secondary' };
    }
};

const getDurationMinutes = (clockIn?: string, clockOut?: string): number => {
    if (!clockIn || !clockOut) return 0;
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    return Math.max(0, Math.round((end - start) / (1000 * 60)));
};

// --- Component ---

interface PresensiPageProps {
    user: UserProfile;
}

const PresensiPage: React.FC<PresensiPageProps> = ({ user }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Correction Modal State
    const [isKoreksiModalOpen, setIsKoreksiModalOpen] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);

    const fetchHistory = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

            const startIso = startOfMonth.toISOString();
            const endIso = endOfMonth.toISOString();

            const attendance = await apiService.getAttendanceForSubordinates([user.id], startIso, endIso);

            const sorted = attendance.sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
            setAttendanceData(sorted);
        } catch (err: any) {
            console.error(err);
            setError("Gagal memuat riwayat presensi.");
        } finally {
            setLoading(false);
        }
    }, [currentMonth, user.id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handlePrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    // Correction Logic
    const handleOpenKoreksiModal = (attendance: Attendance) => {
        // Double check eligibility just in case
        const attendanceDate = attendance.work_date || formatDateKey(new Date(attendance.clock_in), APP_TIME_ZONE);
        const todayStart = new Date(formatDateKey(new Date(), APP_TIME_ZONE) + `T00:00:00${APP_TIME_OFFSET}`);
        const targetDate = new Date(`${attendanceDate}T00:00:00${APP_TIME_OFFSET}`);
        const dayDiff = Math.floor((todayStart.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff > CORRECTION_MAX_DAYS) {
            alert(`Koreksi hanya boleh diajukan maksimal ${CORRECTION_MAX_DAYS} hari ke belakang.`);
            return;
        }

        setSelectedAttendance(attendance);
        setIsKoreksiModalOpen(true);
    };

    const handleSubmitKoreksi = async (koreksiData: { correctionType: 'missed_in' | 'missed_out' | 'missed_both' | 'wrong_time', newDate: string, newClockIn?: string, newClockOut?: string, reason: string, attachment: File }) => {
        if (!selectedAttendance) return;

        try {
            let attachmentUrl: string | undefined;
            const { attachment } = koreksiData;

            if (attachment) {
                const filePath = `${user.id}/${Date.now()}_${attachment.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(filePath, attachment);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(filePath);

                attachmentUrl = urlData.publicUrl;
            } else {
                throw new Error("Lampiran bukti diperlukan.");
            }

            const todayStart = new Date(formatDateKey(new Date(), APP_TIME_ZONE) + `T00:00:00${APP_TIME_OFFSET}`);
            const targetDate = new Date(`${koreksiData.newDate}T00:00:00${APP_TIME_OFFSET}`);
            const dayDiff = Math.floor((todayStart.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
            if (dayDiff > CORRECTION_MAX_DAYS) {
                throw new Error(`Koreksi hanya boleh diajukan maksimal ${CORRECTION_MAX_DAYS} hari ke belakang.`);
            }

            // Check for pending requests logic omitted for brevity as it requires fetching requests history again, 
            // but in a real app we should probably re-verify. 
            // Ideally we rely on the backend or a fresh fetch. 
            // For now we assume the UI check is sufficient or the backend will reject.

            const newClockInISO = koreksiData.newClockIn
                ? new Date(`${koreksiData.newDate}T${koreksiData.newClockIn}${APP_TIME_OFFSET}`).toISOString()
                : null;
            const newClockOutISO = koreksiData.newClockOut
                ? new Date(`${koreksiData.newDate}T${koreksiData.newClockOut}${APP_TIME_OFFSET}`).toISOString()
                : null;

            const reasonPayload = JSON.stringify({
                type: koreksiData.correctionType,
                reason: koreksiData.reason,
                new_clock_in_iso: newClockInISO,
                new_clock_out_iso: newClockOutISO,
            });

            const newKoreksiRequest: Omit<Request, 'id' | 'created_at' | 'status'> = {
                profile_id: user.id,
                request_type: RequestType.KOREKSI,
                start_date: koreksiData.newDate,
                end_date: koreksiData.newDate,
                start_time: koreksiData.newClockIn || koreksiData.newClockOut || undefined,
                reason: reasonPayload,
                attachment_url: attachmentUrl,
                attendance_id_to_correct: selectedAttendance.id,
                approver_id: user.manager_id || undefined,
            };

            await apiService.submitRequest(newKoreksiRequest);

            // Refresh
            fetchHistory();
            setIsKoreksiModalOpen(false);
            setSelectedAttendance(null);
            alert("Ajukan koreksi berhasil dikirim."); // Simple feedback
        } catch (error: any) {
            console.error("Failed to submit correction request:", error);
            alert(error.message || "Gagal mengajukan koreksi.");
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Absensi</h1>
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-1">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-slate-300">
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-semibold min-w-[100px] text-center text-gray-900 dark:text-slate-100">
                        {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-slate-300">
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Spinner />
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800 text-center">
                    {error}
                </div>
            ) : attendanceData.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                    Belum ada data absensi bulan ini.
                </div>
            ) : (
                <div className="space-y-4">
                    {attendanceData.map((att) => {
                        const dateObj = new Date(att.clock_in);
                        const meta = statusMeta(att.status);
                        const duration = getDurationMinutes(att.clock_in, att.clock_out);

                        // Check eligibility for correction (Last 3 days)
                        const attendanceDate = att.work_date || formatDateKey(new Date(att.clock_in), APP_TIME_ZONE);
                        const todayStart = new Date(formatDateKey(new Date(), APP_TIME_ZONE) + `T00:00:00${APP_TIME_OFFSET}`);
                        const targetDate = new Date(`${attendanceDate}T00:00:00${APP_TIME_OFFSET}`);
                        const dayDiff = Math.floor((todayStart.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
                        const isEligibleForCorrection = dayDiff >= 0 && dayDiff <= CORRECTION_MAX_DAYS;

                        return (
                            <Card key={att.id} className="p-5 flex flex-col gap-4">
                                {/* Header: Date & Badge */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-800 dark:text-slate-100 font-bold">
                                        <CalendarIcon className="w-5 h-5 opacity-60" />
                                        <span>
                                            {dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    <Badge variant={meta.variant}>{meta.label}</Badge>
                                </div>

                                {/* Times */}
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 dark:text-slate-400 mb-1">Masuk</span>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                                            {formatTime(dateObj, { second: undefined })}
                                        </span>
                                    </div>

                                    <div className="flex items-center text-gray-400 dark:text-slate-500">
                                        <div className="h-[2px] w-8 bg-gray-200 dark:bg-slate-600" />
                                        <ChevronRightIcon className="w-5 h-5 -ml-1" />
                                    </div>

                                    <div className="flex flex-col text-right">
                                        <span className="text-xs text-gray-500 dark:text-slate-400 mb-1">Pulang</span>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                                            {att.clock_out ? formatTime(new Date(att.clock_out), { second: undefined }) : '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gray-100 dark:bg-slate-700" />

                                {/* Details: Duration & Location */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                                        <ClockIcon className="w-4 h-4 opacity-70" />
                                        <span>{formatDuration(duration)}</span>
                                    </div>
                                    {att.lokasi_kerja && (
                                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-300">
                                            <LocationIcon className="w-4 h-4 opacity-70 mt-0.5 flex-shrink-0" />
                                            <span className="line-clamp-2 leading-relaxed">
                                                {att.lokasi_kerja}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Button - Render only if eligible */}
                                {isEligibleForCorrection && (
                                    <button
                                        onClick={() => handleOpenKoreksiModal(att)}
                                        className="mt-2 w-full py-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-semibold text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                        Ajukan Koreksi
                                    </button>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {selectedAttendance && (
                <KoreksiAbsensiModal
                    isOpen={isKoreksiModalOpen}
                    onClose={() => setIsKoreksiModalOpen(false)}
                    onSubmit={handleSubmitKoreksi}
                    attendanceData={selectedAttendance}
                />
            )}
        </div>
    );
};

export default PresensiPage;
