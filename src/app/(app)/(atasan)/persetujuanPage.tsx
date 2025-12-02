"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserProfile, Request, RequestStatus, RequestType, Attendance } from '../../../types';
import { apiService } from '../../../services/apiService';
import { formatDate, getAllSubordinates, APP_TIME_OFFSET, formatDateKey, getStartOfDayISO, getEndOfDayISO, APP_TIME_ZONE } from '../../../lib/utils';
import Badge from '../../../components/ui/Badge';
import { SearchIcon, FilterIcon } from '../../../components/icons';
import DetailAjuanModal from '../../../components/modals/DetailAjuanModal';
import Spinner from '../../../components/ui/Spinner';

interface PersetujuanPageProps {
  user: UserProfile;
}

const RequestApprovalCard: React.FC<{ 
    request: Request; 
    requester: UserProfile; 
    onAction: (id: string, newStatus: RequestStatus) => void;
    onViewDetails: () => void;
}> = ({ request, requester, onAction, onViewDetails }) => {
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

    return (
        <div 
            className={`bg-white rounded-lg shadow-sm p-5 flex flex-col justify-between transition-shadow hover:shadow-lg cursor-pointer ${request.status === RequestStatus.PENDING ? 'border-2 border-blue-500' : 'border-2 border-transparent'}`}
            onClick={onViewDetails}
        >
            <div>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center space-x-3">
                            <img src={requester.avatar_url} alt={requester.full_name} className="h-12 w-12 rounded-full object-cover" />
                            <div>
                                <p className="font-bold text-gray-800">{requester.full_name}</p>
                                <p className="text-sm text-gray-500">{request.request_type}</p>
                            </div>
                        </div>
                    </div>
                    <Badge status={request.status} />
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <p><span className="font-semibold">Periode:</span> {formatDate(new Date(request.start_date))}{request.end_date !== request.start_date ? ` - ${formatDate(new Date(request.end_date))}` : ''}</p>
                    <p>
                        <span className="font-semibold">Alasan:</span> 
                        <span className="italic">"{reasonPreview.length > 100 ? `${reasonPreview.substring(0, 100)}...` : reasonPreview}"</span>
                    </p>
                </div>
            </div>
            {request.status === RequestStatus.PENDING && (
                <div className="mt-4 pt-4 border-t flex justify-end space-x-3">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAction(request.id, RequestStatus.REJECTED); }}
                        className="px-4 py-2 bg-red-100 text-red-700 text-sm font-semibold rounded-md hover:bg-red-200 transition-colors"
                    >
                        Tolak
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAction(request.id, RequestStatus.APPROVED); }}
                        className="px-4 py-2 bg-green-100 text-green-700 text-sm font-semibold rounded-md hover:bg-green-200 transition-colors"
                    >
                        Setujui
                    </button>
                </div>
            )}
        </div>
    );
};

