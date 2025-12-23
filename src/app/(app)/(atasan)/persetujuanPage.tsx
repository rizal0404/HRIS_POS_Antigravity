"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserProfile, Request, RequestStatus, RequestType, Attendance, AttendanceStatus } from '../../../types';
import { apiService } from '../../../services/apiService';
import { formatDate, getAllSubordinates } from '../../../lib/utils';
import { SearchIcon, FilterIcon, BriefcaseIcon, ClockIcon, RefreshIcon, DocumentAddIcon, CheckCircleIcon, XIcon } from '../../../components/icons';
import DetailAjuanModal from '../../../components/modals/DetailAjuanModal';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { computeAttendanceOutcome } from '../../../lib/attendanceRules';

interface PersetujuanPageProps {
    user: UserProfile;
}

// Reuse the badge logic from dashboard for consistency
const getRequestBadge = (type: RequestType) => {
    const baseStyles = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap";
    switch (type) {
        case RequestType.CUTI:
            return <span className={`${baseStyles} bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400`}><BriefcaseIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Cuti</span>;
        case RequestType.SAKIT:
            return <span className={`${baseStyles} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`}><span className="material-symbols-outlined text-[14px] flex-shrink-0">thermometer</span>Sakit</span>;
        case RequestType.LEMBUR:
            return <span className={`${baseStyles} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`}><ClockIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Lembur</span>;
        case RequestType.SUBSTITUSI:
            return <span className={`${baseStyles} bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400`}><RefreshIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Tukar Shift</span>;
        case RequestType.KOREKSI:
            return <span className={`${baseStyles} bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400`}><RefreshIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Koreksi</span>;
        case RequestType.IZIN:
            return <span className={`${baseStyles} bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400`}><DocumentAddIcon className="w-3.5 h-3.5 text-[14px] flex-shrink-0" />Izin</span>;
        default:
            return <span className={`${baseStyles} bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300`}>{type}</span>;
    }
};

