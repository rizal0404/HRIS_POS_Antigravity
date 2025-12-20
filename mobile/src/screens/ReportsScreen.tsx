import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Attendance, Request, RequestStatus } from '../types';
import { formatDateKey, APP_TIME_OFFSET } from '../lib/attendanceRules';

interface MonthlyStats {
    totalPresent: number;
    totalLate: number;
    totalEarlyLeave: number;
    totalWorkedMinutes: number;
    totalOvertimeRequests: number;
    totalOvertimeHours: number;
}

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function ReportsScreen() {
    const navigation = useNavigation();
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [overtimeData, setOvertimeData] = useState<Request[]>([]);
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    const fetchReportData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Calculate date range for selected month
            const startDate = new Date(selectedYear, selectedMonth, 1);
            const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

            const startDateStr = startDate.toISOString();
            const endDateStr = endDate.toISOString();
            const startDateLocal = formatDateKey(startDate);
            const endDateLocal = formatDateKey(endDate);

            // Fetch attendance data
            const { data: attendance, error: attError } = await supabase
                .from('attendance')
                .select('*')
                .eq('profile_id', user.id)
                .gte('clock_in', startDateStr)
                .lte('clock_in', endDateStr)
                .order('clock_in', { ascending: false });

            if (attError) throw attError;
            setAttendanceData(attendance || []);

            // Fetch approved overtime requests
            const { data: overtime, error: otError } = await supabase
                .from('requests')
                .select('*')
                .eq('profile_id', user.id)
                .eq('request_type', 'Lembur')
                .eq('status', RequestStatus.APPROVED)
                .gte('start_date', startDateLocal)
                .lte('start_date', endDateLocal)
                .order('start_date', { ascending: false });

            if (otError) throw otError;
            setOvertimeData(overtime || []);

        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        setLoading(true);
        fetchReportData();
    }, [fetchReportData]);

    useFocusEffect(
        useCallback(() => {
            fetchReportData();
        }, [fetchReportData])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchReportData();
        setRefreshing(false);
    };

    const stats: MonthlyStats = useMemo(() => {
        let totalPresent = 0;
        let totalLate = 0;
        let totalEarlyLeave = 0;
        let totalWorkedMinutes = 0;

        attendanceData.forEach(att => {
            const status = att.status?.toLowerCase();
            if (status === 'hadir' || status === 'terlambat' || status === 'pulang_awal') {
                totalPresent++;
            }
            if (status === 'terlambat' || (att.late_minutes && att.late_minutes > 0)) {
                totalLate++;
            }
            if (status === 'pulang_awal' || (att.early_leave_minutes && att.early_leave_minutes > 0)) {
                totalEarlyLeave++;
            }
            if (att.worked_minutes) {
                totalWorkedMinutes += att.worked_minutes;
            }
        });

        // Calculate overtime hours
        let totalOvertimeHours = 0;
        overtimeData.forEach(ot => {
            if (ot.start_time) {
                // Try to parse overtime hours from reason or calculate from time
                try {
                    const reasonData = JSON.parse(ot.reason);
                    if (reasonData.hours) {
                        totalOvertimeHours += parseFloat(reasonData.hours);
                    }
                } catch {
                    // If reason is not JSON, try to calculate from start_time field
                    // Assuming format like "2" or "2.5" hours stored somewhere
                }
            }
        });

        return {
            totalPresent,
            totalLate,
            totalEarlyLeave,
            totalWorkedMinutes,
            totalOvertimeRequests: overtimeData.length,
            totalOvertimeHours,
        };
    }, [attendanceData, overtimeData]);

    const formatWorkedTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} jam ${mins} menit`;
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
                return { bg: '#dcfce7', text: '#166534', label: 'Hadir' };
            case 'terlambat':
                return { bg: '#fef3c7', text: '#92400e', label: 'Terlambat' };
            case 'pulang_awal':
                return { bg: '#ffedd5', text: '#9a3412', label: 'Pulang Awal' };
            case 'in_progress':
                return { bg: '#dbeafe', text: '#1e40af', label: 'Bekerja' };
            default:
                return { bg: '#f1f5f9', text: '#475569', label: status || 'N/A' };
        }
    };

    const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);

    if (loading && attendanceData.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0f172a" />
                <Text style={styles.loadingText}>Memuat laporan...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Month/Year Picker */}
            <View style={styles.filterCard}>
                <Text style={styles.filterLabel}>Periode Laporan</Text>
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setShowMonthPicker(!showMonthPicker)}
                    >
                        <Text style={styles.filterButtonText}>
                            {MONTHS[selectedMonth]} {selectedYear}
                        </Text>
                        <Text style={styles.filterIcon}>📅</Text>
                    </TouchableOpacity>
                </View>

                {showMonthPicker && (
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerSection}>
                            <Text style={styles.pickerLabel}>Bulan</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.pickerOptions}>
                                    {MONTHS.map((month, index) => (
                                        <TouchableOpacity
                                            key={month}
                                            style={[
                                                styles.pickerOption,
                                                selectedMonth === index && styles.pickerOptionActive
                                            ]}
                                            onPress={() => setSelectedMonth(index)}
                                        >
                                            <Text style={[
                                                styles.pickerOptionText,
                                                selectedMonth === index && styles.pickerOptionTextActive
                                            ]}>
                                                {month.substring(0, 3)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                        <View style={styles.pickerSection}>
                            <Text style={styles.pickerLabel}>Tahun</Text>
                            <View style={styles.pickerOptions}>
                                {years.map((year) => (
                                    <TouchableOpacity
                                        key={year}
                                        style={[
                                            styles.pickerOption,
                                            selectedYear === year && styles.pickerOptionActive
                                        ]}
                                        onPress={() => setSelectedYear(year)}
                                    >
                                        <Text style={[
                                            styles.pickerOptionText,
                                            selectedYear === year && styles.pickerOptionTextActive
                                        ]}>
                                            {year}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.pickerDone}
                            onPress={() => setShowMonthPicker(false)}
                        >
                            <Text style={styles.pickerDoneText}>Selesai</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Attendance Summary Card */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryIcon}>📊</Text>
                    <Text style={styles.summaryTitle}>Ringkasan Kehadiran</Text>
                </View>
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                        <View style={[styles.summaryDot, { backgroundColor: '#22c55e' }]} />
                        <Text style={styles.summaryLabel}>Hadir</Text>
                        <Text style={styles.summaryValue}>{stats.totalPresent} hari</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <View style={[styles.summaryDot, { backgroundColor: '#f59e0b' }]} />
                        <Text style={styles.summaryLabel}>Terlambat</Text>
                        <Text style={styles.summaryValue}>{stats.totalLate} hari</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <View style={[styles.summaryDot, { backgroundColor: '#ef4444' }]} />
                        <Text style={styles.summaryLabel}>Pulang Awal</Text>
                        <Text style={styles.summaryValue}>{stats.totalEarlyLeave} hari</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <View style={[styles.summaryDot, { backgroundColor: '#3b82f6' }]} />
                        <Text style={styles.summaryLabel}>Total Kerja</Text>
                        <Text style={styles.summaryValue}>{formatWorkedTime(stats.totalWorkedMinutes)}</Text>
                    </View>
                </View>
            </View>

            {/* Overtime Summary Card */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryIcon}>⏰</Text>
                    <Text style={styles.summaryTitle}>Ringkasan Lembur</Text>
                </View>
                <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                        <View style={[styles.summaryDot, { backgroundColor: '#8b5cf6' }]} />
                        <Text style={styles.summaryLabel}>Permintaan</Text>
                        <Text style={styles.summaryValue}>{stats.totalOvertimeRequests} kali</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <View style={[styles.summaryDot, { backgroundColor: '#06b6d4' }]} />
                        <Text style={styles.summaryLabel}>Total Jam</Text>
                        <Text style={styles.summaryValue}>{stats.totalOvertimeHours.toFixed(1)} jam</Text>
                    </View>
                </View>
            </View>

            {/* Daily Details */}
            <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>📋 Detail Harian</Text>
                {attendanceData.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>Tidak ada data kehadiran untuk periode ini</Text>
                    </View>
                ) : (
                    attendanceData.map((item) => {
                        const statusStyle = getStatusStyle(item.status);
                        return (
                            <View key={item.id} style={styles.detailCard}>
                                <View style={styles.detailHeader}>
                                    <Text style={styles.detailDate}>{formatDate(item.clock_in)}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                                            {statusStyle.label}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.detailBody}>
                                    <View style={styles.timeBlock}>
                                        <Text style={styles.timeLabel}>Masuk</Text>
                                        <Text style={styles.timeValue}>{formatTime(item.clock_in)}</Text>
                                    </View>
                                    <Text style={styles.timeArrow}>→</Text>
                                    <View style={styles.timeBlock}>
                                        <Text style={styles.timeLabel}>Pulang</Text>
                                        <Text style={styles.timeValue}>
                                            {item.clock_out ? formatTime(item.clock_out) : '—'}
                                        </Text>
                                    </View>
                                    {item.worked_minutes !== undefined && item.worked_minutes > 0 && (
                                        <View style={styles.durationBlock}>
                                            <Text style={styles.durationText}>
                                                ⏱️ {Math.floor(item.worked_minutes / 60)}j {item.worked_minutes % 60}m
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
    },
    filterCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 8,
    },
    filterButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    filterIcon: {
        fontSize: 18,
    },
    pickerContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    pickerSection: {
        marginBottom: 12,
    },
    pickerLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 8,
    },
    pickerOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pickerOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    pickerOptionActive: {
        backgroundColor: '#0f172a',
    },
    pickerOptionText: {
        fontSize: 14,
        color: '#64748b',
    },
    pickerOptionTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    pickerDone: {
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#0f172a',
        borderRadius: 8,
        marginTop: 8,
    },
    pickerDoneText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        paddingVertical: 8,
    },
    summaryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    summaryLabel: {
        fontSize: 13,
        color: '#64748b',
        flex: 1,
    },
    summaryValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
    },
    detailsSection: {
        marginTop: 8,
    },
    detailsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    emptyText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    detailCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailDate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    detailBody: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeBlock: {
        flex: 1,
    },
    timeLabel: {
        fontSize: 11,
        color: '#94a3b8',
        marginBottom: 2,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    timeArrow: {
        fontSize: 16,
        color: '#94a3b8',
        paddingHorizontal: 10,
    },
    durationBlock: {
        marginLeft: 'auto',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    durationText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
});
