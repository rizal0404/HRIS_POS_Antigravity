import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    Linking,
    TextInput,
    Dimensions,
    Platform,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import JailMonkey from 'jail-monkey';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import { WebView } from 'react-native-webview';
import { supabase } from '../lib/supabase';
import {
    buildAttendanceWindow,
    validateClockWindow,
    computeAttendanceOutcome,
    formatDateKey,
    determineWorkDate,
    getTimeGreeting,
    AttendanceLogData,
} from '../lib/attendanceRules';
import { offlineQueue, SyncStatus } from '../lib/offlineQueue';
import { localCache } from '../lib/localCache';
import { JadwalKerjaTim, Attendance, Shift } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Theme Colors
const COLORS = {
    primary: '#f9f506',
    backgroundLight: '#f8f8f5',
    textDark: '#181811',
    textMuted: '#737373',
    cardBg: '#ffffff',
    border: '#e5e5e5',
    success: '#10b981',
    successBg: '#dcfce7',
    warning: '#f59e0b',
    warningBg: '#fef3c7',
    danger: '#ef4444',
    dangerBg: '#fee2e2',
    info: '#3b82f6',
    infoBg: '#dbeafe',
};

// ==========================================
// CONFIGURATION
// ==========================================
const WORKPLACES = [
    { name: 'Tonasa 23', lat: -4.783714780572759, lon: 119.61610006600712 },
    { name: 'Tonasa 4', lat: -4.78831873823137, lon: 119.61654058396095 },
    { name: 'Tonasa 5', lat: -4.790931202719051, lon: 119.61694886888938 },
    { name: 'Crusher', lat: -4.7893251806455295, lon: 119.62039780223822 },
    { name: 'Kantor Staf', lat: -4.788360643865878, lon: 119.61309925103656 },
    { name: 'Palmer', lat: -4.799717216, lon: 119.60308636409 },
];

const MAX_DISTANCE_METERS = 350;
const ACCURACY_THRESHOLD_METERS = 250;
const MAX_SELFIE_SIZE_KB = 100;

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function findNearestWorkplace(lat: number, lon: number) {
    let nearest = WORKPLACES[0];
    let minDistance = Infinity;
    for (const wp of WORKPLACES) {
        const dist = getDistanceFromLatLonInM(lat, lon, wp.lat, wp.lon);
        if (dist < minDistance) { minDistance = dist; nearest = wp; }
    }
    return { workplace: nearest, distance: minDistance };
}

