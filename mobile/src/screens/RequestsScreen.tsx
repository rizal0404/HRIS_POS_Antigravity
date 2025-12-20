import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
    Platform,
    ScrollView,
    ActivityIndicator,
    Image,
    Dimensions,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Request, RequestStatus, RequestType, Shift, UserProfile } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Theme Colors
const COLORS = {
    primary: '#f9f506',
    backgroundLight: '#f8f8f5',
    backgroundDark: '#23220f',
    surfaceDark: '#363517',
    textDark: '#181811',
    textLight: '#ffffff',
    textGray: '#a1a1aa',
    textMuted: '#737373',
    success: '#10b981',
    successBg: '#dcfce7',
    warning: '#f59e0b',
    warningBg: '#fef3c7',
    danger: '#ef4444',
    dangerBg: '#fee2e2',
    info: '#3b82f6',
    infoBg: '#dbeafe',
    cardBg: '#ffffff',
    border: '#e5e5e5',
};

// Request type card config
const REQUEST_CARDS = [
    { type: RequestType.CUTI, label: 'Cuti', subtitle: 'Ajukan cuti tahunan', icon: 'event-note', color: COLORS.primary },
    { type: RequestType.LEMBUR, label: 'Lembur', subtitle: 'Form lembur kerja', icon: 'schedule', color: COLORS.textDark },
    { type: RequestType.SAKIT, label: 'Sakit', subtitle: 'Upload surat dokter', icon: 'sick', color: COLORS.textMuted },
    { type: 'Koreksi', label: 'Koreksi', subtitle: 'Perbaikan absen', icon: 'edit-note', color: COLORS.textMuted },
    { type: RequestType.SUBSTITUSI, label: 'Tukar Shift', subtitle: 'Ganti jadwal dengan rekan', icon: 'swap-horiz', color: COLORS.textDark },
];

