"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDate, formatTime, formatDateKey, APP_TIME_ZONE, APP_TIME_OFFSET } from '../../../lib/utils';
import {
  ClockIcon,
  LocationMarkerIcon,
  BriefcaseIcon,
  OfficeBuildingIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '../../../components/icons';
import { UserProfile, Attendance, JadwalKerjaTim, Shift } from '../../../types';
import { ClockInModal } from '../../../components/modals/ClockInOutModal';
import { apiService } from '../../../services/apiService';
import AttendanceMap from '../../../components/maps/AttendanceMap'; // New component
import Card from '../../../components/ui/Card'; // Reusable component
import Badge from '../../../components/ui/Badge'; // Reusable component
import ProgressBar from '../../../components/ui/ProgressBar'; // Reusable component
import Spinner from '@/components/ui/Spinner';
import { findNearestWorkplace } from '../../../lib/location';


// --- Helper Components ---

const DigitalClock = ({ time }: { time: Date }) => {
  const hours = formatTime(time, { hour: '2-digit', hour12: false }).split(':')[0];
  const minutes = formatTime(time, { minute: '2-digit' }).split(':')[0]; // formatTime usually returns HH:mm
  const seconds = time.toLocaleTimeString('en-US', { second: '2-digit' }).slice(0, 2); // simplistic extraction

  return (
    <div className="flex items-center gap-2">
      <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg text-slate-800 font-bold text-3xl shadow-sm min-w-[3.5rem] text-center">
        {time.getHours().toString().padStart(2, '0')}
      </div>
      <span className="text-2xl font-bold text-slate-600">:</span>
      <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg text-slate-800 font-bold text-3xl shadow-sm min-w-[3.5rem] text-center">
        {time.getMinutes().toString().padStart(2, '0')}
      </div>
      <span className="text-2xl font-bold text-slate-600">:</span>
      <div className="bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg text-slate-500 font-bold text-2xl shadow-sm min-w-[3rem] text-center">
        {time.getSeconds().toString().padStart(2, '0')}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, subtext, color = "blue" }: any) => (
  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
        <Icon className="text-[20px]" />
      </div>
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
    </div>
    <div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{subtext}</div>
    </div>
  </div>
);

// --- Main Page Component ---

enum AttendanceStatus {
  NOT_CLOCKED_IN,
  CLOCKED_IN,
  CLOCKED_OUT,
  LOADING,
  ERROR,
}

interface AbsensiPageProps {
  user: UserProfile;
}

const AbsensiPage: React.FC<AbsensiPageProps> = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.LOADING);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'in' | 'out'>('in');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isOnApprovedLeave, setIsOnApprovedLeave] = useState(false);
  const [jadwal, setJadwal] = useState<JadwalKerjaTim[]>([]);
  const [currentPos, setCurrentPos] = useState<{ lat: number, lng: number } | undefined>(undefined);
  // Simple activity history state
  const [recentActivities, setRecentActivities] = useState<{ title: string, date: string, time: string, status: string, location: string }[]>([]);
  const [currentWorkplace, setCurrentWorkplace] = useState<string>('Mencari...');




  // Start clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Position once on mount for the map center
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const nearest = findNearestWorkplace(pos.coords.latitude, pos.coords.longitude);
        setCurrentWorkplace(nearest.name);
      });
    }
  }, []);



  const checkAttendanceStatus = useCallback(async () => {
    setStatus(AttendanceStatus.LOADING);
    try {
      const today = new Date();
      const todayISO = formatDateKey(today);
      const startDate = formatDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
      const endDate = formatDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));

      const [attendance, approvedLeaves, scheduleData, history] = await Promise.all([
        apiService.getActiveAttendance(user.id),
        apiService.getApprovedLeaves(user.id, todayISO),
        apiService.getTeamSchedules([user.id], startDate, endDate),
        apiService.getAttendanceForSubordinates([user.id], startDate, endDate), // Fetch history for sidebar
      ]);

      // Mocking Recent Activity from history (last 5)
      const activities = history.slice(0, 5).map(att => ({
        title: att.clock_out ? 'Clock Out' : 'Clock In',
        date: formatDate(new Date(att.clock_in)),
        time: att.clock_out ? formatTime(new Date(att.clock_out)) : formatTime(new Date(att.clock_in)),
        status: att.clock_out ? 'Pulang' : 'Hadir',
        location: att.tempat_kerja || 'Unknown'
      }));

      setRecentActivities(activities);

      // Schedule Logic (Simplified from original)
      const scheduleMap = new Map<string, JadwalKerjaTim>();
      scheduleData.forEach(s => scheduleMap.set(s.date, { ...s }));
      setJadwal(Array.from(scheduleMap.values()));

      setIsOnApprovedLeave(approvedLeaves.length > 0);

      setActiveAttendance(attendance);
      const clockInDateKey = attendance ? formatDateKey(new Date(attendance.clock_in), APP_TIME_ZONE) : null;
      const attendanceDateKey = attendance
        ? [attendance.work_date, clockInDateKey].filter(Boolean).sort().pop() || null
        : null;
      const attendanceForToday = attendanceDateKey === todayISO ? attendance : null;
      setTodayAttendance(attendanceForToday);

      if (!attendance) {
        setStatus(AttendanceStatus.NOT_CLOCKED_IN);
      } else if (attendance.clock_out) {
        setStatus(AttendanceStatus.CLOCKED_OUT);
      } else {
        setStatus(AttendanceStatus.CLOCKED_IN);
      }
    } catch (error: any) {
      setStatus(AttendanceStatus.ERROR);
      setToastMessage({ type: 'error', message: error.message || 'Gagal memuat status presensi.' });
    }
  }, [user.id]);

  useEffect(() => {
    checkAttendanceStatus();
  }, [checkAttendanceStatus]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleOpenModal = (type: 'in' | 'out') => {
    setActionType(type);
    setIsModalOpen(true);
  };

  const handleSuccess = (message: string, newAttendance?: Attendance | null) => {
    setToastMessage({ type: 'success', message });
    if (newAttendance) {
      setActiveAttendance(newAttendance);
      const clockInDateKey = formatDateKey(new Date(newAttendance.clock_in), APP_TIME_ZONE);
      // Logic to update todayAttendance if applicable
      if (formatDateKey(new Date(), APP_TIME_ZONE) === clockInDateKey || formatDateKey(new Date(), APP_TIME_ZONE) === newAttendance.work_date) {
        setTodayAttendance(newAttendance);
      }
      if (actionType === 'in') setStatus(AttendanceStatus.CLOCKED_IN);
      else setStatus(AttendanceStatus.CLOCKED_OUT);
    }
    setIsModalOpen(false);
  };

  const todayISO = useMemo(() => formatDateKey(currentTime), [currentTime]);
  const todaySchedule = useMemo(() => jadwal.find(j => j.date === todayISO), [jadwal, todayISO]);
  const isOffDay = todaySchedule?.shift === 'OFF';

  // Derived Values for UI
  const shiftLabel = todaySchedule ? todaySchedule.shift : '-';
  const officeLabel = activeAttendance?.tempat_kerja || currentWorkplace;

  const duration = useMemo(() => {
    if (!activeAttendance || !activeAttendance.clock_in) return '-- : --';
    const start = new Date(activeAttendance.clock_in);
    const end = activeAttendance.clock_out ? new Date(activeAttendance.clock_out) : currentTime;
    const diffMs = end.getTime() - start.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m`;
  }, [activeAttendance, currentTime]);

  return (
    <>
      <div className={`relative min-h-screen transition-all duration-500 ${isModalOpen ? 'blur-md grayscale-[20%] scale-[0.99] pointer-events-none' : ''}`}>

        {/* Main Content Grid */}
        <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">

          {/* Left Column (Main) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-fade-in">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  Halo, {user.full_name.split(' ')[0]}! <span className="animate-bounce-custom inline-block">👋</span>
                </h1>
                <p className="text-slate-500 mt-2 text-lg">Siap untuk bekerja hari ini? Jangan lupa clock-in.</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">HARI INI</p>
                <p className="text-xl font-bold text-slate-700">
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Map & Action Card */}
            {/* Map & Action Card */}
            <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden relative border border-slate-200 h-[380px] group animate-fade-in isolate">
              {/* The Map */}
              <AttendanceMap
                className="h-full w-full z-0"
                currentPos={currentPos}
                clockInPos={todayAttendance?.clock_in_coordinates ? {
                  lat: todayAttendance.clock_in_coordinates.latitude,
                  lng: todayAttendance.clock_in_coordinates.longitude,
                  address: todayAttendance.clock_in_address
                } : undefined}
                clockOutPos={todayAttendance?.clock_out_coordinates ? {
                  lat: todayAttendance.clock_out_coordinates.latitude,
                  lng: todayAttendance.clock_out_coordinates.longitude,
                  address: todayAttendance.clock_out_address
                } : undefined}
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-10"></div>

              {/* Floating Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex flex-col md:flex-row items-end md:items-center justify-between gap-4 pointer-events-auto z-[1000]">

                {/* Digital Timer */}
                <div className="flex flex-col gap-2">
                  <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-white/20 inline-flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Time</span>
                    <DigitalClock time={currentTime} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => handleOpenModal('in')}
                    disabled={status !== AttendanceStatus.NOT_CLOCKED_IN || isOnApprovedLeave || isOffDay}
                    className="flex-1 md:flex-none py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/30 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">login</span>
                    Clock In
                  </button>
                  <button
                    onClick={() => handleOpenModal('out')}
                    disabled={status !== AttendanceStatus.CLOCKED_IN || isOnApprovedLeave}
                    className="flex-1 md:flex-none py-3 px-6 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-base shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-red-500 text-[20px]">logout</span>
                    Clock Out
                  </button>
                </div>
              </div>

              {/* Location Badge Overlay */}
              <div className="absolute top-6 left-6 pointer-events-none z-[1000]">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-md border border-white/20 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-[20px]">my_location</span>
                  <span className="font-semibold text-slate-700 text-sm">{currentWorkplace}</span>
                </div>
              </div>
            </div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in delay-100">
              <StatCard
                icon={ClockIcon}
                label="SHIFT"
                value={shiftLabel}
                subtext="09:00 - 18:00"
                color="blue"
              />
              <StatCard
                icon={BriefcaseIcon}
                label="DURASI"
                value={duration}
                subtext="Hours Worked"
                color="green"
              />
              <StatCard
                icon={status === AttendanceStatus.CLOCKED_IN ? CheckCircleIcon : ExclamationCircleIcon}
                label="STATUS"
                value={status === AttendanceStatus.CLOCKED_IN ? 'Present' : status === AttendanceStatus.CLOCKED_OUT ? 'Finished' : 'Absent'}
                subtext={status === AttendanceStatus.CLOCKED_IN ? 'On Time' : 'Belum Absen'}
                color={status === AttendanceStatus.CLOCKED_IN ? 'emerald' : 'orange'}
              />
              <StatCard
                icon={OfficeBuildingIcon}
                label="OFFICE"
                value={officeLabel === 'Bekerja di Pabrik' ? 'Factory' : officeLabel}
                subtext="HQ - Lt. 12"
                color="purple"
              />
            </div>

          </div>

          {/* Right Column (Sidebar) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Total Hours Widget */}
            <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-xl shadow-blue-500/20">
              <div className="mb-6">
                <h3 className="text-blue-100 font-semibold text-sm uppercase tracking-wider mb-1">Total Jam Kerja Minggu Ini</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">38.5</span>
                  <span className="text-xl font-medium text-blue-200">Jam</span>
                </div>
              </div>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <span className="text-xs font-semibold inline-block text-blue-100">Progress</span>
                  <span className="text-xs font-semibold inline-block text-blue-100">Target: 40 Jam</span>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-800/50">
                  <div style={{ width: "85%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-white rounded-full"></div>
                </div>
              </div>
            </Card>

            {/* Activity History */}
            <Card className="p-0 overflow-hidden border border-slate-100 shadow-lg">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Riwayat Aktivitas</h3>
                <button className="text-blue-600 text-sm font-semibold hover:underline">Lihat Semua</button>
              </div>
              <div className="p-0">
                <div className="relative">
                  {/* Vertical Line */}
                  <div className="absolute top-0 bottom-0 left-8 w-px bg-slate-200"></div>

                  {/* Timeline Items */}
                  <ul className="py-2">
                    {recentActivities.length > 0 ? recentActivities.map((act, idx) => (
                      <li key={idx} className="relative pl-16 pr-6 py-4 hover:bg-slate-50 transition-colors group cursor-default">
                        <div className={`absolute left-[29px] top-6 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${act.title.includes('In') ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-slate-400 font-semibold mb-0.5">{act.date}</p>
                            <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{act.title}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-[14px]">location_on</span>
                              {act.location}
                            </p>

                          </div>
                          <div className="bg-slate-100 px-2 py-1 rounded-md text-xs font-bold text-slate-600 group-hover:bg-white group-hover:shadow-sm transition-all">{act.time}</div>
                        </div>
                      </li>
                    )) : (
                      <li className="p-6 text-center text-slate-400 text-sm">Belum ada aktivitas baru.</li>
                    )}
                  </ul>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* Modal and Toast outside of blurred content */}
      <ClockInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        onError={(msg) => setToastMessage({ type: 'error', message: msg })}
        user={user}
        actionType={actionType}
        jadwal={jadwal}
        todayAttendance={activeAttendance}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ${toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            <span className="material-symbols-outlined">{toastMessage.type === 'success' ? 'check_circle' : 'error'}</span>
            <p className="font-medium">{toastMessage.message}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default AbsensiPage;
