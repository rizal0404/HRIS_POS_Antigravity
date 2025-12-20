import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    TextInput,
    Modal,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { formatDateKey, CORRECTION_MAX_DAYS, APP_TIME_OFFSET } from '../lib/attendanceRules';
import { Attendance, Request, RequestType, RequestStatus, CorrectionType } from '../types';

interface CorrectionModalProps {
    visible: boolean;
    onClose: () => void;
    attendance: Attendance | null;
    onSuccess: () => void;
}

const CORRECTION_TYPES: { type: CorrectionType; label: string; description: string }[] = [
    { type: 'missed_in', label: 'Lupa Clock In', description: 'Sudah clock out tapi tidak ada clock in' },
    { type: 'missed_out', label: 'Lupa Clock Out', description: 'Ada clock in tapi belum clock out' },
    { type: 'missed_both', label: 'Tidak Absen', description: 'Tidak ada record absensi sama sekali' },
    { type: 'wrong_time', label: 'Waktu Salah', description: 'Waktu tercatat tidak akurat' },
];

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
    visible,
    onClose,
    attendance,
    onSuccess,
}) => {
    const [correctionType, setCorrectionType] = useState<CorrectionType>('missed_in');
    const [newClockIn, setNewClockIn] = useState('');
    const [newClockOut, setNewClockOut] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [existingPending, setExistingPending] = useState<Request | null>(null);

    const targetDate = attendance?.work_date || formatDateKey(new Date());

    // Check for existing pending corrections
    useEffect(() => {
        const checkPending = async () => {
            if (!visible) return;

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await supabase
                    .from('requests')
                    .select('*')
                    .eq('profile_id', user.id)
                    .eq('request_type', RequestType.KOREKSI)
                    .eq('status', RequestStatus.PENDING)
                    .eq('start_date', targetDate)
                    .limit(1)
                    .single();

                setExistingPending(data);
            } catch {
                setExistingPending(null);
            }
        };

        checkPending();
    }, [visible, targetDate]);

    const validateForm = (): string | null => {
        if (reason.trim().length < 5) return 'Alasan minimal 5 karakter';

        if (correctionType === 'missed_in' || correctionType === 'wrong_time') {
            if (!newClockIn) return 'Waktu clock in harus diisi';
        }
        if (correctionType === 'missed_out' || correctionType === 'wrong_time') {
            if (!newClockOut) return 'Waktu clock out harus diisi';
        }
        if (correctionType === 'missed_both') {
            if (!newClockIn || !newClockOut) return 'Waktu clock in dan out harus diisi';
        }

        // Validate date range
        const today = new Date();
        const target = new Date(`${targetDate}T00:00:00${APP_TIME_OFFSET}`);
        const todayStart = new Date(formatDateKey(today) + `T00:00:00${APP_TIME_OFFSET}`);
        const dayDiff = Math.floor((todayStart.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff > CORRECTION_MAX_DAYS) {
            return `Koreksi hanya boleh diajukan maksimal ${CORRECTION_MAX_DAYS} hari ke belakang`;
        }

        return null;
    };

    const handleSubmit = async (replaceExisting: boolean = false) => {
        const error = validateForm();
        if (error) {
            Alert.alert('Validasi', error);
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // If replacing, delete old request first
            if (replaceExisting && existingPending) {
                const { error: deleteError } = await supabase
                    .from('requests')
                    .delete()
                    .eq('id', existingPending.id);

                if (deleteError) throw deleteError;
            }

            // Build ISO timestamps
            const newClockInISO = newClockIn
                ? new Date(`${targetDate}T${newClockIn}${APP_TIME_OFFSET}`).toISOString()
                : null;
            const newClockOutISO = newClockOut
                ? new Date(`${targetDate}T${newClockOut}${APP_TIME_OFFSET}`).toISOString()
                : null;

            // Build reason JSON
            const reasonPayload = JSON.stringify({
                type: correctionType,
                reason: reason.trim(),
                new_clock_in_iso: newClockInISO,
                new_clock_out_iso: newClockOutISO,
            });

            // Get user profile to find manager
            const { data: profile } = await supabase
                .from('profiles')
                .select('manager_id')
                .eq('id', user.id)
                .single();

            // Insert new correction request
            const { error: insertError } = await supabase
                .from('requests')
                .insert({
                    profile_id: user.id,
                    request_type: RequestType.KOREKSI,
                    start_date: targetDate,
                    end_date: targetDate,
                    start_time: newClockIn || newClockOut,
                    reason: reasonPayload,
                    status: RequestStatus.PENDING,
                    approver_id: profile?.manager_id,
                    attendance_id_to_correct: attendance?.id || null,
                });

            if (insertError) throw insertError;

            Alert.alert('✅ Berhasil', 'Ajuan koreksi telah dikirim ke atasan');
            onSuccess();
            onClose();
            resetForm();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Gagal mengirim ajuan');
        } finally {
            setLoading(false);
        }
    };

    const handlePendingChoice = () => {
        Alert.alert(
            'Ajuan Pending Ditemukan',
            `Sudah ada ajuan koreksi untuk tanggal ${targetDate} yang masih pending.\n\nApa yang ingin Anda lakukan?`,
            [
                { text: 'Batalkan', style: 'cancel' },
                {
                    text: 'Timpa Ajuan Lama',
                    style: 'destructive',
                    onPress: () => handleSubmit(true)
                },
            ]
        );
    };

    const onSubmitPress = () => {
        if (existingPending) {
            handlePendingChoice();
        } else {
            handleSubmit(false);
        }
    };

    const resetForm = () => {
        setCorrectionType('missed_in');
        setNewClockIn('');
        setNewClockOut('');
        setReason('');
        setExistingPending(null);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Ajukan Koreksi Absensi</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {/* Target Date */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Tanggal</Text>
                            <Text style={styles.dateValue}>{targetDate}</Text>
                        </View>

                        {/* Existing Pending Warning */}
                        {existingPending && (
                            <View style={styles.warningCard}>
                                <Text style={styles.warningTitle}>⚠️ Ajuan Pending Ditemukan</Text>
                                <Text style={styles.warningText}>
                                    Sudah ada ajuan koreksi untuk tanggal ini.
                                    Anda dapat menimpanya dengan ajuan baru.
                                </Text>
                            </View>
                        )}

                        {/* Correction Type */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Jenis Koreksi</Text>
                            <View style={styles.typeButtons}>
                                {CORRECTION_TYPES.map((ct) => (
                                    <TouchableOpacity
                                        key={ct.type}
                                        style={[styles.typeButton, correctionType === ct.type && styles.typeButtonActive]}
                                        onPress={() => setCorrectionType(ct.type)}>
                                        <Text style={[styles.typeButtonText, correctionType === ct.type && styles.typeButtonTextActive]}>
                                            {ct.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.typeDescription}>
                                {CORRECTION_TYPES.find(ct => ct.type === correctionType)?.description}
                            </Text>
                        </View>

                        {/* Clock In Time */}
                        {(correctionType === 'missed_in' || correctionType === 'wrong_time' || correctionType === 'missed_both') && (
                            <View style={styles.field}>
                                <Text style={styles.label}>Waktu Clock In Seharusnya</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="08:00"
                                    placeholderTextColor="#64748b"
                                    value={newClockIn}
                                    onChangeText={setNewClockIn}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>
                        )}

                        {/* Clock Out Time */}
                        {(correctionType === 'missed_out' || correctionType === 'wrong_time' || correctionType === 'missed_both') && (
                            <View style={styles.field}>
                                <Text style={styles.label}>Waktu Clock Out Seharusnya</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="17:00"
                                    placeholderTextColor="#64748b"
                                    value={newClockOut}
                                    onChangeText={setNewClockOut}
                                    keyboardType="numbers-and-punctuation"
                                />
                            </View>
                        )}

                        {/* Reason */}
                        <View style={styles.field}>
                            <Text style={styles.label}>Alasan <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Jelaskan alasan koreksi..."
                                placeholderTextColor="#64748b"
                                value={reason}
                                onChangeText={setReason}
                                multiline
                                numberOfLines={3}
                            />
                            {reason.length < 5 && (
                                <Text style={styles.hint}>Minimal 5 karakter</Text>
                            )}
                        </View>

                        {/* Original Data (if editing existing) */}
                        {attendance && (
                            <View style={styles.originalData}>
                                <Text style={styles.originalTitle}>Data Asli</Text>
                                <Text style={styles.originalText}>
                                    Clock In: {attendance.clock_in ? new Date(attendance.clock_in).toLocaleTimeString('id-ID') : '-'}
                                </Text>
                                <Text style={styles.originalText}>
                                    Clock Out: {attendance.clock_out ? new Date(attendance.clock_out).toLocaleTimeString('id-ID') : '-'}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Batal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.buttonDisabled]}
                            onPress={onSubmitPress}
                            disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {existingPending ? 'Timpa & Kirim' : 'Kirim Ajuan'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    closeButton: {
        fontSize: 24,
        color: '#94a3b8',
    },
    modalBody: {
        padding: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    field: {
        marginBottom: 16,
    },
    label: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 8,
    },
    required: {
        color: '#ef4444',
    },
    dateValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    warningCard: {
        backgroundColor: '#422006',
        borderWidth: 1,
        borderColor: '#f59e0b',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    warningTitle: {
        color: '#fbbf24',
        fontWeight: '600',
        marginBottom: 4,
    },
    warningText: {
        color: '#fcd34d',
        fontSize: 13,
    },
    typeButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeButton: {
        backgroundColor: '#334155',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        marginBottom: 4,
    },
    typeButtonActive: {
        backgroundColor: '#3b82f6',
    },
    typeButtonText: {
        color: '#94a3b8',
        fontSize: 13,
    },
    typeButtonTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    typeDescription: {
        color: '#64748b',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 8,
    },
    input: {
        backgroundColor: '#334155',
        borderRadius: 12,
        padding: 12,
        color: '#fff',
        fontSize: 16,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    hint: {
        color: '#f59e0b',
        fontSize: 11,
        marginTop: 4,
    },
    originalData: {
        backgroundColor: '#334155',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    originalTitle: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 4,
    },
    originalText: {
        color: '#cbd5e1',
        fontSize: 14,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#334155',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#94a3b8',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#475569',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CorrectionModal;