export default function RequestsScreen() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // Detail Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    // Confirmation Modal State
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    // Form State
    const [requestType, setRequestType] = useState<RequestType>(RequestType.CUTI);
    const [reason, setReason] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date().setHours(17, 0, 0, 0));
    const [endTime, setEndTime] = useState(new Date().setHours(21, 0, 0, 0));

    const [attachment, setAttachment] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dynamic Data State
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [currentShiftCode, setCurrentShiftCode] = useState<string>('');
    const [newShiftCode, setNewShiftCode] = useState<string>('');
    const [substituteId, setSubstituteId] = useState<string>('');
    const [isLoadingPrereqs, setIsLoadingPrereqs] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Pickers visibility
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [showSubstitutePicker, setShowSubstitutePicker] = useState(false);

    const fetchRequests = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('requests')
                .select('*')
                .eq('profile_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPrerequisites = async () => {
        setIsLoadingPrereqs(true);
        try {
            const [shiftsRes, usersRes] = await Promise.all([
                supabase.from('shifts').select('*'),
                supabase.from('profiles').select('*').order('full_name'),
            ]);

            if (shiftsRes.data) setShifts(shiftsRes.data);
            if (usersRes.data) {
                const { data: { user } } = await supabase.auth.getUser();
                setUsers(usersRes.data.filter(u => u.id !== user?.id));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingPrereqs(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        fetchPrerequisites();
    }, []);

    useEffect(() => {
        const fetchCurrentShift = async () => {
            if (requestType !== RequestType.SUBSTITUSI) return;

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const dateStr = startDate.toISOString().split('T')[0];
                const { data, error } = await supabase
                    .from('work_schedules')
                    .select('shift_code')
                    .eq('profile_id', user.id)
                    .eq('date', dateStr)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching schedule:', error);
                }

                if (data && data.shift_code) {
                    setCurrentShiftCode(data.shift_code);
                    setValidationError(null);
                } else {
                    setCurrentShiftCode('');
                    setValidationError('Tidak ada jadwal pada tanggal ini');
                }
            } catch (e) {
                console.error(e);
                setCurrentShiftCode('');
            }
        };

        if (modalVisible) {
            fetchCurrentShift();
        }
    }, [startDate, requestType, modalVisible]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRequests();
        setRefreshing(false);
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setAttachment(result.assets[0]);
            }
        } catch (err) {
            Alert.alert('Error', 'Gagal memilih file');
        }
    };

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permission to access camera is required!");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const originalAsset = result.assets[0];
                const manipResult = await ImageManipulator.manipulateAsync(
                    originalAsset.uri,
                    [{ resize: { width: 1024 } }],
                    { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
                );

                setAttachment({
                    uri: manipResult.uri,
                    name: `camera_${Date.now()}.jpg`,
                    mimeType: 'image/jpeg',
                    size: null
                });
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Gagal mengambil foto');
        }
    };

    const getStatusStyle = (status: RequestStatus) => {
        switch (status) {
            case RequestStatus.APPROVED: return { bg: COLORS.successBg, text: '#166534', label: 'APPROVED' };
            case RequestStatus.REJECTED: return { bg: COLORS.dangerBg, text: '#991b1b', label: 'REJECTED' };
            case RequestStatus.REVISED: return { bg: COLORS.warningBg, text: '#92400e', label: 'REVISED' };
            default: return { bg: COLORS.successBg, text: '#166534', label: 'PENDING' };
        }
    };

    const getTypeIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
        switch (type) {
            case RequestType.CUTI: return 'event-note';
            case RequestType.LEMBUR: return 'schedule';
            case RequestType.IZIN: return 'description';
            case RequestType.SAKIT: return 'sick';
            case RequestType.SUBSTITUSI: return 'swap-horiz';
            default: return 'description';
        }
    };

    const formatTime = (timestamp: number | Date) => {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatShortDate = (date: Date) => {
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const resetForm = () => {
        setRequestType(RequestType.CUTI);
        setStartDate(new Date());
        setEndDate(new Date());
        setReason('');
        setAttachment(null);
        setCurrentShiftCode('');
        setNewShiftCode('');
        setSubstituteId('');
        setValidationError(null);
    };

    const openNewRequestModal = (type: RequestType) => {
        setRequestType(type);
        setModalVisible(true);
    };

    const handlePreSubmit = () => {
        if (!reason && requestType !== RequestType.SUBSTITUSI) {
            Alert.alert('Error', 'Mohon isi alasan/keterangan');
            return;
        }
        if (requestType === RequestType.SAKIT && !attachment) {
            Alert.alert('Error', 'Mohon lampirkan bukti foto/dokumen');
            return;
        }
        setConfirmModalVisible(true);
    };

    const handleConfirmSubmit = async () => {
        setConfirmModalVisible(false);
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            let finalAttachmentUrl = undefined;
            if (attachment && requestType === RequestType.SAKIT) {
                const fileExt = attachment.name?.split('.').pop() || 'jpg';
                const filePath = `${user.id}/${Date.now()}_attachment.${fileExt}`;

                const formData = new FormData();
                formData.append('file', {
                    uri: attachment.uri,
                    name: attachment.name || 'upload.jpg',
                    type: attachment.mimeType || 'image/jpeg',
                } as any);

                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(filePath, formData);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath);
                finalAttachmentUrl = urlData.publicUrl;
            }

            const baseRequest = {
                profile_id: user.id,
                request_type: requestType,
                start_date: startDate.toISOString().split('T')[0],
                end_date: (requestType === RequestType.LEMBUR || requestType === RequestType.SUBSTITUSI)
                    ? startDate.toISOString().split('T')[0]
                    : endDate.toISOString().split('T')[0],
                status: RequestStatus.PENDING,
            };

            let finalData: any = { ...baseRequest };

            if (requestType === RequestType.LEMBUR) {
                finalData.start_time = formatTime(startTime);
                finalData.end_time = formatTime(endTime);
                finalData.reason = reason;
            } else if (requestType === RequestType.CUTI) {
                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                let substitutes = {};
                if (substituteId) {
                    const subUser = users.find(u => u.id === substituteId);
                    if (subUser) {
                        const tempSub: Record<string, { day: string }> = {};
                        let loopDate = new Date(startDate);
                        while (loopDate <= endDate) {
                            const dStr = loopDate.toISOString().split('T')[0];
                            tempSub[dStr] = { day: subUser.full_name };
                            loopDate.setDate(loopDate.getDate() + 1);
                        }
                        substitutes = tempSub;
                    }
                }

                finalData.reason = JSON.stringify({
                    reason,
                    leave_days: diffDays,
                    substitutes: substitutes
                });
            } else if (requestType === RequestType.SUBSTITUSI) {
                const shiftAwal = shifts.find(s => s.code === currentShiftCode);
                const shiftBaru = shifts.find(s => s.code === newShiftCode);

                finalData.reason = JSON.stringify({
                    shift_awal: { code: currentShiftCode, name: shiftAwal?.name || currentShiftCode },
                    shift_baru: { code: newShiftCode, name: shiftBaru?.name || newShiftCode },
                    keterangan: reason
                });
            } else if (requestType === RequestType.SAKIT) {
                finalData.reason = reason;
                finalData.attachment_url = finalAttachmentUrl;
            } else {
                finalData.reason = reason;
            }

            const { error } = await supabase.from('requests').insert(finalData);
            if (error) throw error;

            Alert.alert('Sukses', 'Pengajuan berhasil dikirim');
            setModalVisible(false);
            resetForm();
            fetchRequests();

        } catch (e: any) {
            Alert.alert('Error', e.message || 'Gagal mengirim pengajuan');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCardPress = (item: Request) => {
        setSelectedRequest(item);
        setDetailModalVisible(true);
    };

    // Render history item
    const renderHistoryItem = ({ item }: { item: Request }) => {
        const statusStyle = getStatusStyle(item.status as RequestStatus);
        const iconName = getTypeIcon(item.request_type);

        let displayDate = formatShortDate(new Date(item.start_date));
        if (item.start_date !== item.end_date) {
            displayDate = `${formatShortDate(new Date(item.start_date))} - ${formatShortDate(new Date(item.end_date))}`;
        }
        // For Lembur, show time range
        if (item.request_type === RequestType.LEMBUR && item.start_time && item.end_time) {
            displayDate = `${formatShortDate(new Date(item.start_date))}, ${item.start_time} - ${item.end_time}`;
        }

        return (
            <TouchableOpacity style={styles.historyCard} onPress={() => handleCardPress(item)} activeOpacity={0.7}>
                <View style={styles.historyIconContainer}>
                    <MaterialIcons name={iconName} size={20} color={COLORS.textDark} />
                </View>
                <View style={styles.historyContent}>
                    <Text style={styles.historyTitle}>{item.request_type === 'Cuti' ? 'Cuti Tahunan' : item.request_type === 'Sakit' ? 'Izin Sakit' : item.request_type}</Text>
                    <Text style={styles.historyDate}>{displayDate}</Text>
                </View>
                <View style={[styles.historyStatusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.historyStatusText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <Text style={styles.headerSubtitle}>Mau ajukan apa hari ini?</Text>
                    <Text style={styles.headerTitle}>Buat Pengajuan Baru</Text>
                </View>

                {/* Quick Action Cards - 2x2 Grid */}
                <View style={styles.cardsGrid}>
                    {/* Cuti */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => openNewRequestModal(RequestType.CUTI)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconCircle, { backgroundColor: COLORS.primary }]}>
                            <MaterialIcons name="event-note" size={24} color={COLORS.textDark} />
                        </View>
                        <Text style={styles.actionCardTitle}>Cuti</Text>
                        <Text style={styles.actionCardSubtitle}>Ajukan cuti tahunan</Text>
                    </TouchableOpacity>

                    {/* Lembur */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => openNewRequestModal(RequestType.LEMBUR)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconCircle, { backgroundColor: COLORS.primary }]}>
                            <MaterialIcons name="schedule" size={24} color={COLORS.textDark} />
                        </View>
                        <Text style={styles.actionCardTitle}>Lembur</Text>
                        <Text style={styles.actionCardSubtitle}>Form lembur kerja</Text>
                    </TouchableOpacity>

                    {/* Sakit */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => openNewRequestModal(RequestType.SAKIT)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconCircle, { backgroundColor: '#f3f3f1' }]}>
                            <MaterialIcons name="sick" size={24} color={COLORS.textMuted} />
                        </View>
                        <Text style={styles.actionCardTitle}>Sakit</Text>
                        <Text style={styles.actionCardSubtitle}>Upload surat dokter</Text>
                    </TouchableOpacity>

                    {/* Koreksi / Izin */}
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => openNewRequestModal(RequestType.IZIN)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconCircle, { backgroundColor: '#f3f3f1' }]}>
                            <MaterialIcons name="edit-note" size={24} color={COLORS.textMuted} />
                        </View>
                        <Text style={styles.actionCardTitle}>Koreksi</Text>
                        <Text style={styles.actionCardSubtitle}>Perbaikan absen</Text>
                    </TouchableOpacity>
                </View>

                {/* Tukar Shift - Full Width */}
                <View style={styles.sectionPadding}>
                    <TouchableOpacity
                        style={styles.fullWidthCard}
                        onPress={() => openNewRequestModal(RequestType.SUBSTITUSI)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.fullWidthCardLeft}>
                            <View style={[styles.actionIconCircle, { backgroundColor: '#f3f3f1' }]}>
                                <MaterialIcons name="swap-horiz" size={24} color={COLORS.textDark} />
                            </View>
                            <View style={styles.fullWidthCardText}>
                                <Text style={styles.actionCardTitle}>Tukar Shift</Text>
                                <Text style={styles.actionCardSubtitle}>Ganti jadwal dengan rekan</Text>
                            </View>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Riwayat Pengajuan Section */}
                <View style={styles.historySection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Riwayat Pengajuan</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllLink}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="small" color={COLORS.textDark} style={{ marginVertical: 20 }} />
                    ) : requests.length === 0 ? (
                        <Text style={styles.emptyText}>Belum ada riwayat pengajuan</Text>
                    ) : (
                        <View style={styles.historyList}>
                            {requests.slice(0, 5).map((item) => (
                                <View key={item.id}>
                                    {renderHistoryItem({ item })}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ========= MODALS ========= */}

            {/* Request Detail Modal */}
            <Modal
                visible={detailModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <SafeAreaView style={styles.detailModalContainer}>
                    <View style={styles.detailModalHeader}>
                        <Text style={styles.detailModalTitle}>
                            Detail Pengajuan {selectedRequest?.request_type}
                        </Text>
                        <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                            <MaterialIcons name="close" size={24} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.detailModalBody}>
                        {selectedRequest && (() => {
                            const req = selectedRequest;
                            const statusStyle = getStatusStyle(req.status as RequestStatus);
                            let parsedReason: any = null;
                            try {
                                if (req.reason?.startsWith('{')) {
                                    parsedReason = JSON.parse(req.reason);
                                }
                            } catch (e) { }

                            return (
                                <>
                                    <View style={styles.detailCard}>
                                        <View style={styles.detailCardHeader}>
                                            <Text style={styles.detailCardTitle}>{req.request_type}</Text>
                                            <View style={[styles.historyStatusBadge, { backgroundColor: statusStyle.bg }]}>
                                                <Text style={[styles.historyStatusText, { color: statusStyle.text }]}>
                                                    {statusStyle.label}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                {req.request_type === RequestType.LEMBUR ? 'Tanggal' : 'Periode'}
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {new Date(req.start_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                {req.start_date !== req.end_date && (
                                                    `\n- ${new Date(req.end_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                                                )}
                                            </Text>
                                        </View>

                                        {req.request_type === RequestType.LEMBUR && req.start_time && req.end_time && (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Jam Lembur</Text>
                                                <Text style={styles.detailValue}>
                                                    {req.start_time} - {req.end_time}
                                                </Text>
                                            </View>
                                        )}

                                        {req.request_type === RequestType.SUBSTITUSI && parsedReason && (
                                            <>
                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>Shift Awal</Text>
                                                    <Text style={styles.detailValue}>
                                                        {parsedReason.shift_awal?.name || '-'}
                                                    </Text>
                                                </View>
                                                <View style={styles.detailRow}>
                                                    <Text style={styles.detailLabel}>Shift Baru</Text>
                                                    <Text style={styles.detailValue}>
                                                        {parsedReason.shift_baru?.name || '-'}
                                                    </Text>
                                                </View>
                                            </>
                                        )}

                                        {req.request_type === RequestType.SAKIT && req.attachment_url && (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Lampiran</Text>
                                                <Image
                                                    source={{ uri: req.attachment_url }}
                                                    style={styles.detailAttachment}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        )}

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Alasan</Text>
                                            <View style={styles.detailReasonBox}>
                                                <Text style={styles.detailReasonText}>
                                                    "{parsedReason?.reason || parsedReason?.keterangan || req.reason}"
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailSectionTitle}>Informasi Pengajuan</Text>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Tanggal Pengajuan</Text>
                                            <Text style={styles.detailValue}>
                                                {new Date(req.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            );
                        })()}
                    </ScrollView>

                    <View style={styles.detailModalFooter}>
                        <TouchableOpacity
                            style={styles.detailCloseButton}
                            onPress={() => setDetailModalVisible(false)}
                        >
                            <Text style={styles.detailCloseButtonText}>Kembali</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Main Request Form Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.safeAreaModal}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.modalCancel}>Batal</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Pengajuan {requestType}</Text>
                        <TouchableOpacity onPress={handlePreSubmit}>
                            <Text style={styles.modalSubmit}>Kirim</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {validationError && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{validationError}</Text>
                            </View>
                        )}

                        {/* Date Pickers */}
                        <View style={styles.row}>
                            <View style={styles.flex1}>
                                <Text style={styles.inputLabel}>
                                    {requestType === RequestType.SUBSTITUSI || requestType === RequestType.LEMBUR ? "Tanggal" : "Tanggal Mulai"}
                                </Text>
                                <TouchableOpacity
                                    style={styles.dateInput}
                                    onPress={() => setShowStartDatePicker(true)}
                                >
                                    <Text>{formatDate(startDate)}</Text>
                                </TouchableOpacity>
                                {showStartDatePicker && (
                                    <DateTimePicker
                                        value={startDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, date) => {
                                            setShowStartDatePicker(false);
                                            if (date) {
                                                setStartDate(date);
                                                if (date > endDate) setEndDate(date);
                                            }
                                        }}
                                    />
                                )}
                            </View>

                            {(requestType === RequestType.CUTI || requestType === RequestType.IZIN || requestType === RequestType.SAKIT) && (
                                <View style={[styles.flex1, { marginLeft: 12 }]}>
                                    <Text style={styles.inputLabel}>Tanggal Selesai</Text>
                                    <TouchableOpacity
                                        style={styles.dateInput}
                                        onPress={() => setShowEndDatePicker(true)}
                                    >
                                        <Text>{formatDate(endDate)}</Text>
                                    </TouchableOpacity>
                                    {showEndDatePicker && (
                                        <DateTimePicker
                                            value={endDate}
                                            minimumDate={startDate}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={(event, date) => {
                                                setShowEndDatePicker(false);
                                                if (date) setEndDate(date);
                                            }}
                                        />
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Time Pickers for Lembur */}
                        {requestType === RequestType.LEMBUR && (
                            <View style={styles.row}>
                                <View style={styles.flex1}>
                                    <Text style={styles.inputLabel}>Jam Mulai</Text>
                                    <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartTimePicker(true)}>
                                        <Text>{formatTime(startTime)}</Text>
                                    </TouchableOpacity>
                                    {showStartTimePicker && (
                                        <DateTimePicker
                                            value={new Date(startTime)}
                                            mode="time"
                                            is24Hour={true}
                                            display="default"
                                            onChange={(e, d) => {
                                                setShowStartTimePicker(false);
                                                if (d) setStartTime(d.getTime());
                                            }}
                                        />
                                    )}
                                </View>
                                <View style={[styles.flex1, { marginLeft: 12 }]}>
                                    <Text style={styles.inputLabel}>Jam Selesai</Text>
                                    <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndTimePicker(true)}>
                                        <Text>{formatTime(endTime)}</Text>
                                    </TouchableOpacity>
                                    {showEndTimePicker && (
                                        <DateTimePicker
                                            value={new Date(endTime)}
                                            mode="time"
                                            is24Hour={true}
                                            display="default"
                                            onChange={(e, d) => {
                                                setShowEndTimePicker(false);
                                                if (d) setEndTime(d.getTime());
                                            }}
                                        />
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Substitusi Fields */}
                        {requestType === RequestType.SUBSTITUSI && (
                            <View>
                                <Text style={styles.inputLabel}>Shift Saat Ini</Text>
                                <View style={[styles.input, { backgroundColor: '#f1f5f9' }]}>
                                    <Text style={{ color: currentShiftCode ? '#000' : '#ef4444' }}>
                                        {currentShiftCode ? (() => {
                                            const s = shifts.find(sh => sh.code === currentShiftCode);
                                            return s ? `${s.name} (${s.code})` : currentShiftCode;
                                        })() : 'Tidak ada jadwal (Libur)'}
                                    </Text>
                                </View>

                                <Text style={styles.inputLabel}>Pilih Shift Baru</Text>
                                <View style={styles.pillsContainer}>
                                    {shifts.map(shift => (
                                        <TouchableOpacity
                                            key={shift.code}
                                            style={[styles.pill, newShiftCode === shift.code && styles.pillActive]}
                                            onPress={() => setNewShiftCode(shift.code)}
                                        >
                                            <Text style={[styles.pillText, newShiftCode === shift.code && styles.pillTextActive]}>
                                                {shift.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Cuti Substitute Picker */}
                        {requestType === RequestType.CUTI && (
                            <View>
                                <Text style={styles.inputLabel}>Pengganti (Opsional)</Text>
                                <TouchableOpacity
                                    style={styles.pickerSelector}
                                    onPress={() => setShowSubstitutePicker(!showSubstitutePicker)}
                                >
                                    <Text>
                                        {substituteId
                                            ? users.find(u => u.id === substituteId)?.full_name
                                            : '-- Pilih Pengganti --'}
                                    </Text>
                                </TouchableOpacity>
                                {showSubstitutePicker && (
                                    <View style={styles.pickerDropdown}>
                                        <TouchableOpacity style={styles.pickerItem} onPress={() => { setSubstituteId(''); setShowSubstitutePicker(false); }}>
                                            <Text>-- Tidak Ada --</Text>
                                        </TouchableOpacity>
                                        {users.map(u => (
                                            <TouchableOpacity
                                                key={u.id}
                                                style={styles.pickerItem}
                                                onPress={() => { setSubstituteId(u.id); setShowSubstitutePicker(false); }}
                                            >
                                                <Text>{u.full_name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Sakit Attachment */}
                        {requestType === RequestType.SAKIT && (
                            <View>
                                <Text style={styles.inputLabel}>Lampiran (Surat Dokter)</Text>
                                <View style={styles.row}>
                                    <TouchableOpacity style={styles.attachButton} onPress={handlePickDocument}>
                                        <Text style={styles.attachButtonText}>📂 Dokumen</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.attachButton, { backgroundColor: COLORS.info }]} onPress={handlePickImage}>
                                        <Text style={[styles.attachButtonText, { color: 'white' }]}>📷 Foto</Text>
                                    </TouchableOpacity>
                                </View>
                                {attachment && (
                                    <View style={styles.attachmentInfo}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 12 }} numberOfLines={1}>File: {attachment.name || 'Selected File'}</Text>
                                                {(attachment.uri?.endsWith('.jpg') || attachment.uri?.endsWith('.png') || attachment.uri?.endsWith('.jpeg')) &&
                                                    <Image source={{ uri: attachment.uri }} style={{ width: 100, height: 100, marginTop: 8, borderRadius: 8 }} />
                                                }
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => setAttachment(null)}
                                                style={{ backgroundColor: COLORS.dangerBg, padding: 8, borderRadius: 8, marginLeft: 8 }}
                                            >
                                                <Text style={{ color: '#991b1b', fontSize: 12, fontWeight: '600' }}>Hapus</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        <Text style={styles.inputLabel}>
                            {requestType === RequestType.SUBSTITUSI ? 'Keterangan' : 'Alasan'}
                        </Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Jelaskan alasan pengajuan..."
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                visible={confirmModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setConfirmModalVisible(false)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmBox}>
                        <Text style={styles.confirmTitle}>Konfirmasi Pengajuan</Text>

                        <View style={styles.confirmDetails}>
                            <Text style={styles.confirmLabel}>Jenis:</Text>
                            <Text style={styles.confirmValue}>{requestType}</Text>

                            <Text style={styles.confirmLabel}>Tanggal:</Text>
                            <Text style={styles.confirmValue}>
                                {formatDate(startDate)}
                                {requestType !== RequestType.LEMBUR && requestType !== RequestType.SUBSTITUSI && startDate !== endDate && ` - ${formatDate(endDate)}`}
                            </Text>

                            {requestType === RequestType.LEMBUR && (
                                <>
                                    <Text style={styles.confirmLabel}>Waktu:</Text>
                                    <Text style={styles.confirmValue}>{formatTime(startTime)} - {formatTime(endTime)}</Text>
                                </>
                            )}

                            {requestType === RequestType.SUBSTITUSI && (
                                <>
                                    <Text style={styles.confirmLabel}>Shift Baru:</Text>
                                    <Text style={styles.confirmValue}>{newShiftCode || '-'}</Text>
                                </>
                            )}

                            <Text style={styles.confirmLabel}>{requestType === RequestType.SUBSTITUSI ? "Keterangan:" : "Alasan:"}</Text>
                            <Text style={styles.confirmValue} numberOfLines={3}>{reason}</Text>

                            {attachment && (
                                <Text style={[styles.confirmValue, { marginTop: 4, color: COLORS.info }]}>+ Lampiran</Text>
                            )}
                        </View>

                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                style={styles.confirmBtnCancel}
                                onPress={() => setConfirmModalVisible(false)}
                            >
                                <Text style={styles.confirmBtnCancelText}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmBtnSubmit}
                                onPress={handleConfirmSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.confirmBtnSubmitText}>Ya, Kirim</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    },
    scrollContent: {
        paddingBottom: 100,
    },

    // Header
    headerSection: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
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
    },

    // Cards Grid
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 12,
    },
    actionCard: {
        width: (width - 48 - 12) / 2,
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    actionIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textDark,
        marginBottom: 4,
    },
    actionCardSubtitle: {
        fontSize: 12,
        color: COLORS.textMuted,
    },

    // Full Width Card (Tukar Shift)
    sectionPadding: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    fullWidthCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    fullWidthCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fullWidthCardText: {},

    // History Section
    historySection: {
        paddingHorizontal: 24,
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
    seeAllLink: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    historyList: {
        gap: 12,
    },
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    historyIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f3f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    historyContent: {
        flex: 1,
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    historyDate: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    historyStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    historyStatusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginVertical: 20,
    },

    // Modal Styles
    safeAreaModal: {
        flex: 1,
        backgroundColor: COLORS.cardBg,
        paddingTop: Platform.OS === 'android' ? 24 : 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    modalCancel: {
        fontSize: 16,
        color: COLORS.textMuted,
    },
    modalSubmit: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    modalBody: {
        padding: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
        marginBottom: 8,
        marginTop: 16,
        marginLeft: 2,
    },
    input: {
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textDark,
    },
    dateInput: {
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    flex1: {
        flex: 1,
    },
    errorBox: {
        backgroundColor: COLORS.dangerBg,
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
    },
    errorText: {
        color: '#991b1b',
        fontSize: 12,
    },
    pillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    pillActive: {
        backgroundColor: COLORS.textDark,
        borderColor: COLORS.textDark,
    },
    pillText: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    pillTextActive: {
        color: 'white',
    },
    pickerSelector: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
        borderRadius: 12,
    },
    pickerDropdown: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        marginTop: 4,
    },
    pickerItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    attachButton: {
        flex: 1,
        padding: 12,
        backgroundColor: '#e2e8f0',
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 8,
    },
    attachButtonText: {
        fontWeight: '600',
        color: '#475569',
    },
    attachmentInfo: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
    },

    // Detail Modal
    detailModalContainer: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    detailModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    detailModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    detailModalBody: {
        flex: 1,
        padding: 16,
    },
    detailCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    detailCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    detailCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    detailRow: {
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 15,
        color: COLORS.textDark,
        fontWeight: '500',
        lineHeight: 22,
    },
    detailReasonBox: {
        backgroundColor: '#f8f8f5',
        padding: 12,
        borderRadius: 8,
        marginTop: 4,
    },
    detailReasonText: {
        fontSize: 14,
        color: '#334155',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    detailAttachment: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginTop: 8,
        backgroundColor: '#f1f5f9',
    },
    detailSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 16,
    },
    detailModalFooter: {
        padding: 16,
        backgroundColor: COLORS.cardBg,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    detailCloseButton: {
        backgroundColor: COLORS.textDark,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    detailCloseButtonText: {
        color: COLORS.textLight,
        fontSize: 16,
        fontWeight: '600',
    },

    // Confirmation Modal
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    confirmBox: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: COLORS.textDark,
        textAlign: 'center'
    },
    confirmDetails: {
        marginBottom: 20,
        backgroundColor: '#f8f8f5',
        padding: 12,
        borderRadius: 8,
    },
    confirmLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 8,
        fontWeight: '500'
    },
    confirmValue: {
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '500',
    },
    confirmActions: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'flex-end',
    },
    confirmBtnCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    confirmBtnSubmit: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: COLORS.textDark,
    },
    confirmBtnCancelText: {
        color: '#475569',
        fontWeight: '600',
    },
    confirmBtnSubmitText: {
        color: 'white',
        fontWeight: '600',
    },
});
