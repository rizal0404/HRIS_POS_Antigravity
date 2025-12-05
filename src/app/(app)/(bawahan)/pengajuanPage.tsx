"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserProfile, Request, RequestStatus, RequestType } from '../../../types';
import Badge from '../../../components/ui/Badge';
import { formatDate } from '../../../lib/utils';
import { PlusCircleIcon, PaperClipIcon, SearchIcon, XIcon } from '../../../components/icons';
import RequestModal from '../../../components/modals/RequestModal';
import { apiService } from '../../../services/apiService';

interface PengajuanPageProps {
  user: UserProfile;
}

const RequestCard: React.FC<{ request: Request; allUsers: UserProfile[] }> = ({ request, allUsers }) => {
    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.id, u.full_name])), [allUsers]);

    const renderReasonDetails = () => {
        const renderShiftLabel = (shift?: { code?: string; name?: string }) => {
            if (!shift) return '-';
            if (shift.name && shift.code) return `${shift.name} (${shift.code})`;
            return shift.name || shift.code || '-';
        };

        if (request.request_type !== RequestType.CUTI || !request.reason.startsWith('{')) {
            if (request.request_type === RequestType.SUBSTITUSI) {
                try {
                    const parsed = JSON.parse(request.reason);
                    return (
                        <div className="mt-2 space-y-1">
                            <p><span className="font-semibold">Keterangan:</span> {parsed.keterangan || request.reason}</p>
                            <p className="text-sm text-gray-600">Shift Awal: {renderShiftLabel(parsed.shift_awal)}</p>
                            <p className="text-sm text-gray-600">Shift Baru: {renderShiftLabel(parsed.shift_baru)}</p>
                        </div>
                    );
                } catch (e) {
                    return (
                        <p className="mt-2">
                            <span className="font-semibold">Alasan:</span> {request.reason}
                        </p>
                    );
                }
            }

            return (
                <p className="mt-2">
                    <span className="font-semibold">Alasan:</span> {request.reason}
                </p>
            );
        }

        try {
            const parsed = JSON.parse(request.reason);
            const mainReason = parsed.reason || request.reason;
            const substitutes = parsed.substitutes;

            return (
                <div className="mt-2">
                    <p><span className="font-semibold">Alasan:</span> {mainReason}</p>
                    {substitutes && Object.keys(substitutes).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="font-semibold text-xs text-gray-500 uppercase">Pengganti Shift</p>
                            <ul className="mt-1 space-y-1 text-xs">
                                {Object.entries(substitutes).map(([date, shifts]: [string, any]) => {
                                    const resolveName = (value?: string) => {
                                        if (!value) return null;
                                        return usersMap.get(value) || value;
                                    };

                                    const daySubstitute = resolveName(shifts.day);
                                    const nightSubstitute = resolveName(shifts.night);

                                    if (!daySubstitute && !nightSubstitute) return null;

                                    return (
                                        <li key={date}>
                                            <span className="font-medium text-gray-800">{new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}:</span>
                                            <div className="pl-3">
                                                {daySubstitute && <p>Pagi: <span className="font-semibold">{daySubstitute}</span></p>}
                                                {nightSubstitute && <p>Malam: <span className="font-semibold">{nightSubstitute}</span></p>}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            );
        } catch (e) {
            // Fallback for old data or plain text reason
            return (
                <p className="mt-2">
                    <span className="font-semibold">Alasan:</span> {request.reason}
                </p>
            );
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-gray-800">{request.request_type}</h3>
                    <Badge status={request.status} />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                    <p>
                        <span className="font-semibold">Tanggal:</span> {formatDate(new Date(request.start_date))} 
                        {request.request_type === RequestType.CUTI && request.start_date !== request.end_date && ` - ${formatDate(new Date(request.end_date))}`}
                    </p>
                    {request.request_type === RequestType.LEMBUR && request.start_time && request.end_time && (
                        <p><span className="font-semibold">Waktu:</span> {request.start_time} - {request.end_time}</p>
                    )}
                    
                    {renderReasonDetails()}

                    {request.attachment_url && (
                        <a href={request.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center text-blue-600 hover:underline cursor-pointer">
                            <PaperClipIcon className="h-4 w-4 mr-1"/>
                            <span>Lihat Lampiran</span>
                        </a>
                    )}
                </div>
            </div>
            <div className="bg-gray-50 px-5 py-2 text-xs text-gray-500">
                Diajukan pada: {formatDate(new Date(request.created_at))}
            </div>
        </div>
    );
};

const PengajuanPage: React.FC<PengajuanPageProps> = ({ user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userRequests, setUserRequests] = useState<Request[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = React.useRef<number | null>(null);
  
  const todayStr = useMemo(() => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  }, []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState(yesterdayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const [historyData, usersData] = await Promise.all([
            apiService.getHistory(user.id),
            apiService.getProfiles()
        ]);
        setUserRequests(historyData.requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setAllUsers(usersData);
    } catch(err) {
      setError('Gagal memuat data pengajuan.');
      console.error(err);
    } finally {
        setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
    }
    setToast({ type, message });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSuccess = () => {
    handleCloseModal();
    fetchRequests(); // Re-fetch data after a new submission
    showToast('success', 'Ajuan berhasil dikirim ke atasan.');
  };
  
  const handleClearFilters = () => {
    setStartDate(yesterdayStr);
    setEndDate(todayStr);
    setSearchTerm('');
  };

  const filteredRequests = useMemo(() => {
    return userRequests.filter(req => {
        const requestDate = new Date(req.start_date);
        requestDate.setHours(0,0,0,0);

        const isAfterStartDate = !startDate || requestDate >= new Date(new Date(startDate).setHours(0,0,0,0));
        const isBeforeEndDate = !endDate || requestDate <= new Date(new Date(endDate).setHours(0,0,0,0));

        const searchTermMatch = !searchTerm ||
            req.request_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.reason.toLowerCase().includes(searchTerm.toLowerCase());

        return isAfterStartDate && isBeforeEndDate && searchTermMatch;
    });
  }, [userRequests, startDate, endDate, searchTerm]);

  useEffect(() => {
    return () => {
        if (toastTimerRef.current) {
            window.clearTimeout(toastTimerRef.current);
        }
    };
  }, []);

  return (
    <div className="p-6">
        {toast && (
            <div
                className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-md text-sm text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
            >
                {toast.message}
            </div>
        )}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Daftar Pengajuan Saya</h2>
            <button 
                onClick={handleOpenModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
            >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Buat Pengajuan Baru
            </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center border rounded-md overflow-hidden bg-white">
                    <span className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-500 border-r">Dari</span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 text-sm outline-none w-full text-gray-700"/>
                </div>
                <div className="flex items-center border rounded-md overflow-hidden bg-white">
                     <span className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-500 border-r">Sampai</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="p-2 text-sm outline-none w-full text-gray-700"/>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Cari jenis atau alasan..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full border rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <button 
                        onClick={handleClearFilters}
                        className="p-2.5 bg-gray-100 rounded-md hover:bg-gray-200 border flex-shrink-0"
                        title="Bersihkan filter"
                    >
                        <XIcon className="h-5 w-5 text-gray-600"/>
                    </button>
                </div>
            </div>
        </div>
        
        {loading && <div className="text-center py-12">Memuat data...</div>}
        {error && <div className="text-center py-12 text-red-500">{error}</div>}
        
        {!loading && !error && (
            <>
                {filteredRequests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRequests.map(request => (
                            <RequestCard key={request.id} request={request} allUsers={allUsers} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow-md">
                        <p className="text-gray-500">{searchTerm || startDate || endDate ? 'Tidak ada pengajuan yang cocok dengan filter Anda.' : 'Anda belum memiliki pengajuan apapun.'}</p>
                    </div>
                )}
            </>
        )}


        <RequestModal 
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSuccess={handleSuccess}
            onError={(msg) => showToast('error', msg || 'Gagal mengirim pengajuan.')}
            user={user}
        />
    </div>
  );
};

export default PengajuanPage;
