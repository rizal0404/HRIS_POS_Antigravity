"use client";

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { UserProfile, Request, Attendance, RequestStatus, RequestType, AttendanceStatus } from '../../../types';
import { apiService } from '../../../services/apiService';
import KoreksiAbsensiModal from '../../../components/modals/KoreksiAbsensiModal';
import DetailAbsensiModal from '../../../components/modals/DetailAbsensiModal';
import DetailAjuanModal from '../../../components/modals/DetailAjuanModal';
import { SearchIcon, XIcon, FilterIcon, CalendarIcon, BriefcaseIcon, ClockIcon, LocationMarkerIcon, RefreshIcon, CheckCircleIcon, DocumentAddIcon } from '../../../components/icons';
import api from '../../../services/apiClient';
import { APP_TIME_OFFSET, APP_TIME_ZONE, formatDateKey, formatDate } from '../../../lib/utils';
import { CORRECTION_MAX_DAYS } from '../../../lib/attendanceRules';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

type HistoryEvent = (Request & { type: 'request' }) | (Attendance & { type: 'attendance' });

interface RiwayatPageProps {
    user: UserProfile;
}

const getStatusBadge = (status: string) => {
    const baseStyles = "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border";

    // Attendance Statuses
    if (status === AttendanceStatus.ON_TIME || status === RequestStatus.APPROVED) {
        return <span className={`${baseStyles} bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800`}>Disetujui / On Time</span>;
    }
    if (status === AttendanceStatus.LATE) {
        return <span className={`${baseStyles} bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800`}>Terlambat</span>;
    }
    if (status === AttendanceStatus.ABSENT || status === RequestStatus.REJECTED) {
        return <span className={`${baseStyles} bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800`}>Absen / Ditolak</span>;
    }
    if (status === RequestStatus.PENDING) {
        return <span className={`${baseStyles} bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800`}>Menunggu</span>;
    }

    // Default fallback
    return <span className={`${baseStyles} bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600`}>{status.replace(/_/g, ' ')}</span>;
};

const getTypeIcon = (type: string, isAttendance: boolean) => {
    if (isAttendance) return <LocationMarkerIcon className="w-5 h-5 text-blue-600" />;

    switch (type) {
        case RequestType.CUTI: return <BriefcaseIcon className="w-5 h-5 text-orange-600" />;
        case RequestType.SAKIT: return <span className="material-symbols-outlined text-[20px] text-red-600">thermometer</span>;
        case RequestType.LEMBUR: return <ClockIcon className="w-5 h-5 text-blue-600" />;
        case RequestType.SUBSTITUSI: return <RefreshIcon className="w-5 h-5 text-teal-600" />;
        case RequestType.KOREKSI: return <RefreshIcon className="w-5 h-5 text-purple-600" />;
        default: return <DocumentAddIcon className="w-5 h-5 text-gray-600" />;
    }
};

