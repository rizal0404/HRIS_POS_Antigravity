"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDate, formatTime } from '../../../lib/utils';
import { ClockIcon, LocationMarkerIcon } from '../../../components/icons';
import { UserProfile, Attendance, JadwalKerjaTim, Shift } from '../../../types';
import { ClockInModal } from '../../../components/modals/ClockInOutModal';
import { apiService } from '../../../services/apiService';

enum AttendanceStatus {
  NOT_CLOCKED_IN,
  CLOCKED_IN,
  CLOCKED_OUT,
  LOADING,
  ERROR,
}

const statusInfo = {
  [AttendanceStatus.LOADING]: { text: 'Memuat status...', color: 'bg-gray-500' },
  [AttendanceStatus.NOT_CLOCKED_IN]: { text: 'Belum Absen Masuk', color: 'bg-yellow-500' },
  [AttendanceStatus.CLOCKED_IN]: { text: 'Sudah Absen Masuk', color: 'bg-green-500' },
  [AttendanceStatus.CLOCKED_OUT]: { text: 'Sesi Kerja Selesai', color: 'bg-slate-500' },
  [AttendanceStatus.ERROR]: { text: 'Gagal Memuat Status', color: 'bg-red-500' },
};

interface AbsensiPageProps {
  user: UserProfile;
}

