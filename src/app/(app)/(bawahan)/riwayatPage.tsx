"use client";

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { UserProfile, Request, Attendance, RequestStatus, RequestType } from '../../../types';
import { apiService } from '../../../services/apiService';
import HistoryItem from '../../../components/ui/HistoryItem';
import KoreksiAbsensiModal from '../../../components/modals/KoreksiAbsensiModal';
import DetailAbsensiModal from '../../../components/modals/DetailAbsensiModal';
import DetailAjuanModal from '../../../components/modals/DetailAjuanModal';
import { SearchIcon, XIcon } from '../../../components/icons';
import { supabase } from '../../../services/supabase';
import { APP_TIME_OFFSET } from '../../../lib/utils';

type HistoryEvent = (Request & { type: 'request' }) | (Attendance & { type: 'attendance' });

interface RiwayatPageProps {
  user: UserProfile;
}

const RiwayatPage: React.FC<RiwayatPageProps> = ({ user }) => {
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
    setSelectedAttendance(attendance);
    setIsKoreksiModalOpen(true);
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

  const handleSubmitKoreksi = async (koreksiData: { clockType: 'in' | 'out', newDate: string, newTime: string, reason: string, attachment: File }) => {
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
        
        // Create the date object from local parts with explicit WITA offset, then convert to definitive UTC ISO.
        const intendedDateTime = new Date(`${koreksiData.newDate}T${koreksiData.newTime}${APP_TIME_OFFSET}`);

        const reasonPayload = JSON.stringify({
            type: koreksiData.clockType,
            reason: koreksiData.reason,
            intended_iso: intendedDateTime.toISOString() // Store the unambiguous UTC timestamp
        });

        const newKoreksiRequest: Omit<Request, 'id' | 'created_at' | 'status'> = {
            profile_id: user.id,
            request_type: RequestType.KOREKSI,
            start_date: koreksiData.newDate,
            end_date: koreksiData.newDate,
            start_time: koreksiData.newTime,
            reason: reasonPayload,
            attachment_url: attachmentUrl,
            attendance_id_to_correct: selectedAttendance.id,
            approver_id: user.manager_id || undefined,
        };
    
        await apiService.submitRequest(newKoreksiRequest);
        fetchHistory(); // Refresh data
    } catch (error) {
        console.error("Failed to submit correction request:", error);
        // Di aplikasi nyata, tampilkan notifikasi error ke pengguna
    } finally {
        handleCloseKoreksiModal();
    }
  };


  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
        const itemDate = new Date('clock_in' in item ? item.clock_in : item.start_date);
        itemDate.setHours(0, 0, 0, 0);

        const isAfterStartDate = !startDate || itemDate >= new Date(new Date(startDate).setHours(0,0,0,0));
        const isBeforeEndDate = !endDate || itemDate <= new Date(new Date(endDate).setHours(0,0,0,0));

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
    <div className="p-6">
        <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800">Riwayat Aktivitas Saya</h2>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 max-w-4xl mx-auto">
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
                            placeholder="Cari jenis, alasan, status..." 
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

        {loading ? (
            <div className="text-center py-12">Memuat riwayat...</div>
        ) : filteredHistory.length > 0 ? (
            <div className="space-y-4 max-w-4xl mx-auto">
                {filteredHistory.map(item => (
                    <HistoryItem 
                        key={`${item.type}-${item.id}`} 
                        item={item}
                        onKoreksiClick={handleOpenKoreksiModal}
                        onDetailClick={handleDetailClick}
                        allUsers={allUsers}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
                <p className="text-gray-500">{searchTerm || startDate || endDate ? 'Tidak ada riwayat yang cocok dengan filter Anda.' : 'Anda belum memiliki riwayat aktivitas apapun.'}</p>
            </div>
        )}

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
