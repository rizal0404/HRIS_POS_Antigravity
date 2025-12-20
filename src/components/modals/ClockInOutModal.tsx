// This file is renamed from pages/Bawahan/ClockInOutModal.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, JadwalKerjaTim, Attendance, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import { APP_TIME_ZONE, formatDateKey, formatTime } from '../../lib/utils';
import Modal from '../Modal';
import { MapContainer, TileLayer, Marker, Circle, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import { buildAttendanceWindow } from '../../lib/attendanceRules';
import { offlineQueue } from '../../lib/offlineQueue';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Define custom icons
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Configuration constants
import { WORKPLACES, MAX_DISTANCE_METERS, getDistanceFromLatLonInM, findNearestWorkplace } from '../../lib/location';

// Configuration constants
const DEFAULT_MAP_CENTER: [number, number] = [-4.819, 119.64];
const ACCURACY_THRESHOLD_METERS = 250;
const formatLocalDate = (date: Date) => formatDateKey(date, APP_TIME_ZONE);

// Validation Level System
enum ValidationLevel {
  NORMAL = 'normal',
  NOTES_REQUIRED = 'notes_required',
  APPROVAL_REQUIRED = 'approval_required',
  BLOCKED = 'blocked',
}

type ValidationResult = {
  level: ValidationLevel;
  reasons: string[];
  flags: string[];
  canProceed: boolean;
  notesRequired: boolean;
};


// Component to adjust map view dynamically
const ChangeView: React.FC<{ userPos: [number, number] | null; workplacePos: [number, number] | null }> = ({
  userPos,
  workplacePos,
}) => {
  const map = useMap();
  useEffect(() => {
    if (userPos && workplacePos) {
      const bounds = L.latLngBounds([userPos, workplacePos]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (userPos) {
      map.flyTo(userPos, 16);
    } else if (workplacePos) {
      map.flyTo(workplacePos, 14);
    }
  }, [userPos, workplacePos, map]);
  return null;
};

interface ClockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string, attendance?: Attendance | null) => void;
  onError: (message: string) => void;
  user: UserProfile;
  actionType: 'in' | 'out';
  jadwal: JadwalKerjaTim[];
  todayAttendance: Attendance | null;
}

export const ClockInModal: React.FC<ClockInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  user,
  actionType,
  jadwal,
  todayAttendance,
}) => {
  const BYPASS_STORAGE_KEY = 'attendance_bypass_mode';
  const [currentTime, setCurrentTime] = useState(new Date());
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [isMockDetected, setIsMockDetected] = useState<boolean>(false);
  const [mockConfidence, setMockConfidence] = useState<number>(0); // 0-100%
  const [mockReasons, setMockReasons] = useState<string[]>([]);
  const [globalBypass, setGlobalBypass] = useState(false);
  const [bypassMode, setBypassMode] = useState(false);

  // Form state
  const [workLocation, setWorkLocation] = useState('Bekerja di Pabrik');
  const [workplace, setWorkplace] = useState(WORKPLACES[0].name);
  const [notes, setNotes] = useState('');

  // Offline queue status
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineQueue();

  const targetWorkDateKey = useMemo(() => {
    if (actionType === 'out' && todayAttendance) {
      return todayAttendance.work_date || formatDateKey(new Date(todayAttendance.clock_in), APP_TIME_ZONE);
    }
    return formatLocalDate(currentTime);
  }, [actionType, todayAttendance, currentTime]);

  const scheduleForAction = useMemo(
    () => jadwal.find((j) => j.date === targetWorkDateKey),
    [jadwal, targetWorkDateKey],
  );
  const attendanceWindow = useMemo(
    () => buildAttendanceWindow(scheduleForAction || null),
    [scheduleForAction],
  );
  const isOffDay = scheduleForAction?.shift === 'OFF';
  const windowLabel = useMemo(() => {
    const start = actionType === 'in' ? attendanceWindow.inStart : attendanceWindow.outStart;
    const end = actionType === 'in' ? attendanceWindow.inEnd : attendanceWindow.outEnd;
    if (!start || !end) return null;
    const startText = start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: APP_TIME_ZONE });
    const endText = end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: APP_TIME_ZONE });
    return `${startText} - ${endText} WITA`;
  }, [actionType, attendanceWindow]);

  const selectedWorkplaceDetails = useMemo(
    () => WORKPLACES.find((wp) => wp.name === workplace),
    [workplace],
  );

  const fetchLocation = useCallback(() => {
    setIsFetchingLocation(true);
    setLocationError(null);
    setIsMockDetected(false);
    setMockConfidence(0);
    setMockReasons([]);

    // Multi-sample validation: collect 3 samples
    const samples: GeolocationPosition[] = [];
    const SAMPLE_COUNT = 3;
    const SAMPLE_INTERVAL = 400; // ms between samples

    const collectSample = (index: number) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          samples.push(pos);
          if (samples.length < SAMPLE_COUNT) {
            setTimeout(() => collectSample(index + 1), SAMPLE_INTERVAL);
          } else {
            // All samples collected - analyze for mock detection
            analyzeSamples(samples);
          }
        },
        (err) => {
          // If any sample fails, use what we have or report error
          if (samples.length > 0) {
            analyzeSamples(samples);
          } else {
            setLocationError(err.message);
            setIsFetchingLocation(false);
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    };

    const analyzeSamples = (positions: GeolocationPosition[]) => {
      const reasons: string[] = [];
      let confidence = 0;
      const latest = positions[positions.length - 1];
      const { latitude, longitude, accuracy, altitude } = latest.coords;

      // === EXISTING HEURISTICS ===
      // 1. Check for unnaturally high coordinate precision
      const latDecimals = String(latitude).split('.')[1]?.length || 0;
      const lonDecimals = String(longitude).split('.')[1]?.length || 0;
      if (latDecimals > 8 || lonDecimals > 8) {
        reasons.push('Presisi koordinat tidak wajar');
        confidence += 15;
      }

      // 2. Check for "perfect" integer accuracy values
      if (Number.isInteger(accuracy) && accuracy > 0) {
        reasons.push('Akurasi GPS bulat sempurna');
        confidence += 15;
      }

      // 3. Check for "perfect" integer altitude
      if (altitude !== null && Number.isInteger(altitude)) {
        reasons.push('Ketinggian bulat sempurna');
        confidence += 10;
      }

      // === NEW HEURISTICS ===
      if (positions.length >= 2) {
        // 4. Timestamp consistency - real GPS has unique timestamps
        const timestamps = positions.map(p => p.timestamp);
        const uniqueTimestamps = new Set(timestamps);
        if (uniqueTimestamps.size < positions.length) {
          reasons.push('Timestamp GPS tidak berubah antar sample');
          confidence += 25;
        }

        // 5. Coordinate variance - real GPS has slight noise
        const lats = positions.map(p => p.coords.latitude);
        const lons = positions.map(p => p.coords.longitude);
        const latVariance = Math.max(...lats) - Math.min(...lats);
        const lonVariance = Math.max(...lons) - Math.min(...lons);

        // Identical coords across samples (variance < 0.0000001 degrees = ~0.01m)
        if (latVariance < 0.0000001 && lonVariance < 0.0000001) {
          reasons.push('Koordinat identik antar sample (tidak ada noise GPS)');
          confidence += 30;
        }

        // 6. Unrealistic speed between samples
        if (positions.length >= 2) {
          const first = positions[0];
          const last = positions[positions.length - 1];
          const distanceM = getDistanceFromLatLonInM(
            first.coords.latitude, first.coords.longitude,
            last.coords.latitude, last.coords.longitude
          );
          const timeDiffSec = (last.timestamp - first.timestamp) / 1000;
          if (timeDiffSec > 0) {
            const speedMs = distanceM / timeDiffSec;
            // > 50 m/s = 180 km/h is unrealistic for a stationary check
            if (speedMs > 50) {
              reasons.push(`Pergerakan tidak realistis (${speedMs.toFixed(1)} m/s)`);
              confidence += 20;
            }
          }
        }
      }

      // 7. DevTools detection (window size mismatch)
      if (typeof window !== 'undefined') {
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > 160 || heightDiff > 160) {
          reasons.push('Developer tools mungkin terbuka');
          confidence += 10;
        }
      }

      // Cap confidence at 100
      confidence = Math.min(confidence, 100);

      // Set results
      setMockConfidence(confidence);
      setMockReasons(reasons);

      // Mark as mock if confidence >= 60%
      if (confidence >= 60) {
        setIsMockDetected(true);
        setLocationError(
          `Kemungkinan lokasi palsu terdeteksi (${confidence}%): ${reasons.slice(0, 2).join(', ')}.`
        );
      }

      setPosition(latest);
      setIsFetchingLocation(false);
    };

    // Start collecting samples
    collectSample(0);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLocation();
      const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timerId);
    }
  }, [isOpen, fetchLocation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(BYPASS_STORAGE_KEY);
    setGlobalBypass(stored === 'on');
    const handler = (e: StorageEvent) => {
      if (e.key === BYPASS_STORAGE_KEY) {
        setGlobalBypass(e.newValue === 'on');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [BYPASS_STORAGE_KEY]);

  useEffect(() => {
    if (position && workLocation === 'Bekerja di Pabrik') {
      const nearest = findNearestWorkplace(position.coords.latitude, position.coords.longitude);
      setWorkplace(nearest.name);
    }
  }, [position, workLocation]);

  useEffect(() => {
    if (position && selectedWorkplaceDetails) {
      const calculatedDistance = getDistanceFromLatLonInM(
        position.coords.latitude,
        position.coords.longitude,
        selectedWorkplaceDetails.lat,
        selectedWorkplaceDetails.lon,
      );
      setDistance(calculatedDistance);
    } else {
      setDistance(null);
    }
  }, [position, selectedWorkplaceDetails]);

  const hasActiveAttendance = useMemo(
    () => !!todayAttendance && !todayAttendance.clock_out,
    [todayAttendance],
  );

  const effectiveBypass = useMemo(() => bypassMode || globalBypass, [bypassMode, globalBypass]);

  // New tiered validation system
  const validation = useMemo((): ValidationResult => {
    const reasons: string[] = [];
    const flags: string[] = [];
    const allowOffDayClockOut = actionType === 'out' && hasActiveAttendance;

    // BLOCKED conditions - cannot proceed at all
    // Only block at very high confidence (90%+)
    if (isMockDetected && mockConfidence >= 90) {
      return {
        level: ValidationLevel.BLOCKED,
        reasons: [`Lokasi palsu terdeteksi (${mockConfidence}%): ${mockReasons.slice(0, 2).join(', ')}`],
        flags: ['mock_location_high'],
        canProceed: false,
        notesRequired: false,
      };
    }

    // Likely mock (60-90%) - require notes with strong warning
    if (mockConfidence >= 60) {
      const notesOk = notes.trim().length >= 5;
      return {
        level: ValidationLevel.NOTES_REQUIRED,
        reasons: [`Deteksi lokasi mencurigakan (${mockConfidence}%): ${mockReasons.slice(0, 2).join(', ')}. Wajib isi alasan.`],
        flags: ['mock_location_likely'],
        canProceed: notesOk,
        notesRequired: true,
      };
    }

    // Basic requirements check
    if (isSubmitting) {
      return {
        level: ValidationLevel.BLOCKED,
        reasons: ['Sedang memproses...'],
        flags: [],
        canProceed: false,
        notesRequired: false,
      };
    }

    if (isFetchingLocation || !position) {
      return {
        level: ValidationLevel.BLOCKED,
        reasons: ['Menunggu data lokasi...'],
        flags: [],
        canProceed: false,
        notesRequired: false,
      };
    }

    if (locationError) {
      return {
        level: ValidationLevel.BLOCKED,
        reasons: [`Error lokasi: ${locationError}`],
        flags: ['location_error'],
        canProceed: false,
        notesRequired: false,
      };
    }

    // Bypass mode - allow everything with position
    if (effectiveBypass) {
      return {
        level: ValidationLevel.NORMAL,
        reasons: ['Bypass mode aktif'],
        flags: ['bypass_mode'],
        canProceed: true,
        notesRequired: false,
      };
    }

    // APPROVAL_REQUIRED - "Lainnya" mode
    if (workLocation === 'Lainnya') {
      const notesOk = notes.trim().length >= 5;
      return {
        level: ValidationLevel.APPROVAL_REQUIRED,
        reasons: ['Absensi dari lokasi lain akan dikirim untuk persetujuan atasan.'],
        flags: ['remote_location'],
        canProceed: notesOk,
        notesRequired: true,
      };
    }

    // "Bekerja di Pabrik" mode - check conditions
    const accuracy = position.coords.accuracy;
    const isAccuracyLow = accuracy > ACCURACY_THRESHOLD_METERS;
    const isOutOfRadius = distance === null || distance > MAX_DISTANCE_METERS;

    // If out of radius completely, must use "Lainnya" mode
    if (isOutOfRadius) {
      return {
        level: ValidationLevel.BLOCKED,
        reasons: [`Anda berada ${distance?.toFixed(0) || '?'}m dari area kerja. Radius maksimal ${MAX_DISTANCE_METERS}m. Gunakan mode "Lainnya" jika bekerja di luar pabrik.`],
        flags: ['out_of_radius'],
        canProceed: false,
        notesRequired: false,
      };
    }

    // Check for conditions that require notes but still allow clock
    if (!allowOffDayClockOut && isOffDay) {
      reasons.push('Hari ini adalah hari libur (OFF)');
      flags.push('off_day_clock');
    }

    if (!allowOffDayClockOut && !scheduleForAction) {
      reasons.push('Tidak ada jadwal kerja untuk hari ini');
      flags.push('no_schedule');
    }

    if (isAccuracyLow) {
      reasons.push(`Akurasi GPS rendah (${accuracy.toFixed(0)}m). Pindah ke area lebih terbuka jika memungkinkan.`);
      flags.push('low_accuracy');
    }

    // Determine level based on accumulated reasons
    if (reasons.length > 0) {
      const notesOk = notes.trim().length >= 5;
      return {
        level: ValidationLevel.NOTES_REQUIRED,
        reasons,
        flags,
        canProceed: notesOk,
        notesRequired: true,
      };
    }

    // Suspicious but not blocking (30-60%) - show warning, allow with caution
    if (mockConfidence >= 30 && mockConfidence < 60) {
      flags.push('mock_location_suspicious');
      // Don't require notes but add to tracking
      return {
        level: ValidationLevel.NORMAL,
        reasons: [`Deteksi lokasi: Perhatian (${mockConfidence}%)`],
        flags,
        canProceed: true,
        notesRequired: false,
      };
    }

    // All good - NORMAL
    return {
      level: ValidationLevel.NORMAL,
      reasons: [],
      flags: [],
      canProceed: true,
      notesRequired: false,
    };
  }, [
    actionType,
    distance,
    hasActiveAttendance,
    isFetchingLocation,
    isMockDetected,
    mockConfidence,
    mockReasons,
    isSubmitting,
    locationError,
    notes,
    position,
    scheduleForAction,
    workLocation,
    effectiveBypass,
    isOffDay,
  ]);

  // Backward compatible - used by button disabled state
  const isActionDisabled = !validation.canProceed;

  const locationMessage = () => {
    if (effectiveBypass) {
      return {
        text: 'Bypass mode aktif: pengecekan jarak/jadwal diabaikan. Pastikan data lokasi tetap akurat.',
        color: 'bg-amber-50 text-amber-800',
      };
    }
    if (isMockDetected) {
      return {
        text: locationError || 'Lokasi tidak wajar terdeteksi. Absensi tidak dapat dilanjutkan.',
        color: 'bg-red-100 text-red-800',
      };
    }

    const accuracy = position?.coords.accuracy ?? 0;
    const isAccuracyLow = accuracy > ACCURACY_THRESHOLD_METERS;

    if (isFetchingLocation) return { text: 'Mencari lokasi Anda...', color: 'bg-blue-50 text-blue-800' };
    if (locationError) return { text: `Gagal mendapatkan lokasi: ${locationError}`, color: 'bg-red-100 text-red-800' };
    if (position) {
      if (isAccuracyLow) {
        return {
          text: `Akurasi rendah (${accuracy.toFixed(0)}m). Coba ke area lebih terbuka.`,
          color: 'bg-orange-100 text-orange-800',
        };
      }
      if (workLocation === 'Bekerja di Pabrik' && distance !== null && distance > MAX_DISTANCE_METERS) {
        return {
          text: `Jarak Anda ${distance.toFixed(0)}m. Anda harus dalam radius ${MAX_DISTANCE_METERS}m untuk clock-in.`,
          color: 'bg-red-100 text-red-800',
        };
      }
      return { text: `Akurasi lokasi ${accuracy.toFixed(2)} meter.`, color: 'bg-green-50 text-green-800' };
    }
    return { text: 'Lokasi tidak tersedia.', color: 'bg-gray-100 text-gray-800' };
  };

  const handleSubmit = async () => {
    if (isActionDisabled) {
      onError('Kondisi tidak memenuhi syarat.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (workLocation === 'Bekerja di Pabrik') {
        // With tiered validation, we now allow clock-in without schedule if notes are provided
        // The validation.flags will be passed to track special conditions
        try {
          const attendanceRecord = await apiService.submitClockEvent(user, actionType, {
            workLocationType: workLocation,
            workplace,
            notes,
            position,
            targetSchedule: scheduleForAction,
            activeAttendance: todayAttendance,
            attendanceFlags: validation.flags,
          });
          onSuccess(`${actionType === 'in' ? 'Clock In' : 'Clock Out'} berhasil!`, attendanceRecord);
        } catch (networkError) {
          // If network fails, queue locally
          console.log('[ClockInOutModal] Network failed, queuing offline...');
          const today = new Date();
          const workDate = formatLocalDate(today);

          await offlineQueue.enqueue({
            type: actionType === 'in' ? 'clock_in' : 'clock_out',
            timestamp: today.toISOString(),
            payload: {
              profile_id: user.id,
              clock_in: actionType === 'in' ? today.toISOString() : undefined,
              clock_out: actionType === 'out' ? today.toISOString() : undefined,
              clock_in_coords: actionType === 'in' && position ? { lat: position.coords.latitude, lon: position.coords.longitude } : undefined,
              clock_out_coords: actionType === 'out' && position ? { lat: position.coords.latitude, lon: position.coords.longitude } : undefined,
              clock_in_address: actionType === 'in' ? 'Disimpan offline - akan disinkronkan' : undefined,
              clock_out_address: actionType === 'out' ? 'Disimpan offline - akan disinkronkan' : undefined,
              work_date: workDate,
              lokasi_kerja: workLocation,
              tempat_kerja: workplace,
              catatan: notes ? `${notes} [Flags: ${validation.flags.join(', ')}]` : `[Flags: ${validation.flags.join(', ')}]`,
              attendance_id: todayAttendance?.id,
            },
          });
          onSuccess(
            `${actionType === 'in' ? 'Clock In' : 'Clock Out'} disimpan offline. Akan otomatis disinkronkan saat online.`,
            null
          );
        }
      } else {
        // workLocation === 'Lainnya'
        const today = new Date();
        const tanggalPembetulan = formatLocalDate(today);
        const jamPembetulan = new Intl.DateTimeFormat('en-GB', {
          timeZone: APP_TIME_ZONE,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(today);

        await apiService.addPembetulanPresensi({
          user: user,
          tanggalPembetulan: tanggalPembetulan,
          jamPembetulan: jamPembetulan,
          clockType: actionType,
          alasan: notes,
          todayAttendanceId: todayAttendance?.id,
        });
        onSuccess(`Ajuan clock-${actionType} dari lokasi 'Lainnya' telah dikirim ke atasan untuk persetujuan.`, null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan.';
      onError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = actionType === 'in' ? 'Clock In' : 'Clock Out';
  const { text: locText, color: locColor } = locationMessage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {user.role === UserRole.SUPERADMIN && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 p-3">
            <div>
              <p className="text-sm font-semibold text-amber-800">Bypass mode (darurat)</p>
              <p className="text-xs text-amber-700">Aktifkan untuk melewati batas jarak/jadwal pada clock in/out.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={effectiveBypass}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setBypassMode(enabled);
                  setGlobalBypass(enabled);
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem(BYPASS_STORAGE_KEY, enabled ? 'on' : 'off');
                  }
                }}
              />
              Aktif
            </label>
          </div>
        )}

        {/* Offline Status Indicator */}
        {(!isOnline || pendingCount > 0) && (
          <div className={`flex items-center justify-between p-2 rounded-md text-xs ${!isOnline ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'
            }`}>
            <div className="flex items-center gap-2">
              <span className={`flex h-2 w-2 rounded-full ${!isOnline ? 'bg-slate-400' : 'bg-blue-500 animate-pulse'}`} />
              <span className="font-medium">
                {!isOnline
                  ? 'Mode Offline - Absensi akan disimpan lokal'
                  : isSyncing
                    ? 'Menyinkronkan...'
                    : `${pendingCount} absensi tertunda`}
              </span>
            </div>
            {isOnline && pendingCount > 0 && !isSyncing && (
              <button
                onClick={syncNow}
                className="text-blue-600 font-semibold hover:underline"
              >
                Sinkronkan
              </button>
            )}
          </div>
        )}

        {/* Map Container - Mobile Style */}
        <div className="bg-white rounded-3xl p-2 shadow-lg">
          <div className="h-52 w-full rounded-2xl overflow-hidden relative bg-slate-800">
            <MapContainer center={DEFAULT_MAP_CENTER} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
              <ChangeView
                userPos={position ? [position.coords.latitude, position.coords.longitude] : null}
                workplacePos={selectedWorkplaceDetails ? [selectedWorkplaceDetails.lat, selectedWorkplaceDetails.lon] : null}
              />
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
              {position && (
                <>
                  <Marker position={[position.coords.latitude, position.coords.longitude]} icon={blueIcon}>
                    <Popup>Lokasi Anda Saat Ini</Popup>
                  </Marker>
                  <Circle
                    center={[position.coords.latitude, position.coords.longitude]}
                    radius={position.coords.accuracy}
                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1 }}
                  />
                </>
              )}
              {selectedWorkplaceDetails && (
                <>
                  <Marker position={[selectedWorkplaceDetails.lat, selectedWorkplaceDetails.lon]} icon={redIcon}>
                    <Popup>{selectedWorkplaceDetails.name}</Popup>
                  </Marker>
                  <Circle
                    center={[selectedWorkplaceDetails.lat, selectedWorkplaceDetails.lon]}
                    radius={MAX_DISTANCE_METERS}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1 }}
                  />
                </>
              )}
            </MapContainer>
          </div>
        </div>
        <div className={`text-center text-sm p-2 rounded-xl ${locColor}`}>
          <p className="font-semibold">{locText}</p>
          {!isFetchingLocation && (
            <button onClick={fetchLocation} className="text-blue-600 font-semibold hover:underline">
              Tekan u/ refresh lokasi Ta!
            </button>
          )}
        </div>

        {/* Mock Confidence Indicator */}
        {!isFetchingLocation && mockConfidence > 0 && (
          <div className={`flex items-center justify-between p-2 rounded-md text-xs ${mockConfidence >= 90 ? 'bg-red-100 text-red-800' :
            mockConfidence >= 60 ? 'bg-orange-100 text-orange-800' :
              mockConfidence >= 30 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
            }`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">
                {mockConfidence >= 60 ? 'gpp_bad' : mockConfidence >= 30 ? 'gpp_maybe' : 'verified_user'}
              </span>
              <span className="font-medium">
                Validasi Lokasi: {mockConfidence >= 90 ? 'Terblokir' : mockConfidence >= 60 ? 'Mencurigakan' : mockConfidence >= 30 ? 'Perhatian' : 'Normal'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 bg-white/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${mockConfidence >= 60 ? 'bg-red-500' : mockConfidence >= 30 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                  style={{ width: `${mockConfidence}%` }}
                />
              </div>
              <span className="font-bold">{mockConfidence}%</span>
            </div>
          </div>
        )}
        {windowLabel ? (
          <div className="text-center p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm">
            Window clock-{actionType.toUpperCase()} : {windowLabel}
          </div>
        ) : null}

        {/* Validation Warning Banner */}
        {validation.level === ValidationLevel.NOTES_REQUIRED && validation.reasons.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg animate-fade-in">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[20px] mt-0.5">warning</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Catatan wajib diisi</p>
                <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                  {validation.reasons.map((reason, idx) => (
                    <li key={idx}>• {reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {validation.level === ValidationLevel.APPROVAL_REQUIRED && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[20px] mt-0.5">info</span>
              <div>
                <p className="text-sm font-semibold text-blue-800">Perlu Persetujuan Atasan</p>
                <p className="text-xs text-blue-700 mt-1">Absensi dari lokasi lain akan dikirim ke atasan untuk disetujui.</p>
              </div>
            </div>
          </div>
        )}

        {validation.level === ValidationLevel.BLOCKED && validation.reasons.length > 0 && !isFetchingLocation && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-red-600 text-[20px] mt-0.5">block</span>
              <div>
                <p className="text-sm font-semibold text-red-800">Tidak dapat melanjutkan</p>
                <ul className="text-xs text-red-700 mt-1 space-y-0.5">
                  {validation.reasons.map((reason, idx) => (
                    <li key={idx}>• {reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        <div className="text-center p-3 bg-slate-100 rounded-lg">
          <p className="font-bold text-lg">
            {currentTime.toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: APP_TIME_ZONE,
            })}{' '}
            <span className="text-blue-600">{scheduleForAction?.shift || 'OFF'}</span>
          </p>
          <p className="text-xs text-slate-500">Periode kerja: {targetWorkDateKey}</p>
          <p className="font-mono text-2xl font-bold tracking-wider">
            {formatTime(currentTime, { second: '2-digit' })} WITA
          </p>
          <p className="text-xs text-slate-500">Zona: {APP_TIME_ZONE}</p>
        </div>

        {/* Work Location Toggle - Mobile Style */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Lokasi Kerja
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWorkLocation('Bekerja di Pabrik')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${workLocation === 'Bekerja di Pabrik'
                ? 'bg-yellow-400 text-gray-900 shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">business</span>
              Pabrik
            </button>
            <button
              type="button"
              onClick={() => setWorkLocation('Lainnya')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${workLocation === 'Lainnya'
                ? 'bg-yellow-400 text-gray-900 shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">place</span>
              Lainnya
            </button>
          </div>
        </div>

        {/* Schedule Grid - Mobile Style */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Jadwal Masuk</p>
            <p className="text-lg font-bold text-slate-800">
              {scheduleForAction?.start_time?.slice(0, 5) || '--:--'}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Jadwal Pulang</p>
            <p className="text-lg font-bold text-slate-800">
              {scheduleForAction?.end_time?.slice(0, 5) || '--:--'}
            </p>
          </div>
        </div>

        {workLocation === 'Bekerja di Pabrik' && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lokasi Kerja Terdeteksi</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100/50 rounded-full">
                <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-green-700">Verified</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-11 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined text-[24px]">location_on</span>
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-800 leading-none mb-1">{workplace}</div>
                <div className="text-xs font-medium text-slate-500">PT Semen Tonasa</div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Input */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Catatan/Alasan
            {validation.notesRequired && <span className="text-red-500"> *</span>}
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`mt-1 block w-full shadow-sm sm:text-sm rounded-xl ${validation.notesRequired && notes.trim().length < 5
              ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500'
              : 'border-slate-300'
              }`}
            required={validation.notesRequired}
            placeholder={validation.notesRequired ? 'Wajib diisi (minimal 5 karakter)' : 'Opsional'}
          />
          {validation.notesRequired && notes.trim().length > 0 && notes.trim().length < 5 && (
            <p className="text-xs text-amber-600 mt-1">Minimal 5 karakter ({notes.trim().length}/5)</p>
          )}
        </div>

        {/* Large Action Button - Mobile Style */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isActionDisabled}
          className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl shadow-lg text-lg font-bold transition-all ${actionType === 'in'
            ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-500 disabled:bg-slate-200'
            : 'bg-red-500 text-white hover:bg-red-600 disabled:bg-slate-300'
            } disabled:cursor-not-allowed disabled:shadow-none`}
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Memproses...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[28px]">
                {actionType === 'in' ? 'login' : 'logout'}
              </span>
              <div className="text-left">
                <div>{workLocation === 'Lainnya' ? 'Kirim Ajuan' : actionType === 'in' ? 'CLOCK IN' : 'CLOCK OUT'}</div>
                <div className="text-sm font-normal opacity-70">
                  {formatTime(currentTime, { second: '2-digit' })} WITA
                </div>
              </div>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-slate-500 text-sm font-medium hover:text-slate-700"
        >
          Batal
        </button>
      </div>
    </Modal>
  );
};
