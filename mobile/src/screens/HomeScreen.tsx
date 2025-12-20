import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Image,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { localCache } from '../lib/localCache';
import { offlineQueue } from '../lib/offlineQueue';
import { UserProfile, Attendance, Request, RequestStatus, Shift } from '../types';
import { formatDateKey } from '../lib/attendanceRules';
import { MaterialIcons } from '@expo/vector-icons';

// Dimensions
const { width } = Dimensions.get('window');

// Theme Colors
const COLORS = {
    primary: '#f9f506', // Yellow
    backgroundLight: '#f8f8f5',
    backgroundDark: '#23220f',
    surfaceDark: '#363517',
    textDark: '#181811',
    textLight: '#ffffff',
    textGray: '#a1a1aa',
    success: '#10b981', // Green
    warning: '#f59e0b', // Orange/Yellow
    danger: '#ef4444',  // Red
    info: '#3b82f6',    // Blue
    border: '#e5e5e5',
};

interface MonthlyStats {
    hadir: number;
    telat: number;
    cuti: number;
    absen: number;
}

interface TodaySchedule {
    shift_code: string;
    shift?: Shift;
}

export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ hadir: 0, telat: 0, cuti: 0, absen: 0 });
    const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
    const [recentRequests, setRecentRequests] = useState<Request[]>([]);
    const [todaySchedule, setTodaySchedule] = useState<TodaySchedule | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isOnline, setIsOnline] = useState(true);

    const fetchDashboardData = async () => {
        // Check network status
        const online = await offlineQueue.checkOnline();
        setIsOnline(online);

        // If offline, try to load from cache first
        if (!online) {
            console.log('[HomeScreen] Offline mode - loading from cache');
            const cachedProfile = await localCache.getCachedUserProfile();
            const cachedSchedule = await localCache.getCachedTodaySchedule();
            const cachedStats = await localCache.getCachedMonthlyStats();
            const cachedAttendance = await localCache.getCachedActiveAttendance();

            if (cachedProfile) setUser(cachedProfile);
            if (cachedSchedule) setTodaySchedule(cachedSchedule);
            if (cachedStats) setMonthlyStats(cachedStats);
            if (cachedAttendance) setTodayAttendance(cachedAttendance);
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const authUser = session?.user;
            if (!authUser) return;

            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (profile) {
                setUser(profile);
                // Cache for offline
                await localCache.cacheUserProfile(profile);
            }

            const todayKey = formatDateKey(new Date());
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

            // 1. Fetch Today's Schedule
            const { data: scheduleData } = await supabase
                .from('work_schedules')
                .select('shift_code')
                .eq('profile_id', authUser.id)
                .eq('date', todayKey)
                .single();

            if (scheduleData?.shift_code) {
                const { data: shiftData } = await supabase
                    .from('shifts')
                    .select('*')
                    .eq('code', scheduleData.shift_code)
                    .single();

                const schedule = {
                    shift_code: scheduleData.shift_code,
                    shift: shiftData || undefined,
                };
                setTodaySchedule(schedule);
                // Cache for offline
                await localCache.cacheTodaySchedule(schedule);
            } else {
                setTodaySchedule(null);
            }

            // 2. Fetch Today's Attendance
            const todayDateStr = now.toISOString().split('T')[0];
            const { data: attendance } = await supabase
                .from('attendance')
                .select('*')
                .eq('profile_id', authUser.id)
                .gte('clock_in', `${todayDateStr}T00:00:00`)
                .order('clock_in', { ascending: false })
                .limit(1)
                .single();

            setTodayAttendance(attendance);
            // Cache for offline
            await localCache.cacheActiveAttendance(attendance);

            // 3. Fetch Monthly Stats
            const { data: monthlyAttendance } = await supabase
                .from('attendance')
                .select('status, late_minutes')
                .eq('profile_id', authUser.id)
                .gte('clock_in', firstDayOfMonth)
                .lt('clock_in', nextMonth);

            const presentCount = monthlyAttendance?.length || 0;
            const lateCount = monthlyAttendance?.filter(a => (a.late_minutes || 0) > 0).length || 0;

            const { data: monthlyCuti } = await supabase
                .from('requests')
                .select('id')
                .eq('profile_id', authUser.id)
                .eq('request_type', 'Cuti')
                .eq('status', 'APPROVED')
                .gte('start_date', firstDayOfMonth);

            const cutiCount = monthlyCuti?.length || 0;

            const stats = {
                hadir: presentCount,
                telat: lateCount,
                cuti: cutiCount,
                absen: 0,
            };
            setMonthlyStats(stats);
            // Cache for offline
            await localCache.cacheMonthlyStats(stats);

            // 4. Fetch Recent Requests
            const { data: requests } = await supabase
                .from('requests')
                .select('*')
                .eq('profile_id', authUser.id)
                .order('created_at', { ascending: false })
                .limit(3);

            setRecentRequests(requests || []);

            // Update last sync timestamp
            await localCache.updateLastSync();

        } catch (error) {
            console.error('Error fetching dashboard:', error);
            // On error, try to load from cache
            const cachedProfile = await localCache.getCachedUserProfile();
            const cachedSchedule = await localCache.getCachedTodaySchedule();
            const cachedStats = await localCache.getCachedMonthlyStats();

            if (cachedProfile) setUser(cachedProfile);
            if (cachedSchedule) setTodaySchedule(cachedSchedule);
            if (cachedStats) setMonthlyStats(cachedStats);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
            const timer = setInterval(() => setCurrentTime(new Date()), 1000);
            return () => clearInterval(timer);
        }, [])
    );

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Selamat Pagi';
        if (hour < 15) return 'Selamat Siang';
        if (hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    };

    const formatDateIndo = (date: Date) => {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="rgba(248, 248, 245, 0.9)" />
            <View style={styles.statusBarCover} />

            {/* Offline Banner */}
            {!isOnline && (
                <View style={styles.offlineBanner}>
                    <MaterialIcons name="cloud-off" size={16} color="#fff" />
                    <Text style={styles.offlineBannerText}>Mode Offline - Data dari cache</Text>
                </View>
            )}

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: user?.avatar_url || 'https://via.placeholder.com/100' }}
                                style={styles.avatar}
                            />
                            <View style={styles.activeIndicator} />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.greetingText}>{getGreeting()},</Text>
                            <Text style={styles.userNameText}>{user?.full_name?.split(' ')[0] || 'User'}!</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.notifButton}>
                        <MaterialIcons name="notifications-none" size={24} color={COLORS.textDark} />
                        <View style={styles.notifBadge} />
                    </TouchableOpacity>
                </View>

                {/* Shift Card */}
                <View style={styles.sectionContainer}>
                    <View style={styles.shiftCard}>
                        <View>
                            <Text style={styles.shiftCardLabel}>Shift Hari Ini</Text>
                            <View style={styles.shiftCardRow}>
                                <Text style={styles.shiftName}>{todaySchedule?.shift?.name || 'Regular'}</Text>
                                <Text style={styles.shiftType}>Regular</Text>
                            </View>
                            <View style={styles.shiftTimeRow}>
                                <MaterialIcons name="schedule" size={16} color="#8c8b5f" />
                                <Text style={styles.shiftTimeText}>
                                    {todaySchedule?.shift ? `${todaySchedule.shift.start_time} - ${todaySchedule.shift.end_time}` : 'Libur'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.sunIconContainer}>
                            <MaterialIcons name="wb-sunny" size={24} color="#8c8b5f" />
                        </View>
                    </View>
                </View>

                {/* Status/Clock Action Panel */}
                <View style={styles.sectionContainer}>
                    <View style={styles.clockPanel}>
                        {/* Decorative background elements */}
                        <View style={[styles.glow, styles.glowTop]} />
                        <View style={[styles.glow, styles.glowBottom]} />

                        <View style={styles.clockPanelContent}>
                            <View style={styles.clockStatusPill}>
                                <View style={[
                                    styles.clockStatusDot,
                                    { backgroundColor: todayAttendance?.clock_out ? COLORS.danger : (todayAttendance ? COLORS.success : COLORS.textGray) }
                                ]} />
                                <Text style={styles.clockStatusText}>
                                    {todayAttendance?.clock_out ? 'Clocked Out' : (todayAttendance ? 'Clocked In' : 'Not Clocked In')}
                                </Text>
                            </View>

                            <Text style={styles.bigClockTime}>
                                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Text style={styles.clockDate}>{formatDateIndo(currentTime)}</Text>

                            <TouchableOpacity
                                style={[styles.clockButton, { transform: [{ scale: 1 }] }]}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('Clock')}
                            >
                                <MaterialIcons name={todayAttendance && !todayAttendance.clock_out ? "logout" : "login"} size={22} color={COLORS.textDark} />
                                <Text style={styles.clockButtonText}>
                                    {todayAttendance && !todayAttendance.clock_out ? "Clock Out" : "Clock In"}
                                </Text>
                            </TouchableOpacity>

                            <Text style={styles.clockFooterText}>
                                {todayAttendance && !todayAttendance.clock_out
                                    ? "Jangan lupa clock out sebelum pulang!"
                                    : "Selamat bekerja, jangan lupa clock in!"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Monthly Summary Grid */}
                <View style={[styles.sectionContainer, { marginBottom: 24 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Ringkasan Bulan Ini</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
                            <Text style={styles.seeAllText}>Lihat Detail</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summaryGrid}>
                        {/* Hadir */}
                        <View style={styles.summaryCard}>
                            <View style={[styles.summaryIconContainer, { backgroundColor: '#f0fdf4' }]}>
                                <MaterialIcons name="check-circle" size={20} color={COLORS.success} />
                                <Text style={[styles.summaryStatusText, { color: COLORS.success }]}>Hadir</Text>
                            </View>
                            <Text style={styles.summaryValue}>{monthlyStats.hadir}</Text>
                            <Text style={styles.summaryLabel}>Hari Kerja</Text>
                        </View>

                        {/* Telat */}
                        <View style={styles.summaryCard}>
                            <View style={[styles.summaryIconContainer, { backgroundColor: '#fff7ed' }]}>
                                <MaterialIcons name="access-time" size={20} color={COLORS.warning} />
                                <Text style={[styles.summaryStatusText, { color: COLORS.warning }]}>Telat</Text>
                            </View>
                            <Text style={styles.summaryValue}>{monthlyStats.telat}</Text>
                            <Text style={styles.summaryLabel}>Kali</Text>
                        </View>

                        {/* Cuti */}
                        <View style={styles.summaryCard}>
                            <View style={[styles.summaryIconContainer, { backgroundColor: '#eff6ff' }]}>
                                <MaterialIcons name="beach-access" size={20} color={COLORS.info} />
                                <Text style={[styles.summaryStatusText, { color: COLORS.info }]}>Cuti</Text>
                            </View>
                            <Text style={styles.summaryValue}>{monthlyStats.cuti}</Text>
                            <Text style={styles.summaryLabel}>Hari Diambil</Text>
                        </View>

                        {/* Absen */}
                        <View style={styles.summaryCard}>
                            <View style={[styles.summaryIconContainer, { backgroundColor: '#fef2f2' }]}>
                                <MaterialIcons name="cancel" size={20} color={COLORS.danger} />
                                <Text style={[styles.summaryStatusText, { color: COLORS.danger }]}>Absen</Text>
                            </View>
                            <Text style={styles.summaryValue}>{monthlyStats.absen}</Text>
                            <Text style={styles.summaryLabel}>Tanpa Kabar</Text>
                        </View>
                    </View>
                </View>

                {/* Notifications Section */}
                <View style={[styles.sectionContainer, { marginBottom: 100 }]}>
                    <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Notifikasi Terbaru</Text>
                    <View style={styles.notificationList}>
                        {recentRequests.length === 0 ? (
                            <Text style={{ color: COLORS.textGray, textAlign: 'center', marginVertical: 20 }}>Tidak ada notifikasi baru</Text>
                        ) : (
                            recentRequests.map((req, index) => (
                                <View key={index} style={styles.notificationItem}>
                                    <View style={[
                                        styles.notifIcon,
                                        { backgroundColor: req.status === 'APPROVED' ? '#dcfce7' : '#dbeafe' }
                                    ]}>
                                        <MaterialIcons
                                            name={req.status === 'APPROVED' ? "assignment-turned-in" : "assignment"}
                                            size={20}
                                            color={req.status === 'APPROVED' ? "#16a34a" : "#2563eb"}
                                        />
                                    </View>
                                    <View style={styles.notifContent}>
                                        <View style={styles.notifHeader}>
                                            <Text style={styles.notifTitle}>
                                                {req.request_type} {req.status === 'APPROVED' ? 'Disetujui' : req.status}
                                            </Text>
                                            <Text style={styles.notifTime}>
                                                {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </Text>
                                        </View>
                                        <Text style={styles.notifDesc} numberOfLines={2}>
                                            Pengajuan {req.request_type} Anda untuk tanggal {new Date(req.start_date).toLocaleDateString()} telah {req.status === 'APPROVED' ? 'disetujui' : 'diperbarui'}.
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
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
    statusBarCover: {
        // height: Platform.OS === 'ios' ? 44 : 0, 
        backgroundColor: 'rgba(248, 248, 245, 0.9)',
    },
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#f59e0b',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    offlineBannerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 12 : 0,
        paddingBottom: 20,
        backgroundColor: 'rgba(248, 248, 245, 0.9)',
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#fff',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22c55e',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfo: {
        flexDirection: 'column',
    },
    greetingText: {
        fontSize: 14,
        color: '#737373',
        fontWeight: '500',
    },
    userNameText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    notifButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    notifBadge: {
        position: 'absolute',
        top: 10,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        borderWidth: 1,
        borderColor: '#fff',
    },

    // Section
    sectionContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#737373',
    },

    // Shift Card
    shiftCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    shiftCardLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: '#a3a3a3',
        marginBottom: 4,
    },
    shiftCardRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 4,
    },
    shiftName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    shiftType: {
        fontSize: 14,
        fontWeight: '500',
        color: '#737373',
    },
    shiftTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    shiftTimeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8c8b5f',
    },
    sunIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(249, 245, 6, 0.2)', // primary with opacity
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Clock Panel
    clockPanel: {
        backgroundColor: COLORS.backgroundDark,
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    glow: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        opacity: 0.2, // blur effect
    },
    glowTop: {
        top: -40,
        right: -40,
        backgroundColor: COLORS.primary,
        // React Native doesn't support 'blur' CSS, we'd need Image or BlurView. 
        // We'll trust opacity for now or skip.
    },
    glowBottom: {
        bottom: -40,
        left: -40,
        backgroundColor: COLORS.primary,
    },
    clockPanelContent: {
        alignItems: 'center',
        zIndex: 10,
    },
    clockStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 20,
    },
    clockStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    clockStatusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    bigClockTime: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#fff',
        includeFontPadding: false,
        lineHeight: 64,
        letterSpacing: -1,
    },
    clockDate: {
        fontSize: 14,
        color: '#a3a3a3',
        marginBottom: 24,
    },
    clockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        height: 56,
        backgroundColor: COLORS.primary,
        borderRadius: 28,
        marginBottom: 16,
    },
    clockButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    clockFooterText: {
        fontSize: 12,
        color: '#737373',
    },

    // Summary Grid
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    summaryCard: {
        width: (width - 48 - 12) / 2, // 2 columns with padding calc
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    summaryIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    summaryStatusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.textDark,
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#a3a3a3',
    },

    // Notifications
    notificationList: {
        gap: 12,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    notifIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifContent: {
        flex: 1,
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    notifTime: {
        fontSize: 10,
        fontWeight: '500',
        color: '#a3a3a3',
    },
    notifDesc: {
        fontSize: 12,
        color: '#737373',
        lineHeight: 18,
    },
});