const PersetujuanTimPage: React.FC<PersetujuanPageProps> = ({ user }) => {
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // FIX: Changed initial value to use enum member RequestStatus.PENDING to resolve type error.
    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>(RequestStatus.PENDING);
    const [searchTerm, setSearchTerm] = useState('');

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
            
            const searchTermMatch = !searchTerm ||
                (usersMap.get(req.profile_id)?.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                req.request_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                req.reason.toLowerCase().includes(searchTerm.toLowerCase());

            return statusMatch && searchTermMatch;
        });
    }, [requests, statusFilter, searchTerm, usersMap]);

    const handleAction = useCallback(async (requestId: string, newStatus: RequestStatus) => {
        try {
            const requestToUpdate = requests.find(r => r.id === requestId);
            if (!requestToUpdate) return;
    
            // First, update the request status itself.
            await apiService.updateRequestStatus(requestId, newStatus, user.id);
    
            // Then, if it was an approved correction, process the attendance update.
            if (newStatus === RequestStatus.APPROVED && requestToUpdate.request_type === RequestType.KOREKSI) {
                try {
                    const reasonParsed = JSON.parse(requestToUpdate.reason);
                    const intendedIso = reasonParsed.intended_iso 
                        ? reasonParsed.intended_iso 
                        : new Date(`${requestToUpdate.start_date}T${requestToUpdate.start_time}${APP_TIME_OFFSET}`).toISOString();

                    let targetAttendanceId = requestToUpdate.attendance_id_to_correct;

                    // Auto-merge: jika ID kosong, coba temukan baris yang sudah ada pada tanggal yang sama (UTC date)
                    if (!targetAttendanceId && reasonParsed.type === 'in') {
                        const intendedDate = new Date(intendedIso);
                        const dateKey = formatDateKey(intendedDate, APP_TIME_ZONE);
                        const startIso = getStartOfDayISO(intendedDate);
                        const endIso = getEndOfDayISO(intendedDate);
                        const existing = await apiService.getAttendanceForSubordinates(
                            [requestToUpdate.profile_id],
                            startIso,
                            endIso
                        );
                        const match = existing.find(att => formatDateKey(new Date(att.clock_in), APP_TIME_ZONE) === dateKey);
                        if (match) {
                            targetAttendanceId = match.id;
                        }
                    }

                    if (targetAttendanceId) {
                        const updateData: Partial<Attendance> = {};
                        if (reasonParsed.type === 'out') {
                            updateData.clock_out = intendedIso;
                        } else if (reasonParsed.type === 'in') {
                            updateData.clock_in = intendedIso;
                        }
                        if (Object.keys(updateData).length > 0) {
                            await apiService.updateAttendance(targetAttendanceId, updateData);
                        }
                    } else if (reasonParsed.type === 'in') {
                        // CASE: benar-benar tidak ada baris; buat baru
                        const newAttendanceData: Partial<Attendance> = {
                            profile_id: requestToUpdate.profile_id,
                            clock_in: intendedIso,
                            status: 'hadir',
                            lokasi_kerja: 'Lainnya',
                            tempat_kerja: `Koreksi Disetujui: ${reasonParsed.reason}`,
                        };
                        await apiService.createAttendanceForSubordinate(newAttendanceData);
                    } else if (reasonParsed.type === 'out') {
                        throw new Error('Ajuan koreksi clock-out tanpa attendance_id_to_correct atau baris aktif tidak ditemukan.');
                    }
                } catch (processError) {
                    console.error("Failed to process attendance correction:", processError);
                    setError(processError instanceof Error ? processError.message : 'Gagal memproses koreksi ke data presensi.');
                    return; // Skip refresh to keep context on the error
                }
            }
            
            fetchData(); // Re-fetch all data to ensure UI consistency
    
        } catch (error: any) {
            setError(error.message || `Gagal memperbarui status ajuan.`);
            console.error(error);
        }
    }, [user.id, requests, fetchData]);

    const handleViewDetails = (request: Request) => {
        setSelectedRequest(request);
        setIsDetailModalOpen(true);
    };

    return (
        <>
            <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Persetujuan Ajuan Tim</h2>
                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                        <div className="lg:col-span-1">
                            <label htmlFor="statusFilter" className="sr-only">Filter by status</label>
                            <div className="flex items-center border rounded-md overflow-hidden bg-white">
                                <span className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-500 border-r">
                                    <FilterIcon className="h-5 w-5" />
                                </span>
                                <select 
                                    id="statusFilter" 
                                    value={statusFilter} 
                                    onChange={e => setStatusFilter(e.target.value as RequestStatus | 'all')}
                                    className="p-2 text-sm outline-none w-full bg-white"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value={RequestStatus.PENDING}>Pending</option>
                                    <option value={RequestStatus.APPROVED}>Approved</option>
                                    <option value={RequestStatus.REJECTED}>Rejected</option>
                                </select>
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Cari nama, jenis ajuan, atau alasan..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full border rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-12 flex justify-center items-center">
                        <Spinner /> <span className="ml-2">Memuat data ajuan...</span>
                    </div>
                )}
                {error && <div className="text-center py-12 text-red-500">{error}</div>}

                {!loading && !error && (
                    <>
                        {filteredRequests.length > 0 ? (
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
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-lg shadow-md">
                                <p className="text-gray-500">
                                    {requests.length === 0 ? "Tidak ada ajuan dari tim Anda." : "Tidak ada ajuan yang cocok dengan filter."}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {selectedRequest && (
                <DetailAjuanModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    request={selectedRequest}
                    allUsers={allUsers}
                />
            )}
        </>
    );
};

export default PersetujuanTimPage;
