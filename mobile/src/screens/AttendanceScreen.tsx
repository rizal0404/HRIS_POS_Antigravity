import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Attendance } from '../types';
import { formatDateKey, CORRECTION_MAX_DAYS, APP_TIME_OFFSET } from '../lib/attendanceRules';
import CorrectionModal from '../components/CorrectionModal';

const { width } = Dimensions.get('window');

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

export default function AttendanceScreen() {
    const navigation = useNavigation<any>();
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);

    const fetchAttendance = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('profile_id', user.id)
                .gte('clock_in', thirtyDaysAgo.toISOString())
                .order('clock_in', { ascending: false });

            if (error) throw error;
            setAttendance(data || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    useFocusEffect(
        useCallback(() => {
            fetchAttendance();
        }, [fetchAttendance])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAttendance();
        setRefreshing(false);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'hadir':
                return { bg: COLORS.successBg, text: '#166534', label: 'Hadir', icon: 'check-circle' };
            case 'terlambat':
                return { bg: COLORS.warningBg, text: '#92400e', label: 'Terlambat', icon: 'access-time' };
            case 'pulang_awal':
                return { bg: '#ffedd5', text: '#9a3412', label: 'Pulang Awal', icon: 'directions-run' };
            case 'in_progress':
                return { bg: COLORS.infoBg, text: '#1e40af', label: 'Bekerja', icon: 'work' };
            default:
                return { bg: '#f3f3f1', text: '#475569', label: 'Tidak Lengkap', icon: 'help-outline' };
        }
    };

    const canRequestCorrection = (item: Attendance): boolean => {
        const attendanceDate = item.work_date || formatDateKey(new Date(item.clock_in));
        const today = new Date();
        const todayStart = new Date(formatDateKey(today) + `T00:00:00${APP_TIME_OFFSET}`);
        const targetDate = new Date(`${attendanceDate}T00:00:00${APP_TIME_OFFSET}`);
        const dayDiff = Math.floor((todayStart.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
        return dayDiff <= CORRECTION_MAX_DAYS;
    };

    const handleCorrectionPress = (item: Attendance) => {
        setSelectedAttendance(item);
        setCorrectionModalVisible(true);
    };

    const handleCorrectionSuccess = () => {
        fetchAttendance();
    };

    const renderReportsHeader = () => {
        return (
            <View style={styles.headerSection}>
                <Text style={styles.headerSubtitle}>Riwayat 30 hari terakhir</Text>
                <Text style={styles.headerTitle}>Absensi Saya</Text>

                {/* Reports Card */}
                <TouchableOpacity
                    style={styles.reportsCard}
                    onPress={() => navigation.navigate('Reports')}
                    activeOpacity={0.8}
                >
                    <View style={styles.reportsCardLeft}>
                        <View style={styles.reportsIconCircle}>
                            <MaterialIcons name="insert-chart" size={24} color={COLORS.textDark} />
                        </View>
                        <View>
                            <Text style={styles.reportsTitle}>Lihat Laporan Saya</Text>
                            <Text style={styles.reportsSubtitle}>Ringkasan kehadiran & lembur bulanan</Text>
                        </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    };

    const renderItem = ({ item }: { item: Attendance }) => {
        const statusStyle = getStatusStyle(item.status);
        const showCorrectionButton = canRequestCorrection(item);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.dateRow}>
                        <MaterialIcons name="event" size={18} color={COLORS.textMuted} />
                        <Text style={styles.cardDate}>{formatDate(item.clock_in)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <MaterialIcons name={statusStyle.icon as any} size={14} color={statusStyle.text} />
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {statusStyle.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.timeContainer}>
                        <Text style={styles.timeLabel}>Masuk</Text>
                        <Text style={styles.timeValue}>{formatTime(item.clock_in)}</Text>
                    </View>
                    <View style={styles.timeDivider}>
                        <MaterialIcons name="arrow-forward" size={20} color={COLORS.textMuted} />
                    </View>
                    <View style={styles.timeContainer}>
                        <Text style={styles.timeLabel}>Pulang</Text>
                        <Text style={styles.timeValue}>
                            {item.clock_out ? formatTime(item.clock_out) : '—'}
                        </Text>
                    </View>
                </View>

                {/* Work metrics */}
                {item.worked_minutes !== undefined && item.worked_minutes > 0 && (
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <MaterialIcons name="timer" size={14} color={COLORS.textMuted} />
                            <Text style={styles.metricText}>
                                {Math.floor(item.worked_minutes / 60)}j {item.worked_minutes % 60}m
                            </Text>
                        </View>
                        {item.late_minutes !== undefined && item.late_minutes > 0 && (
                            <View style={styles.metricItem}>
                                <MaterialIcons name="warning" size={14} color={COLORS.warning} />
                                <Text style={[styles.metricText, { color: COLORS.warning }]}>
                                    Telat {item.late_minutes}m
                                </Text>
                            </View>
                        )}
                        {item.early_leave_minutes !== undefined && item.early_leave_minutes > 0 && (
                            <View style={styles.metricItem}>
                                <MaterialIcons name="directions-run" size={14} color={COLORS.warning} />
                                <Text style={[styles.metricText, { color: COLORS.warning }]}>
                                    Pulang awal {item.early_leave_minutes}m
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {item.clock_in_address && (
                    <View style={styles.locationRow}>
                        <MaterialIcons name="place" size={14} color={COLORS.textMuted} />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {item.clock_in_address}
                        </Text>
                    </View>
                )}

                {/* Correction button */}
                {showCorrectionButton && (
                    <TouchableOpacity
                        style={styles.correctionButton}
                        onPress={() => handleCorrectionPress(item)}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="edit" size={16} color="#92400e" />
                        <Text style={styles.correctionButtonText}>Ajukan Koreksi</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <FlatList
                data={attendance}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={renderReportsHeader}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="event-busy" size={48} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>Belum ada data absensi</Text>
                    </View>
                }
            />

            <CorrectionModal
                visible={correctionModalVisible}
                onClose={() => setCorrectionModalVisible(false)}
                attendance={selectedAttendance}
                onSuccess={handleCorrectionSuccess}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    listContent: {
        paddingBottom: 100,
    },

    // Header
    headerSection: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.textDark,
        marginBottom: 20,
    },

    // Reports Card
    reportsCard: {
        backgroundColor: COLORS.textDark,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    reportsCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    reportsIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 2,
    },
    reportsSubtitle: {
        fontSize: 12,
        color: '#a3a3a3',
    },

    // Attendance Card
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 24,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardDate: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeContainer: {
        flex: 1,
    },
    timeLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    timeValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    timeDivider: {
        paddingHorizontal: 12,
    },
    metricsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f3f1',
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metricText: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f3f1',
    },
    locationText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textMuted,
    },
    correctionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.warningBg,
        borderRadius: 12,
    },
    correctionButtonText: {
        color: '#92400e',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
});
