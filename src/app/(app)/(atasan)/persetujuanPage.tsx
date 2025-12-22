"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserProfile, Request, RequestStatus, RequestType, Attendance, AttendanceStatus } from '../../../types';
import { apiService } from '../../../services/apiService';
import { formatDate, getAllSubordinates } from '../../../lib/utils';
import { SearchIcon, FilterIcon, BriefcaseIcon, ClockIcon, RefreshIcon, DocumentAddIcon, CheckCircleIcon, XIcon } from '../../../components/icons';
import DetailAjuanModal from '../../../components/modals/DetailAjuanModal';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import { computeAttendanceOutcome } from '../../../lib/attendanceRules';

interface PersetujuanPageProps {
    user: UserProfile;
}

// Reuse the badge logic from dashboard for consistency
const getRequestBadge = (type: RequestType) => {
    const baseStyles = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap";
    switch (type) {
        case RequestType.CUTI:
            return <span className={`${baseStyles} bg-orange-100 text-orange-700`}><BriefcaseIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Cuti</span>;
        case RequestType.SAKIT:
            return <span className={`${baseStyles} bg-red-100 text-red-700`}><span className="material-symbols-outlined text-[14px] flex-shrink-0">thermometer</span>Sakit</span>;
        case RequestType.LEMBUR:
            return <span className={`${baseStyles} bg-blue-100 text-blue-700`}><ClockIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Lembur</span>;
        case RequestType.SUBSTITUSI:
            return <span className={`${baseStyles} bg-teal-100 text-teal-700`}><RefreshIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Tukar Shift</span>;
        case RequestType.KOREKSI:
            return <span className={`${baseStyles} bg-purple-100 text-purple-700`}><RefreshIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Koreksi</span>;
        case RequestType.IZIN:
            return <span className={`${baseStyles} bg-indigo-100 text-indigo-700`}><DocumentAddIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Izin</span>;
        default:
            return <span className={`${baseStyles} bg-gray-100 text-gray-700`}>{type}</span>;
    }
};

const getStatusBadge = (status: RequestStatus) => {
    const baseStyles = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap";
    switch (status) {
        case RequestStatus.PENDING:
            return <span className={`${baseStyles} bg-yellow-100 text-yellow-700 border border-yellow-200`}>Pending</span>;
        case RequestStatus.APPROVED:
            return <span className={`${baseStyles} bg-green-100 text-green-700 border border-green-200`}>Disetujui</span>;
        case RequestStatus.REJECTED:
            return <span className={`${baseStyles} bg-red-100 text-red-700 border border-red-200`}>Ditolak</span>;
        default:
            return <span className={baseStyles}>{status}</span>;
    }
}


const RequestApprovalCard: React.FC<{
    request: Request;
    requester: UserProfile;
    onAction: (id: string, newStatus: RequestStatus) => void;
    onViewDetails: () => void;
    processingId: string | null;
}> = ({ request, requester, onAction, onViewDetails, processingId }) => {
    const reasonPreview = useMemo(() => {
        if (request.request_type === RequestType.SUBSTITUSI) {
            try {
                const parsed = JSON.parse(request.reason);
                return parsed.keterangan || request.reason;
            } catch (e) {
                return request.reason;
            }
        }
        if (request.request_type === RequestType.CUTI && request.reason.startsWith('{')) {
            try {
                const parsed = JSON.parse(request.reason);
                return parsed.reason || request.reason;
            } catch (e) {
                return request.reason;
            }
        }
        return request.reason;
    }, [request]);

    const isPending = request.status === RequestStatus.PENDING;

    return (
        <Card
            className={`p-0 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${isPending ? 'ring-1 ring-blue-500/20' : ''}`}
            onClick={onViewDetails}
        >
            <div className="p-4 sm:p-5">
                {/* Header: User & Status */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            {requester.avatar_url ? (
                                <img src={requester.avatar_url} alt={requester.full_name} className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border border-slate-200" />
                            ) : (
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                    {requester.full_name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1">{requester.full_name}</h3>
                            <p className="text-xs text-slate-500">{getRequestBadge(request.request_type)}</p>
                        </div>
                    </div>
                    <div>
                        {getStatusBadge(request.status)}
                    </div>
                </div>

                {/* Content: Details */}
                <div className="space-y-3 bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-100/50">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm">
                        <span className="text-slate-500 text-xs sm:text-sm font-medium">Periode</span>
                        <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                            {formatDate(new Date(request.start_date))}
                            {request.end_date !== request.start_date && ` - ${formatDate(new Date(request.end_date))}`}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-slate-500 text-xs sm:text-sm font-medium">Keterangan</span>
                        <p className="text-slate-700 text-xs sm:text-sm italic line-clamp-2">
                            "{reasonPreview}"
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer: Actions */}
            {isPending && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(request.id, RequestStatus.REJECTED); }}
                        disabled={!!processingId}
                        className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-600 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <XIcon className="w-4 h-4 text-[16px]" />
                        Tolak
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(request.id, RequestStatus.APPROVED); }}
                        disabled={!!processingId}
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                        {processingId === request.id ? <Spinner className="w-4 h-4 border-white" /> : <CheckCircleIcon className="w-4 h-4 text-[16px]" />}
                        Setujui
                    </button>
                </div>
            )}
        </Card>
    );
};