const RiwayatPage: React.FC<RiwayatPageProps> = ({ user }) => {
    const todayKey = useMemo(() => formatDateKey(new Date(), APP_TIME_ZONE), []);
    const yesterdayKey = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return formatDateKey(d, APP_TIME_ZONE);
    }, []);

    const [isKoreksiModalOpen, setIsKoreksiModalOpen] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);

    // State for all history data
    const [history, setHistory] = useState<HistoryEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // State for Detail Modals
    const [isDetailAbsensiModalOpen, setIsDetailAbsensiModalOpen] = useState(false);
    const [selectedAttendanceForDetail, setSelectedAttendanceForDetail] = useState<Attendance | null>(null);
    const [isDetailAjuanModalOpen, setIsDetailAjuanModalOpen] = useState(false);
    const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<Request | null>(null);

    // Filter states
    const [startDate, setStartDate] = useState(yesterdayKey);
    const [endDate, setEndDate] = useState(todayKey);
    const [searchTerm, setSearchTerm] = useState('');

    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const [historyData, usersData] = await Promise.all([
                apiService.getHistory(user.id),
                apiService.getProfiles()
            ]);

            const userRequests = historyData.requests.map(req => ({ ...req, type: 'request' as const }));
            const userAttendance = historyData.attendance.map(att => ({ ...att, type: 'attendance' as const }));

            const combined = [...userRequests, ...userAttendance];
            combined.sort((a, b) => {
                const dateA = new Date('clock_in' in a ? a.clock_in : a.created_at).getTime();
                const dateB = new Date('clock_in' in b ? b.clock_in : b.created_at).getTime();
                return dateB - dateA;
            });

            setHistory(combined);
            setAllUsers(usersData);

        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);


    const handleOpenKoreksiModal = (attendance: Attendance) => {
        const attendanceDate = attendance.work_date || formatDateKey(new Date(attendance.clock_in), APP_TIME_ZONE);
        const todayStart = new Date(formatDateKey(new Date(), APP_TIME_ZONE) + `T00:00:00${APP_TIME_OFFSET}`);
        const targetDate = new Date(`${attendanceDate}T00:00:00${APP_TIME_OFFSET}`);
        const dayDiff = Math.floor((todayStart.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff > CORRECTION_MAX_DAYS) {
            alert(`Koreksi hanya boleh diajukan maksimal ${CORRECTION_MAX_DAYS} hari ke belakang.`);
            return;
        }

        const hasPending = history.some(
            (item) =>
                item.type === 'request' &&
                item.request_type === RequestType.KOREKSI &&
                item.status === RequestStatus.PENDING &&
                (item.attendance_id_to_correct === attendance.id || item.start_date === attendanceDate),
        );

        if (hasPending) {
            alert('Sudah ada ajuan koreksi yang masih pending untuk tanggal tersebut.');
            return;
        }

        setSelectedAttendance(attendance);
        setIsKoreksiModalOpen(true);
    };

    const handleOpenKoreksiLatest = () => {
        const placeholder: Attendance = {
            id: 'placeholder',
            profile_id: user.id,
            clock_in: new Date().toISOString(),
            status: 'in_progress',
            lokasi_kerja: '',
            tempat_kerja: '',
        };
        handleOpenKoreksiModal(placeholder);
    };

    const handleCloseKoreksiModal = () => {
        setSelectedAttendance(null);
        setIsKoreksiModalOpen(false);
    };

    const handleDetailClick = (item: HistoryEvent) => {
        if (item.type === 'attendance') {
            setSelectedAttendanceForDetail(item);
            setIsDetailAbsensiModalOpen(true);
        } else { // item.type === 'request'
            setSelectedRequestForDetail(item);
            setIsDetailAjuanModalOpen(true);
        }
    };

    const handleSubmitKoreksi = async (koreksiData: { correctionType: 'missed_in' | 'missed_out' | 'missed_both' | 'wrong_time', newDate: string, newClockIn?: string, newClockOut?: string, reason: string, attachment: File }) => {
        if (!selectedAttendance) return;

        try {
            let attachmentUrl: string | undefined;
            const { attachment } = koreksiData;

            if (attachment) {
                const formData = new FormData();
                formData.append('file', attachment);
                formData.append('profile_id', user.id);
                const uploadResult = await api.upload<{ url: string }>('/api/attachments/upload', formData);
                attachmentUrl = uploadResult.url;
            } else {
                throw new Error("Lampiran bukti diperlukan.");
            }

            const todayStart = new Date(formatDateKey(new Date(), APP_TIME_ZONE) + `T00:00:00${APP_TIME_OFFSET}`);
            const targetDate = new Date(`${koreksiData.newDate}T00:00:00${APP_TIME_OFFSET}`);
            const dayDiff = Math.floor((todayStart.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
            if (dayDiff > CORRECTION_MAX_DAYS) {
                throw new Error(`Koreksi hanya boleh diajukan maksimal ${CORRECTION_MAX_DAYS} hari ke belakang.`);
            }

            const pendingExisting = await api.get<any[]>(`/api/requests?profile_id=${user.id}&request_type=${RequestType.KOREKSI}&status=${RequestStatus.PENDING}&start_date=${koreksiData.newDate}&limit=1`);

            if (pendingExisting && pendingExisting.length > 0) {
                throw new Error('Sudah ada ajuan koreksi yang masih pending untuk tanggal tersebut.');
            }

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

            const attendanceIdToCorrect = selectedAttendance.id && selectedAttendance.id !== 'placeholder'
                ? selectedAttendance.id
                : undefined;

            const newKoreksiRequest: Omit<Request, 'id' | 'created_at' | 'status'> = {
                profile_id: user.id,
                request_type: RequestType.KOREKSI,
                start_date: koreksiData.newDate,
                end_date: koreksiData.newDate,
                start_time: koreksiData.newClockIn || koreksiData.newClockOut || undefined,
                reason: reasonPayload,
                attachment_url: attachmentUrl,
                attendance_id_to_correct: attendanceIdToCorrect,
                approver_id: user.manager_id || undefined,
            };

            await apiService.submitRequest(newKoreksiRequest);
            fetchHistory(); // Refresh data
        } catch (error) {
            console.error("Failed to submit correction request:", error);
        } finally {
            handleCloseKoreksiModal();
        }
    };


    const handleClearFilters = () => {
        setStartDate(yesterdayKey);
        setEndDate(todayKey);
        setSearchTerm('');
    };

    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const attendanceDateKey = item.type === 'attendance'
                ? (item.work_date || formatDateKey(new Date(item.clock_in), APP_TIME_ZONE))
                : item.start_date;
            const itemDate = new Date(`${attendanceDateKey}T00:00:00${APP_TIME_OFFSET}`);

            const isAfterStartDate = !startDate || itemDate >= new Date(new Date(startDate).setHours(0, 0, 0, 0));
            const isBeforeEndDate = !endDate || itemDate <= new Date(new Date(endDate).setHours(0, 0, 0, 0));

            let searchTermMatch = !searchTerm;
            if (searchTerm) {
                const lowerSearchTerm = searchTerm.toLowerCase();
                if (item.type === 'request') {
                    searchTermMatch = item.request_type.toLowerCase().includes(lowerSearchTerm) ||
                        item.reason.toLowerCase().includes(lowerSearchTerm);
                } else { // 'attendance'
                    searchTermMatch = item.status.replace('_', ' ').toLowerCase().includes(lowerSearchTerm) ||
                        (item.lokasi_kerja && item.lokasi_kerja.toLowerCase().includes(lowerSearchTerm)) ||
                        (item.tempat_kerja && item.tempat_kerja.toLowerCase().includes(lowerSearchTerm));
                }
            }

            return isAfterStartDate && isBeforeEndDate && searchTermMatch;
        });
    }, [history, startDate, endDate, searchTerm]);


    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header */}
            <header className="flex-none px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Riwayat Aktivitas</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pantau kehadiran dan status pengajuan Anda.</p>
                </div>
                <button
                    onClick={handleOpenKoreksiLatest}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-lg shadow-slate-200 dark:shadow-slate-900"
                >
                    <span className="material-symbols-outlined mr-2 text-[18px]">edit_calendar</span>
                    Ajukan Koreksi
                </button>
            </header>

            {/* Filters & Content Window */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Filters */}
                    <Card className="p-4 bg-white dark:bg-slate-800 sticky top-0 z-10 shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Date Range */}
                            <div className="flex flex-1 gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Dari</span>
                                    </div>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 text-sm border-slate-200 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-semibold"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Smp</span>
                                    </div>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        min={startDate}
                                        className="block w-full pl-10 pr-3 py-2.5 text-sm border-slate-200 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-semibold"
                                    />
                                </div>
                            </div>

                            {/* Search */}
                            <div className="flex-[2]">
                                <div className="relative flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <SearchIcon className="h-5 w-5 text-slate-400 dark:text-slate-500 text-[20px]" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Cari aktivitas..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2.5 text-sm border-slate-200 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        />
                                    </div>
                                    {searchTerm || startDate !== yesterdayKey || endDate !== todayKey ? (
                                        <button
                                            onClick={handleClearFilters}
                                            className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                            title="Reset Filter"
                                        >
                                            <XIcon className="h-5 w-5 text-[20px]" />
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Content List */}
                    {loading ? (
                        <div className="flex flex-col justify-center items-center py-20">
                            <Spinner className="w-8 h-8 text-blue-600 mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Memuat riwayat...</p>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                                <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-500 text-[32px]" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tidak ada riwayat ditemukan</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                                {history.length === 0
                                    ? "Anda belum memiliki riwayat aktivitas."
                                    : "Coba ubah filter tanggal atau kata kunci pencarian Anda."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredHistory.map(item => {
                                const isAttendance = item.type === 'attendance';
                                const date = isAttendance ? (item.work_date || item.clock_in) : item.start_date;
                                const title = isAttendance ? 'Kehadiran' : item.request_type;
                                const subTitle = isAttendance
                                    ? (item.clock_in ? `Masuk: ${new Date(item.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : 'Belum Absen')
                                    : item.reason;

                                return (
                                    <Card
                                        key={`${item.type}-${item.id}`}
                                        className="p-4 hover:shadow-md transition-shadow cursor-pointer border border-slate-100 dark:border-slate-700 group"
                                        onClick={() => handleDetailClick(item)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Icon Box */}
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isAttendance ? 'bg-blue-50 dark:bg-blue-900/30' :
                                                item.request_type === RequestType.CUTI ? 'bg-orange-50 dark:bg-orange-900/30' :
                                                    item.request_type === RequestType.SAKIT ? 'bg-red-50 dark:bg-red-900/30' : 'bg-slate-50 dark:bg-slate-700'
                                                }`}>
                                                {getTypeIcon(isAttendance ? 'ATTENDANCE' : item.request_type, isAttendance)}
                                            </div>

                                            {/* Main Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate pr-2 capitalize">
                                                        {title.replace(/_/g, ' ').toLowerCase()}
                                                    </h3>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                                                        {formatDate(new Date(date))}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                                                        {isAttendance && item.lokasi_kerja ? item.lokasi_kerja : subTitle}
                                                    </p>
                                                    {getStatusBadge(item.status)}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {selectedAttendance && (
                <KoreksiAbsensiModal
                    isOpen={isKoreksiModalOpen}
                    onClose={handleCloseKoreksiModal}
                    onSubmit={handleSubmitKoreksi}
                    attendanceData={selectedAttendance}
                />
            )}

            <DetailAbsensiModal
                isOpen={isDetailAbsensiModalOpen}
                onClose={() => setIsDetailAbsensiModalOpen(false)}
                attendance={selectedAttendanceForDetail}
                user={user}
            />

            <DetailAjuanModal
                isOpen={isDetailAjuanModalOpen}
                onClose={() => setIsDetailAjuanModalOpen(false)}
                request={selectedRequestForDetail}
                allUsers={allUsers}
            />

        </div>
    );
};

export default RiwayatPage;