const AbsensiPage: React.FC<AbsensiPageProps> = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.LOADING);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'in' | 'out'>('in');
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isOnApprovedLeave, setIsOnApprovedLeave] = useState(false);
  const [jadwal, setJadwal] = useState<JadwalKerjaTim[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const formatLocalDate = useCallback((date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  }, []);

  const checkAttendanceStatus = useCallback(async () => {
      setStatus(AttendanceStatus.LOADING);
      try {
          const today = new Date();
          const todayISO = formatLocalDate(today);
          const startDate = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
          const endDate = formatLocalDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));

          const [attendance, approvedLeaves, scheduleData, shiftList, substitutions] = await Promise.all([
             apiService.getActiveAttendance(user.id),
             apiService.getApprovedLeaves(user.id, todayISO),
             apiService.getTeamSchedules([user.id], startDate, endDate),
             apiService.getShifts(),
             apiService.getApprovedSubstitutionRequests([user.id], startDate, endDate),
          ]);
          
          setShifts(shiftList);

          const shiftMap = new Map(shiftList.map(s => [s.code, s]));
          const scheduleMap = new Map<string, JadwalKerjaTim>();
          scheduleData.forEach(s => scheduleMap.set(s.date, { ...s }));
          substitutions.forEach(req => {
              let newShiftCode = '';
              try {
                  const parsed = JSON.parse(req.reason);
                  newShiftCode = parsed?.shift_baru?.code || parsed?.shift_baru || '';
              } catch (e) {
                  // ignore malformed payloads
              }
              if (!newShiftCode) return;
              const meta = shiftMap.get(newShiftCode);
              const start = new Date(req.start_date);
              const end = new Date(req.end_date);
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  const dateStr = formatLocalDate(d);
                  const existing = scheduleMap.get(dateStr) || { profile_id: user.id, date: dateStr, shift: '' } as JadwalKerjaTim;
                  scheduleMap.set(dateStr, {
                      ...existing,
                      shift: newShiftCode,
                      start_time: meta?.start_time ?? existing.start_time,
                      end_time: meta?.end_time ?? existing.end_time,
                  });
              }
          });
          setJadwal(Array.from(scheduleMap.values()));

          if (approvedLeaves.length > 0) {
              setIsOnApprovedLeave(true);
          } else {
              setIsOnApprovedLeave(false);
          }

          setTodayAttendance(attendance);
          if (!attendance) {
              setStatus(AttendanceStatus.NOT_CLOCKED_IN);
          } else if (attendance.clock_out) {
              setStatus(AttendanceStatus.CLOCKED_OUT);
          } else {
              setStatus(AttendanceStatus.CLOCKED_IN);
          }
      } catch (error: any) {
          setStatus(AttendanceStatus.ERROR);
          setToastMessage({ type: 'error', message: error.message || 'Gagal mengambil status presensi.' });
      }
  }, [user.id, formatLocalDate]);

  useEffect(() => {
    checkAttendanceStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [checkAttendanceStatus]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);
  
  const todayISO = useMemo(() => formatLocalDate(currentTime), [currentTime, formatLocalDate]);
  const todaySchedule = useMemo(() => jadwal.find(j => j.date === todayISO), [jadwal, todayISO]);
  const isOffDay = todaySchedule?.shift === 'OFF';
  const hasActiveSession = status === AttendanceStatus.CLOCKED_IN && !!todayAttendance && !todayAttendance.clock_out;

  const handleOpenModal = (type: 'in' | 'out') => {
    setActionType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = (message: string, newAttendance?: Attendance | null) => {
    setToastMessage({type: 'success', message});
    if (newAttendance) {
        setTodayAttendance(newAttendance);
        if (actionType === 'in') {
          setStatus(AttendanceStatus.CLOCKED_IN);
        } else {
          setStatus(AttendanceStatus.CLOCKED_OUT);
        }
    }
    // If no attendance record is returned (e.g., for 'Lainnya'), 
    // we don't update the status, just show the toast.
    handleCloseModal();
  };

  const handleError = (message: string) => {
     setToastMessage({type: 'error', message});
     handleCloseModal();
  };
  
  const currentStatusInfo = statusInfo[status];

  return (
    <>
      <div className="p-6 space-y-6">
        {toastMessage && (
            <div className={`max-w-2xl mx-auto p-4 rounded-md shadow-lg ${toastMessage.type === 'success' ? 'bg-green-100 border-green-500 text-green-800' : 'bg-red-100 border-red-500 text-red-700'} border-l-4`} role="alert">
                <p className="font-bold">{toastMessage.type === 'success' ? 'Berhasil' : 'Gagal'}</p>
                <p>{toastMessage.message}</p>
            </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <div className="text-center">
              <p className="text-lg font-medium text-gray-600">{formatDate(currentTime)}</p>
              <p className="text-6xl font-bold text-gray-800 my-2 tracking-wider">{formatTime(currentTime)}</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${currentStatusInfo.color}`}>
                  {currentStatusInfo.text}
              </span>
          </div>
          
          {isOnApprovedLeave && (
              <div className="mt-6 text-center p-3 bg-blue-100 text-blue-800 rounded-lg text-sm">
                  Absensi dinonaktifkan. Anda tercatat sedang dalam masa Cuti yang telah disetujui.
              </div>
          )}

          {isOffDay && !isOnApprovedLeave && (
              <div className="mt-6 text-center p-3 bg-gray-100 text-gray-800 rounded-lg text-sm">
                  Hari ini adalah hari libur Anda sesuai jadwal (OFF).
              </div>
          )}
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                  onClick={() => handleOpenModal('in')}
                  disabled={status !== AttendanceStatus.NOT_CLOCKED_IN || isOnApprovedLeave || isOffDay}
                  className="w-full py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                  Clock In
              </button>
              <button 
                  onClick={() => handleOpenModal('out')}
                  disabled={status !== AttendanceStatus.CLOCKED_IN || isOnApprovedLeave || (!hasActiveSession && isOffDay)}
                  className="w-full py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                  Clock Out
              </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-gray-800 border-b pb-3 mb-4">Ringkasan Absensi Hari Ini</h3>
          <div className="space-y-4">
              <div className="flex items-start">
                  <ClockIcon className="h-6 w-6 text-green-500 mt-1 mr-4 flex-shrink-0" />
                  <div>
                      <p className="font-semibold text-gray-700">Absen Masuk</p>
                      {todayAttendance?.clock_in ? (
                          <>
                              <p className="text-gray-600">{formatTime(new Date(todayAttendance.clock_in))}</p>
                               <div className="flex items-start text-sm text-gray-500 mt-1">
                                 <LocationMarkerIcon className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0"/>
                                 <p>
                                    {todayAttendance.lokasi_kerja === 'Bekerja di Pabrik' && todayAttendance.tempat_kerja && <span className="font-semibold text-gray-800 block">{todayAttendance.tempat_kerja}</span>}
                                    {todayAttendance.clock_in_address || 'Lokasi tercatat'}
                                 </p>
                              </div>
                          </>
                      ) : <p className="text-gray-500 text-sm">-</p>}
                  </div>
              </div>
               <div className="flex items-start">
                  <ClockIcon className="h-6 w-6 text-red-500 mt-1 mr-4 flex-shrink-0" />
                  <div>
                      <p className="font-semibold text-gray-700">Absen Pulang</p>
                       {todayAttendance?.clock_out ? (
                          <>
                              <p className="text-gray-600">{formatTime(new Date(todayAttendance.clock_out))}</p>
                              <div className="flex items-start text-sm text-gray-500 mt-1">
                                 <LocationMarkerIcon className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0"/>
                                  <p>
                                    {todayAttendance.lokasi_kerja === 'Bekerja di Pabrik' && todayAttendance.tempat_kerja && <span className="font-semibold text-gray-800 block">{todayAttendance.tempat_kerja}</span>}
                                    {todayAttendance.clock_out_address || 'Lokasi tercatat'}
                                 </p>
                              </div>
                          </>
                      ) : <p className="text-gray-500 text-sm">-</p>}
                  </div>
              </div>
          </div>
        </div>
      </div>
      <ClockInModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        onError={handleError}
        user={user}
        actionType={actionType}
        jadwal={jadwal}
        todayAttendance={todayAttendance}
      />
    </>
  );
}

export default AbsensiPage;