const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
        case RequestStatus.PENDING:
            return <Badge variant="warning">Pending</Badge>;
        case RequestStatus.APPROVED:
            return <Badge variant="success">Disetujui</Badge>;
        case RequestStatus.REJECTED:
            return <Badge variant="danger">Ditolak</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
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
            className={`p-0 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${isPending ? 'ring-2 ring-blue-500/20 dark:ring-blue-400/20' : ''}`}
            onClick={onViewDetails}
        >
            <div className="p-4 sm:p-5">
                {/* Header: User & Status */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            {requester.avatar_url ? (
                                <img src={requester.avatar_url} alt={requester.full_name} className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700" />
                            ) : (
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border-2 border-slate-100 dark:border-slate-700">
                                    {requester.full_name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1">{requester.full_name}</h3>
                            <div className="mt-1">{getRequestBadge(request.request_type)}</div>
                        </div>
                    </div>
                    <div>
                        {getStatusBadge(request.status)}
                    </div>
                </div>

                {/* Content: Details */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4 border border-slate-100 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm">
                        <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">Periode</span>
                        <span className="text-slate-900 dark:text-white font-semibold text-xs sm:text-sm">
                            {formatDate(new Date(request.start_date))}
                            {request.end_date !== request.start_date && ` - ${formatDate(new Date(request.end_date))}`}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">Keterangan</span>
                        <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm italic line-clamp-2">
                            "{reasonPreview}"
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer: Actions */}
            {isPending && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(request.id, RequestStatus.REJECTED); }}
                        disabled={!!processingId}
                        className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-sm font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors flex items-center justify-center gap-2"
                    >
                        <XIcon className="w-4 h-4 text-[16px]" />
                        Tolak
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(request.id, RequestStatus.APPROVED); }}
                        disabled={!!processingId}
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
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
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>(RequestStatus.PENDING);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    const fetchData = useCallback(async () => {
        setRefreshing(true);
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
            setRefreshing(false);
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

    // Statistics
    const stats = useMemo(() => {
        const pending = requests.filter(r => r.status === RequestStatus.PENDING).length;
        const approved = requests.filter(r => r.status === RequestStatus.APPROVED).length;
        const rejected = requests.filter(r => r.status === RequestStatus.REJECTED).length;
        return { pending, approved, rejected, total: requests.length };
    }, [requests]);

    const handleAction = useCallback(async (requestId: string, newStatus: RequestStatus) => {
        setProcessingId(requestId);
        try {
            const requestToUpdate = requests.find(r => r.id === requestId);
            if (!requestToUpdate) return;

            await apiService.updateRequestStatus(requestId, newStatus, user.id);

            if (newStatus === RequestStatus.APPROVED && requestToUpdate.request_type === RequestType.KOREKSI) {
                try {
                    const reasonParsed = JSON.parse(requestToUpdate.reason || '{}');
                    const workDate = reasonParsed.work_date || requestToUpdate.start_date;
                    const newClockInISO: string | null = reasonParsed.new_clock_in_iso || (reasonParsed.type === 'in' && reasonParsed.intended_iso) || null;
                    const newClockOutISO: string | null = reasonParsed.new_clock_out_iso || (reasonParsed.type === 'out' && reasonParsed.intended_iso) || null;

                    // Extract notes from request reason
                    let extractedNotes: string | undefined = undefined;
                    if (reasonParsed.reason) {
                        // Remove prefix if present (e.g., "Absen dari lokasi 'Lainnya': ")
                        extractedNotes = reasonParsed.reason.replace(/^Absen dari lokasi 'Lainnya': /, '');
                    }

                    // Check if this is a remote location correction
                    const isRemoteLocation = reasonParsed.reason?.includes("lokasi 'Lainnya'") || false;

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
                            lokasi_kerja: isRemoteLocation ? 'Lainnya' : undefined,
                            catatan: extractedNotes,
                        });
                    }
                    if (!targetAttendance) throw new Error('Data presensi tidak ditemukan.');

                    const clockInFinal = newClockInISO || targetAttendance.clock_in;
                    const clockOutFinal = newClockOutISO || targetAttendance.clock_out;
                    const outcome = clockInFinal && clockOutFinal ? computeAttendanceOutcome({ clockInISO: clockInFinal, clockOutISO: clockOutFinal, schedule: scheduleForWorkDate }) : null;

                    // Merge existing flags with new correction flags
                    const existingFlags: string[] = targetAttendance.attendance_flags || [];
                    const newFlags: string[] = ['approved_correction'];
                    if (isRemoteLocation) {
                        newFlags.push('remote_location');
                    }
                    const mergedFlags = [...new Set([...existingFlags, ...newFlags])];

                    const updateData: Partial<Attendance> = {
                        work_date: workDate,
                        status: outcome?.status || targetAttendance.status,
                        worked_minutes: outcome?.workedMinutes ?? targetAttendance.worked_minutes,
                        late_minutes: outcome?.lateMinutes ?? targetAttendance.late_minutes,
                        early_leave_minutes: outcome?.earlyLeaveMinutes ?? targetAttendance.early_leave_minutes,
                        source: 'CORRECTED',
                        // Add notes from request
                        catatan: extractedNotes || targetAttendance.catatan,
                        // Set location type if remote
                        lokasi_kerja: isRemoteLocation ? 'Lainnya' : targetAttendance.lokasi_kerja,
                        // Add flags
                        attendance_flags: mergedFlags.length > 0 ? mergedFlags : undefined,
                    };
                    if (newClockInISO) updateData.clock_in = newClockInISO;
                    if (newClockOutISO) updateData.clock_out = newClockOutISO;

                    await apiService.updateAttendanceAsManager(String(targetAttendance.id), updateData);
                } catch (processError) {
                    console.error("Failed correction", processError);
                    alert("Gagal memproses update presensi otomatis.");
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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Spinner /> <span className="ml-2 text-text-secondary font-medium">Memuat Data Persetujuan...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header Section */}
            <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 shrink-0">
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Persetujuan Tim</h2>
                    <p className="text-xs text-slate-500">Kelola permohonan dari tim Anda</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchData}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        {refreshing ? <Spinner className="w-5 h-5" /> : <RefreshIcon className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Total Ajuan</p>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</span>
                                </div>
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <span className="material-symbols-outlined text-slate-500 text-[20px]">inbox</span>
                                </div>
                            </div>
                        </Card>
                        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === RequestStatus.PENDING ? 'ring-2 ring-orange-500' : ''}`} onClick={() => setStatusFilter(RequestStatus.PENDING)}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Pending</p>
                                    <span className="text-2xl font-black text-orange-600">{stats.pending}</span>
                                </div>
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-orange-500 text-[20px]">pending</span>
                                </div>
                            </div>
                        </Card>
                        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === RequestStatus.APPROVED ? 'ring-2 ring-green-500' : ''}`} onClick={() => setStatusFilter(RequestStatus.APPROVED)}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Disetujui</p>
                                    <span className="text-2xl font-black text-green-600">{stats.approved}</span>
                                </div>
                                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                                </div>
                            </div>
                        </Card>
                        <Card className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${statusFilter === RequestStatus.REJECTED ? 'ring-2 ring-red-500' : ''}`} onClick={() => setStatusFilter(RequestStatus.REJECTED)}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Ditolak</p>
                                    <span className="text-2xl font-black text-red-600">{stats.rejected}</span>
                                </div>
                                <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-xl">
                                    <span className="material-symbols-outlined text-red-500 text-[20px]">cancel</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Search & Filter */}
                    <Card className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="w-full md:w-1/3">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FilterIcon className="h-5 w-5 text-slate-400 text-[20px]" />
                                    </div>
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value as RequestStatus | 'all')}
                                        className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
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
                                        className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Content */}
                    {error ? (
                        <Card className="p-8 text-center">
                            <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
                            <p className="text-red-600 dark:text-red-400 font-medium mb-2">Terjadi Kesalahan</p>
                            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                Coba Lagi
                            </button>
                        </Card>
                    ) : filteredRequests.length === 0 ? (
                        <Card className="p-12 text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">inbox</span>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tidak ada ajuan ditemukan</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                {requests.length === 0
                                    ? "Belum ada ajuan masuk dari tim Anda saat ini."
                                    : "Tidak ada ajuan yang cocok dengan filter pencarian Anda."}
                            </p>
                            {(searchTerm || statusFilter !== 'all') && (
                                <button
                                    onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                                    className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:text-blue-700 dark:hover:text-blue-300"
                                >
                                    Bersihkan Filter
                                </button>
                            )}
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