function detectMockLocation(location: Location.LocationObject): { isMock: boolean; confidence: number } {
    if (location.mocked) {
        return { isMock: true, confidence: 100 };
    }
    try {
        if (Platform.OS !== 'web' && JailMonkey.canMockLocation()) {
            return { isMock: true, confidence: 90 };
        }
    } catch (e) { }
    return { isMock: false, confidence: 0 };
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ClockScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [address, setAddress] = useState<string>('Memuat lokasi...');
    const [loading, setLoading] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [hasActiveAttendance, setHasActiveAttendance] = useState(false);
    const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [workLocationType, setWorkLocationType] = useState<'pabrik' | 'lainnya'>('pabrik');
    const [isMockDetected, setIsMockDetected] = useState(false);
    const [isDeviceCompromised, setIsDeviceCompromised] = useState(false);
    const [compromiseReason, setCompromiseReason] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [notesRequired, setNotesRequired] = useState(false);
    const [schedule, setSchedule] = useState<JadwalKerjaTim | null>(null);
    const [shiftDetails, setShiftDetails] = useState<Shift | null>(null);
    const [windowMessage, setWindowMessage] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        const checkOnline = async () => {
            const online = await offlineQueue.checkOnline();
            setIsOnline(online);
        };
        checkOnline();
        const unsubscribe = offlineQueue.addListener(setSyncStatus);
        offlineQueue.getStatus().then(setSyncStatus);
        return unsubscribe;
    }, []);

    const nearestWorkplace = useMemo(() => {
        if (!location) return null;
        return findNearestWorkplace(location.coords.latitude, location.coords.longitude);
    }, [location]);

    const isWithinRadius = useMemo(() => {
        if (!nearestWorkplace) return false;
        return nearestWorkplace.distance <= MAX_DISTANCE_METERS;
    }, [nearestWorkplace]);

    const isAccuracyLow = useMemo(() => {
        if (!location) return true;
        const accuracy = location.coords.accuracy;
        return (accuracy ?? Infinity) > ACCURACY_THRESHOLD_METERS;
    }, [location]);

    const canPerformAction = useMemo(() => {
        if (loading || isFetchingLocation || !location) return false;
        if (isMockDetected || isDeviceCompromised) return false;
        if (notesRequired && notes.trim().length < 5) return false;
        if (workLocationType === 'lainnya') return true;
        if (isAccuracyLow) return false;
        if (!isWithinRadius) return false;
        return true;
    }, [loading, isFetchingLocation, location, isMockDetected, isDeviceCompromised, notesRequired, notes, workLocationType, isAccuracyLow, isWithinRadius]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchSchedule = useCallback(async () => {
        const online = await offlineQueue.checkOnline();
        setIsOnline(online);

        // If offline, try to load from cache
        if (!online) {
            console.log('[ClockScreen] Offline - loading schedule from cache');
            const cachedSchedule = await localCache.getCachedTodaySchedule();
            if (cachedSchedule?.shift_code) {
                const scheduleObj: JadwalKerjaTim = {
                    profile_id: '',
                    date: formatDateKey(new Date()),
                    shift: cachedSchedule.shift_code,
                    start_time: cachedSchedule.shift?.start_time,
                    end_time: cachedSchedule.shift?.end_time,
                };
                setSchedule(scheduleObj);
                setShiftDetails(cachedSchedule.shift || null);
            }
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            const today = formatDateKey(new Date());
            const { data: scheduleData, error: scheduleError } = await supabase
                .from('work_schedules')
                .select('shift_code, date, profile_id')
                .eq('profile_id', user.id)
                .eq('date', today)
                .single();

            if (scheduleData && scheduleData.shift_code) {
                const { data: shiftData } = await supabase
                    .from('shifts')
                    .select('*')
                    .eq('code', scheduleData.shift_code)
                    .single();

                const scheduleObj: JadwalKerjaTim = {
                    profile_id: scheduleData.profile_id,
                    date: scheduleData.date,
                    shift: scheduleData.shift_code,
                    start_time: shiftData?.start_time || undefined,
                    end_time: shiftData?.end_time || undefined,
                };

                setSchedule(scheduleObj);
                setShiftDetails(shiftData || null);

                // Cache for offline use
                await localCache.cacheTodaySchedule({
                    shift_code: scheduleData.shift_code,
                    shift: shiftData,
                });

                const window = buildAttendanceWindow(scheduleObj);
                const result = validateClockWindow(
                    hasActiveAttendance ? 'out' : 'in',
                    new Date(),
                    window
                );
                setNotesRequired(result.requiresNote);
                setWindowMessage(result.message);
            } else {
                setSchedule(null);
                setShiftDetails(null);
                setNotesRequired(true);
                setWindowMessage('Tidak ada jadwal untuk hari ini (OFF)');
            }
        } catch (e) {
            console.error('[ClockScreen] fetchSchedule error:', e);
            // Try cache on error
            const cachedSchedule = await localCache.getCachedTodaySchedule();
            if (cachedSchedule?.shift_code) {
                setSchedule({
                    profile_id: '',
                    date: formatDateKey(new Date()),
                    shift: cachedSchedule.shift_code,
                    start_time: cachedSchedule.shift?.start_time,
                    end_time: cachedSchedule.shift?.end_time,
                });
                setShiftDetails(cachedSchedule.shift || null);
            } else {
                setSchedule(null);
                setShiftDetails(null);
                setNotesRequired(true);
                setWindowMessage('Gagal memuat jadwal');
            }
        }
    }, [hasActiveAttendance]);

    const fetchLocation = useCallback(async () => {
        setIsFetchingLocation(true);
        setLocationError(null);
        setIsMockDetected(false);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Izin lokasi diperlukan');
                return;
            }

            let loc: Location.LocationObject | null = null;

            // Try to get current position with timeout
            try {
                // Use Balanced accuracy instead of High - works better offline
                // High accuracy may require A-GPS which needs internet
                loc = await Promise.race([
                    Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                        mayShowUserSettingsDialog: true,
                    }),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('timeout')), 10000)
                    )
                ]);
            } catch (e: any) {
                console.log('[ClockScreen] getCurrentPosition failed, trying lastKnown:', e.message);
                // Fallback to last known position (works offline!)
                loc = await Location.getLastKnownPositionAsync({
                    maxAge: 60000, // Accept position up to 1 minute old
                    requiredAccuracy: 500, // 500m accuracy acceptable offline
                });
            }

            if (!loc) {
                // Final fallback - try with lower accuracy
                try {
                    loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Low,
                    });
                } catch {
                    setLocationError('Tidak dapat mendapatkan lokasi. Pastikan GPS aktif.');
                    return;
                }
            }

            if (!loc) {
                setLocationError('Lokasi tidak tersedia');
                return;
            }

            const mockResult = detectMockLocation(loc);
            if (mockResult.isMock) {
                setIsMockDetected(true);
                setLocationError('Lokasi tidak valid');
            }

            setLocation(loc);

            // Try reverse geocode, but don't fail if it doesn't work (offline)
            try {
                const [addr] = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
                if (addr) {
                    setAddress(`${addr.street || ''} ${addr.city || ''}`.trim() || 'Lokasi terdeteksi');
                } else {
                    setAddress('Lokasi terdeteksi');
                }
            } catch {
                // Offline - just show coordinates-based address
                setAddress(`Lat: ${loc.coords.latitude.toFixed(4)}, Lon: ${loc.coords.longitude.toFixed(4)}`);
            }
        } catch (e: any) {
            console.error('[ClockScreen] fetchLocation error:', e);
            setLocationError(e.message || 'Gagal mendapatkan lokasi');
        } finally {
            setIsFetchingLocation(false);
        }
    }, []);

    const checkActiveAttendance = useCallback(async () => {
        const online = await offlineQueue.checkOnline();

        // If offline, try loading from cache
        if (!online) {
            console.log('[ClockScreen] Offline - loading attendance from cache');
            const cachedAttendance = await localCache.getCachedActiveAttendance();
            if (cachedAttendance && !cachedAttendance.clock_out) {
                setHasActiveAttendance(true);
                setActiveAttendance(cachedAttendance);
            } else {
                setHasActiveAttendance(false);
                setActiveAttendance(null);
            }
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;
            const today = formatDateKey(new Date());
            const { data } = await supabase
                .from('attendance')
                .select('*')
                .eq('profile_id', user.id)
                .is('clock_out', null)
                .order('clock_in', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setHasActiveAttendance(true);
                setActiveAttendance(data);
                // Cache for offline use
                await localCache.cacheActiveAttendance(data);
            } else {
                setHasActiveAttendance(false);
                setActiveAttendance(null);
                await localCache.cacheActiveAttendance(null);
            }
        } catch {
            // Try cache on error
            const cachedAttendance = await localCache.getCachedActiveAttendance();
            if (cachedAttendance && !cachedAttendance.clock_out) {
                setHasActiveAttendance(true);
                setActiveAttendance(cachedAttendance);
            } else {
                setHasActiveAttendance(false);
                setActiveAttendance(null);
            }
        }
    }, []);

    useEffect(() => {
        fetchLocation();
        checkActiveAttendance();
        fetchSchedule();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchSchedule();
            checkActiveAttendance();
        }, [fetchSchedule, checkActiveAttendance])
    );

    const captureSelfie = async (): Promise<string | null> => {
        if (!cameraRef.current) return null;
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
            if (!photo) return null;
            let quality = 0.7;
            let compressed = await ImageManipulator.manipulateAsync(
                photo.uri,
                [{ resize: { width: 480 } }],
                { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
            );
            while (quality > 0.1) {
                const response = await fetch(compressed.uri);
                const blob = await response.blob();
                if (blob.size < MAX_SELFIE_SIZE_KB * 1024) break;
                quality -= 0.1;
                compressed = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [{ resize: { width: 400 } }],
                    { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
                );
            }
            return compressed.uri;
        } catch (e) {
            return null;
        }
    };

    const uploadSelfie = async (uri: string, userId: string, type: 'in' | 'out'): Promise<string | null> => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileName = `${userId}/${formatDateKey(new Date())}_clock_${type}_${Date.now()}.jpg`;
            const { error } = await supabase.storage.from('selfies').upload(fileName, blob, { contentType: 'image/jpeg' });
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('selfies').getPublicUrl(fileName);
            return urlData.publicUrl;
        } catch (e) {
            return null;
        }
    };

    const handleClock = async () => {
        if (!canPerformAction || !location) return;
        setLoading(true);

        const online = await offlineQueue.checkOnline();
        const now = new Date().toISOString();
        const today = formatDateKey(new Date());
        const coords = { lat: location.coords.latitude, lon: location.coords.longitude };
        const workplace = nearestWorkplace?.workplace.name || 'Unknown';

        try {
            // Get user from LOCAL session (not network call)
            // getUser() makes a network request, getSession() uses cached session
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) throw new Error('User not authenticated');

            // Capture selfie (works offline)
            const selfieUri = await captureSelfie();
            let selfieUrl: string | null = null;

            // Only upload selfie if online
            if (selfieUri && online) {
                selfieUrl = await uploadSelfie(selfieUri, user.id, hasActiveAttendance ? 'out' : 'in');
            }

            if (hasActiveAttendance && activeAttendance) {
                // CLOCK OUT

                // Callback to log abnormal attendance cases to Supabase
                const logAbnormalToSupabase = async (logData: AttendanceLogData) => {
                    try {
                        console.warn('[ClockScreen] Abnormal case detected:', logData.log_type);
                        if (online) {
                            await supabase.from('attendance_logs').insert({
                                attendance_id: activeAttendance.id,
                                profile_id: user.id,
                                log_type: logData.log_type,
                                log_data: logData.log_data,
                            });
                        }
                    } catch (err) {
                        console.error('[ClockScreen] Failed to log abnormal case:', err);
                    }
                };

                const outcome = schedule ? computeAttendanceOutcome({
                    clockInISO: activeAttendance.clock_in,
                    clockOutISO: now,
                    schedule,
                    onAbnormalLog: logAbnormalToSupabase,
                }) : { status: 'hadir', workedMinutes: 0, lateMinutes: 0, earlyLeaveMinutes: 0 };

                if (online) {
                    // Online - send directly to Supabase
                    const { error } = await supabase
                        .from('attendance')
                        .update({
                            clock_out: now,
                            clock_out_coords: coords,
                            clock_out_address: address,
                            clock_out_selfie_url: selfieUrl,
                            status: outcome.status,
                            worked_minutes: outcome.workedMinutes,
                            late_minutes: outcome.lateMinutes,
                            early_leave_minutes: outcome.earlyLeaveMinutes,
                        })
                        .eq('id', activeAttendance.id);

                    if (error) throw error;
                    Alert.alert('✅ Clock Out Berhasil', 'Hati-hati di jalan!');
                } else {
                    // Offline - queue for later sync
                    await offlineQueue.enqueue({
                        type: 'clock_out',
                        timestamp: now,
                        payload: {
                            profile_id: user.id,
                            attendance_id: activeAttendance.id,
                            clock_out: now,
                            clock_out_coords: coords,
                            clock_out_address: address,
                            work_date: activeAttendance.work_date || today,
                            status: outcome.status,
                        },
                    });
                    Alert.alert('✅ Clock Out Disimpan', 'Data akan disinkronkan saat online');
                }

                setHasActiveAttendance(false);
                setActiveAttendance(null);
                await localCache.cacheActiveAttendance(null);

            } else {
                // CLOCK IN
                const insertData: any = {
                    profile_id: user.id,
                    clock_in: now,
                    clock_in_coords: coords,
                    clock_in_address: address,
                    status: 'in_progress',
                    work_date: today,
                    lokasi_kerja: workLocationType === 'pabrik' ? 'Bekerja di Pabrik' : 'Lainnya',
                    tempat_kerja: workLocationType === 'pabrik' ? workplace : null,
                    clock_in_selfie_url: selfieUrl,
                    source: online ? 'mobile_app' : 'mobile_app_offline',
                };
                if (notesRequired && notes.trim()) insertData.catatan = notes.trim();

                if (online) {
                    // Online - send directly to Supabase
                    const { data, error } = await supabase.from('attendance').insert(insertData).select().single();
                    if (error) throw error;
                    Alert.alert('✅ Clock In Berhasil', 'Selamat bekerja!');
                    setHasActiveAttendance(true);
                    setActiveAttendance(data);
                    await localCache.cacheActiveAttendance(data);
                } else {
                    // Offline - queue for later sync
                    await offlineQueue.enqueue({
                        type: 'clock_in',
                        timestamp: now,
                        payload: insertData,
                    });

                    // Create a local attendance record for UI
                    const localAttendance = {
                        id: `local_${Date.now()}`,
                        ...insertData,
                        created_at: now,
                    };
                    Alert.alert('✅ Clock In Disimpan', 'Data akan disinkronkan saat online');
                    setHasActiveAttendance(true);
                    setActiveAttendance(localAttendance);
                    await localCache.cacheActiveAttendance(localAttendance);
                }
                setNotes('');
            }
            await fetchSchedule();
        } catch (e: any) {
            console.error('[ClockScreen] handleClock error:', e);

            // If error is network-related, try to queue offline
            if (!online || e.message?.includes('network') || e.message?.includes('fetch')) {
                Alert.alert('⚠️ Mode Offline', 'Data akan disinkronkan saat koneksi tersedia');
            } else {
                Alert.alert('Error', e.message || 'Gagal memproses absensi');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!permission) return <View style={styles.container}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <MaterialIcons name="camera-alt" size={48} color={COLORS.textMuted} />
                <Text style={styles.permissionText}>Akses kamera diperlukan untuk presensi</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Izinkan Kamera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{getTimeGreeting()},</Text>
                    <Text style={styles.dateText}>
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                </View>
                <View style={styles.shiftBadge}>
                    <MaterialIcons name="schedule" size={14} color="#181811" />
                    <Text style={styles.shiftText}>{schedule?.shift || 'OFF'}</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Offline Status Banner */}
                {!isOnline && (
                    <View style={styles.offlineBanner}>
                        <MaterialIcons name="cloud-off" size={18} color="#fff" />
                        <Text style={styles.offlineBannerText}>Mode Offline - Data akan disinkronkan saat koneksi tersedia</Text>
                    </View>
                )}

                {/* Sync Status */}
                {syncStatus && syncStatus.pendingCount > 0 && (
                    <View style={styles.syncBanner}>
                        <MaterialIcons name="sync" size={18} color="#f59e0b" />
                        <Text style={styles.syncBannerText}>{syncStatus.pendingCount} item menunggu sinkronisasi</Text>
                    </View>
                )}

                {/* Camera/Map Container */}
                <View style={styles.cameraContainer}>
                    <View style={styles.cameraWrapper}>
                        {!showMap ? (
                            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
                        ) : (
                            <WebView
                                style={styles.camera}
                                originWhitelist={['*']}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                source={{
                                    html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                        html, body, #map { width: 100%; height: 100vh; }
                                    </style>
                                </head>
                                <body>
                                    <div id="map"></div>
                                    <script>
                                        try {
                                            var map = L.map('map').setView([${location ? location.coords.latitude : -4.788}, ${location ? location.coords.longitude : 119.615}], 16);
                                            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                                maxZoom: 19,
                                                attribution: '© OpenStreetMap'
                                            }).addTo(map);

                                            // User Location
                                            ${location ? `
                                                L.circleMarker([${location.coords.latitude}, ${location.coords.longitude}], {
                                                    radius: 8,
                                                    fillColor: '#3b82f6',
                                                    color: '#fff',
                                                    weight: 2,
                                                    opacity: 1,
                                                    fillOpacity: 1
                                                }).addTo(map).bindPopup('Posisi Anda').openPopup();
                                                
                                                L.circle([${location.coords.latitude}, ${location.coords.longitude}], {
                                                    color: '#3b82f6',
                                                    fillColor: '#3b82f6',
                                                    fillOpacity: 0.1,
                                                    radius: ${location.coords.accuracy || 50},
                                                    weight: 1
                                                }).addTo(map);
                                            ` : ''}

                                            // Workplaces
                                            var workplaces = ${JSON.stringify(WORKPLACES)};
                                            var maxDist = ${MAX_DISTANCE_METERS};
                                            var userLat = ${location ? location.coords.latitude : 0};
                                            var userLon = ${location ? location.coords.longitude : 0};

                                            function getDistance(lat1, lon1, lat2, lon2) {
                                                var R = 6371e3;
                                                var phi1 = lat1 * Math.PI/180;
                                                var phi2 = lat2 * Math.PI/180;
                                                var deltaPhi = (lat2-lat1) * Math.PI/180;
                                                var deltaLambda = (lon2-lon1) * Math.PI/180;
                                                var a = Math.sin(deltaPhi/2)*Math.sin(deltaPhi/2) + Math.cos(phi1)*Math.cos(phi2)*Math.sin(deltaLambda/2)*Math.sin(deltaLambda/2);
                                                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                                                return R * c;
                                            }

                                            workplaces.forEach(function(wp) {
                                                var dist = userLat ? getDistance(userLat, userLon, wp.lat, wp.lon) : Infinity;
                                                var isWithin = dist <= maxDist;
                                                
                                                L.circle([wp.lat, wp.lon], {
                                                    color: isWithin ? '#10b981' : '#94a3b8',
                                                    fillColor: isWithin ? '#10b981' : '#94a3b8',
                                                    fillOpacity: 0.15,
                                                    radius: maxDist,
                                                    weight: 1
                                                }).addTo(map);

                                                L.circleMarker([wp.lat, wp.lon], {
                                                    radius: 5,
                                                    fillColor: isWithin ? '#10b981' : '#64748b',
                                                    color: '#fff',
                                                    weight: 1,
                                                    opacity: 1,
                                                    fillOpacity: 1
                                                }).addTo(map).bindPopup('<b>' + wp.name + '</b><br>Jarak: ' + (dist < 1000 ? dist.toFixed(0) + 'm' : (dist/1000).toFixed(1) + 'km'));
                                            });
                                        } catch(e) {
                                            document.body.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Gagal memuat peta</div>';
                                        }
                                    </script>
                                </body>
                                </html>
                            `
                                }}
                            />
                        )}
                        <View style={styles.cameraOverlay}>
                            {!showMap && <View style={styles.cameraFrame} />}
                            <TouchableOpacity
                                style={styles.toggleMapBtn}
                                onPress={() => setShowMap(!showMap)}
                            >
                                <MaterialIcons name={showMap ? "camera-alt" : "map"} size={20} color="#fff" />
                                <Text style={styles.toggleMapText}>{showMap ? "Kamera" : "Peta"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Map Legend (only on map view) */}
                    {showMap && (
                        <View style={styles.mapLegend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                                <Text style={styles.legendText}>Lokasi Anda</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                                <Text style={styles.legendText}>Area Absensi ({MAX_DISTANCE_METERS}m)</Text>
                            </View>
                        </View>
                    )}

                    {/* Location Status */}
                    <View style={styles.locationStatus}>
                        <View style={styles.locationRow}>
                            <MaterialIcons
                                name={isFetchingLocation ? 'gps-fixed' : (locationError || isMockDetected ? 'location-off' : 'location-on')}
                                size={20}
                                color={isFetchingLocation ? COLORS.info : (locationError || isMockDetected ? COLORS.danger : COLORS.success)}
                            />
                            <Text style={styles.locationText} numberOfLines={1}>
                                {isFetchingLocation ? 'Mencari lokasi...' : address}
                            </Text>
                            {/* Refresh Location Button */}
                            <TouchableOpacity onPress={fetchLocation} style={styles.refreshBtn}>
                                <MaterialIcons name="refresh" size={20} color={COLORS.info} />
                            </TouchableOpacity>
                        </View>

                        {nearestWorkplace && (
                            <View style={styles.distanceRow}>
                                <View style={styles.distanceBadge}>
                                    <Text style={[styles.distanceText, { color: isWithinRadius ? COLORS.success : COLORS.danger }]}>
                                        {nearestWorkplace.distance.toFixed(0)}m dari {nearestWorkplace.workplace.name}
                                    </Text>
                                </View>
                                {/* Open in Maps Link */}
                                {location && (
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(`https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}`)}
                                        style={styles.openMapsBtn}
                                    >
                                        <MaterialIcons name="open-in-new" size={14} color={COLORS.info} />
                                        <Text style={styles.openMapsText}>Buka Maps</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* Work Location Type Toggle */}
                <View style={styles.toggleSection}>
                    <Text style={styles.toggleLabel}>Lokasi Kerja:</Text>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleOption, workLocationType === 'pabrik' && styles.toggleOptionActive]}
                            onPress={() => setWorkLocationType('pabrik')}
                        >
                            <MaterialIcons name="business" size={18} color={workLocationType === 'pabrik' ? '#181811' : COLORS.textMuted} />
                            <Text style={[styles.toggleOptionText, workLocationType === 'pabrik' && styles.toggleOptionTextActive]}>Pabrik</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleOption, workLocationType === 'lainnya' && styles.toggleOptionActive]}
                            onPress={() => setWorkLocationType('lainnya')}
                        >
                            <MaterialIcons name="place" size={18} color={workLocationType === 'lainnya' ? '#181811' : COLORS.textMuted} />
                            <Text style={[styles.toggleOptionText, workLocationType === 'lainnya' && styles.toggleOptionTextActive]}>Lainnya</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Status Cards Grid */}
                <View style={styles.statusGrid}>
                    <View style={styles.statusCard}>
                        <Text style={styles.statusLabel}>Jadwal Masuk</Text>
                        <Text style={styles.statusValue}>{schedule?.start_time?.slice(0, 5) || '--:--'}</Text>
                    </View>
                    <View style={styles.statusCard}>
                        <Text style={styles.statusLabel}>Jadwal Pulang</Text>
                        <Text style={styles.statusValue}>{schedule?.end_time?.slice(0, 5) || '--:--'}</Text>
                    </View>
                </View>

                {/* Window Message */}
                {windowMessage && (
                    <View style={styles.windowMessageContainer}>
                        <MaterialIcons name="info-outline" size={16} color={COLORS.warning} />
                        <Text style={styles.windowMessageText}>{windowMessage}</Text>
                    </View>
                )}

                {/* Notes Input if Required */}
                {notesRequired && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Catatan Absensi (Wajib)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Alasan keterlambatan atau absen diluar jadwal..."
                            placeholderTextColor="#999"
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                        />
                    </View>
                )}

                {/* Clock Action Button */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[
                            styles.clockButton,
                            (!canPerformAction && !hasActiveAttendance) && styles.clockButtonDisabled,
                            hasActiveAttendance && styles.clockButtonOut
                        ]}
                        onPress={handleClock}
                        disabled={loading || (!canPerformAction && !hasActiveAttendance)}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color={hasActiveAttendance ? "#fff" : "#181811"} />
                        ) : (
                            <>
                                <MaterialIcons
                                    name={hasActiveAttendance ? "logout" : "login"}
                                    size={32}
                                    color={hasActiveAttendance ? "#fff" : "#181811"}
                                />
                                <View>
                                    <Text style={[
                                        styles.clockButtonTitle,
                                        hasActiveAttendance && { color: '#fff' }
                                    ]}>
                                        {hasActiveAttendance ? 'CLOCK OUT' : 'CLOCK IN'}
                                    </Text>
                                    <Text style={[
                                        styles.clockButtonSubtitle,
                                        hasActiveAttendance && { color: 'rgba(255,255,255,0.7)' }
                                    ]}>
                                        {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </Text>
                                </View>
                            </>
                        )}
                    </TouchableOpacity>

                    {!canPerformAction && !hasActiveAttendance && (
                        <Text style={styles.errorText}>
                            {locationError || (isMockDetected ? 'Lokasi palsu terdeteksi' : !isWithinRadius && workLocationType === 'pabrik' ? 'Di luar radius kantor' : isAccuracyLow ? 'GPS tidak akurat' : notesRequired && notes.trim().length < 5 ? 'Catatan minimal 5 karakter' : '')}
                        </Text>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    shiftBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    shiftText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#181811',
    },
    content: {
        flex: 1,
    },
    cameraContainer: {
        margin: 24,
        marginTop: 8,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    cameraWrapper: {
        height: 300,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 16,
    },
    cameraFrame: {
        margin: 40,
        flex: 1,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        borderRadius: 20,
        borderStyle: 'dashed',
    },
    toggleMapBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        marginTop: 'auto',
    },
    toggleMapText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    locationStatus: {
        padding: 12,
        paddingTop: 16,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    locationText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '500',
    },
    distanceBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 28,
    },
    distanceText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusGrid: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 24,
    },
    statusCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statusLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    inputContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 12,
        height: 80,
        textAlignVertical: 'top',
    },
    actionContainer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    clockButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    clockButtonOut: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
    },
    clockButtonDisabled: {
        backgroundColor: '#e5e5e5',
        shadowOpacity: 0,
    },
    clockButtonTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#181811',
        letterSpacing: 1,
    },
    clockButtonSubtitle: {
        fontSize: 14,
        color: 'rgba(24, 24, 17, 0.6)',
        fontWeight: '500',
    },
    errorText: {
        textAlign: 'center',
        marginTop: 12,
        color: COLORS.danger,
        fontSize: 14,
        fontWeight: '500',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 16,
    },
    permissionText: {
        fontSize: 16,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    permissionButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permissionButtonText: {
        fontWeight: 'bold',
        color: '#181811',
    },
    // Offline Banner
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#475569',
        marginHorizontal: 24,
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
    },
    offlineBannerText: {
        flex: 1,
        color: '#fff',
        fontSize: 12,
    },
    // Sync Banner
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.warningBg,
        marginHorizontal: 24,
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
    },
    syncBannerText: {
        flex: 1,
        color: '#92400e',
        fontSize: 12,
    },
    // Map Legend
    mapLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    // Refresh Button
    refreshBtn: {
        padding: 4,
    },
    // Distance Row
    distanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginLeft: 28,
    },
    // Open Maps Button
    openMapsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    openMapsText: {
        fontSize: 12,
        color: COLORS.info,
    },
    // Work Location Toggle
    toggleSection: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 8,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    toggleOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
    },
    toggleOptionActive: {
        backgroundColor: COLORS.primary,
    },
    toggleOptionText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    toggleOptionTextActive: {
        color: '#181811',
        fontWeight: '600',
    },
    // Window Message
    windowMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 24,
        marginBottom: 16,
        padding: 12,
        backgroundColor: COLORS.warningBg,
        borderRadius: 12,
    },
    windowMessageText: {
        flex: 1,
        fontSize: 13,
        color: '#92400e',
    },
});