const PersetujuanTimPage: React.FC<PersetujuanPageProps> = ({ user }) => {
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>(RequestStatus.PENDING);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const users = await apiService.getProfiles();
            setAllUsers(users);

            const subordinates = getAllSubordinates(user.id, users);
            const subIds = subordinates.map(s => s.id);

            if (subIds.length > 0) {
                const reqs = await apiService.getSubordinateRequests(subIds);
                setRequests(reqs);
            } else {
                setRequests([]);
            }
        } catch (err: any) {
            setError(err.message || "Gagal memuat data.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const statusMatch = statusFilter === 'all' || req.status === statusFilter;

            const requester = usersMap.get(req.profile_id);
            const requesterName = requester?.full_name || '';

            const searchTermMatch = !searchTerm ||
                requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.request_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (req.reason && req.reason.toLowerCase().includes(searchTerm.toLowerCase()));

            return statusMatch && searchTermMatch;
        });
    }, [requests, statusFilter, searchTerm, usersMap]);

    const handleAction = useCallback(async (requestId: string, newStatus: RequestStatus) => {
        setProcessingId(requestId);
        try {
            const requestToUpdate = requests.find(r => r.id === requestId);
            if (!requestToUpdate) return;

            await apiService.updateRequestStatus(requestId, newStatus, user.id);

            if (newStatus === RequestStatus.APPROVED && requestToUpdate.request_type === RequestType.KOREKSI) {
                // ... (Correction logic maintained as is)
                try {
                    const reasonParsed = JSON.parse(requestToUpdate.reason || '{}');
                    const workDate = reasonParsed.work_date || requestToUpdate.start_date;
                    const newClockInISO: string | null = reasonParsed.new_clock_in_iso || (reasonParsed.type === 'in' && reasonParsed.intended_iso) || null;
                    const newClockOutISO: string | null = reasonParsed.new_clock_out_iso || (reasonParsed.type === 'out' && reasonParsed.intended_iso) || null;

                    const scheduleForWorkDate = workDate ? (await apiService.getTeamSchedules([requestToUpdate.profile_id], workDate, workDate))[0] : undefined;

                    let targetAttendance: Attendance | null = null;
                    if (requestToUpdate.attendance_id_to_correct) {
                        targetAttendance = await apiService.getAttendanceById(String(requestToUpdate.attendance_id_to_correct));
                    }
                    if (!targetAttendance && newClockInISO) {
                        targetAttendance = await apiService.createAttendanceForSubordinate({
                            profile_id: requestToUpdate.profile_id,
                            clock_in: newClockInISO,
                            work_date: workDate,
                            status: AttendanceStatus.IN_PROGRESS,
                            source: 'CORRECTED',
                        });
                    }
                    if (!targetAttendance) throw new Error('Data presensi tidak ditemukan.');

                    const clockInFinal = newClockInISO || targetAttendance.clock_in;
                    const clockOutFinal = newClockOutISO || targetAttendance.clock_out;
                    const outcome = clockInFinal && clockOutFinal ? computeAttendanceOutcome({ clockInISO: clockInFinal, clockOutISO: clockOutFinal, schedule: scheduleForWorkDate }) : null;

                    const updateData: Partial<Attendance> = {
                        work_date: workDate,
                        status: outcome?.status || targetAttendance.status,
                        worked_minutes: outcome?.workedMinutes ?? targetAttendance.worked_minutes,
                        late_minutes: outcome?.lateMinutes ?? targetAttendance.late_minutes,
                        early_leave_minutes: outcome?.earlyLeaveMinutes ?? targetAttendance.early_leave_minutes,
                        source: 'CORRECTED',
                    };
                    if (newClockInISO) updateData.clock_in = newClockInISO;
                    if (newClockOutISO) updateData.clock_out = newClockOutISO;

                    await apiService.updateAttendanceAsManager(String(targetAttendance.id), updateData);
                } catch (processError) {
                    console.error("Failed correction", processError);
                    alert("Gagal memproses update presensi otomatis.");
                    // Continue to refresh anyway
                }
            }

            await fetchData();

        } catch (error: any) {
            alert(error.message || `Gagal memperbarui status ajuan.`);
            console.error(error);
        } finally {
            setProcessingId(null);
        }
    }, [user.id, requests, fetchData]);

    const handleViewDetails = (request: Request) => {
        setSelectedRequest(request);
        setIsDetailModalOpen(true);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header */}
            <header className="flex-none px-6 py-5 bg-white border-b border-slate-200">
                <h1 className="text-xl font-bold text-slate-900">Persetujuan Ajuan Tim</h1>
                <p className="text-sm text-slate-500 mt-1">Kelola permohonan cuti, lembur, dan tukar shift dari tim Anda.</p>
            </header>

            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Filters */}
                    <Card className="p-4 bg-white sticky top-0 z-10 shadow-sm border border-slate-100">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="w-full md:w-1/3">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FilterIcon className="h-5 w-5 text-slate-400 text-[20px]" />
                                    </div>
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value as RequestStatus | 'all')}
                                        className="block w-full pl-10 pr-3 py-2.5 text-sm border-slate-200 focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-slate-50 text-slate-700 font-medium"
                                    >
                                        <option value="all">Semua Status</option>
                                        <option value={RequestStatus.PENDING}>Menunggu Persetujuan</option>
                                        <option value={RequestStatus.APPROVED}>Disetujui</option>
                                        <option value={RequestStatus.REJECTED}>Ditolak</option>
                                    </select>
                                </div>
                            </div>
                            <div className="w-full md:w-2/3">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon className="h-5 w-5 text-slate-400 text-[20px]" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Cari nama karyawan atau jenis ajuan..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 text-sm border-slate-200 focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Content */}
                    {loading ? (
                        <div className="flex flex-col justify-center items-center py-20">
                            <Spinner className="w-8 h-8 text-blue-600 mb-4" />
                            <p className="text-slate-500 font-medium animate-pulse">Memuat data ajuan...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100 p-6">
                            <p className="text-red-600 font-medium mb-2">Terjadi Kesalahan</p>
                            <p className="text-sm text-red-500">{error}</p>
                            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">Coba Lagi</button>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <FilterIcon className="w-8 h-8 text-slate-300 text-[32px]" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Tidak ada ajuan ditemukan</h3>
                            <p className="text-slate-500 mt-1 max-w-sm">
                                {requests.length === 0
                                    ? "Belum ada ajuan masuk dari tim Anda saat ini."
                                    : "Tidak ada ajuan yang cocok dengan filter pencarian Anda."}
                            </p>
                            {searchTerm || statusFilter !== 'all' ? (
                                <button
                                    onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                                    className="mt-4 text-blue-600 text-sm font-semibold hover:text-blue-700"
                                >
                                    Bersihkan Filter
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredRequests.map(request => {
                                const requester = usersMap.get(request.profile_id);
                                if (!requester) return null;
                                return (
                                    <RequestApprovalCard
                                        key={request.id}
                                        request={request}
                                        requester={requester}
                                        onAction={handleAction}
                                        onViewDetails={() => handleViewDetails(request)}
                                        processingId={processingId}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {selectedRequest && (
                <DetailAjuanModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    request={selectedRequest}
                    allUsers={allUsers}
                />
            )}
        </div>
    );
};

export default PersetujuanTimPage;
