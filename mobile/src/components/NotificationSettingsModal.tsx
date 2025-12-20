import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

// Theme Colors
const COLORS = {
    primary: '#f9f506',
    backgroundLight: '#f8f8f5',
    backgroundDark: '#23220f',
    surfaceDark: '#363517',
    textDark: '#181811',
    textLight: '#ffffff',
    textMuted: '#737373',
    cardBg: '#ffffff',
    border: '#e5e5e5',
    success: '#22c55e',
    error: '#ef4444',
};

interface NotificationSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    user: UserProfile;
    onProfileUpdated: () => void;
}

export default function NotificationSettingsModal({ visible, onClose, user, onProfileUpdated }: NotificationSettingsModalProps) {
    const [telegramChatId, setTelegramChatId] = useState('');
    const [notifAbsensi, setNotifAbsensi] = useState(true);
    const [notifPengajuan, setNotifPengajuan] = useState(true);
    const [notifPersetujuan, setNotifPersetujuan] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (visible && user) {
            setTelegramChatId(user.telegram_chat_id || '');
            setMessage(null);
        }
    }, [visible, user]);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    telegram_chat_id: telegramChatId.trim() || null,
                })
                .eq('id', user.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Pengaturan notifikasi berhasil disimpan!' });
            setTimeout(() => {
                onProfileUpdated();
                onClose();
            }, 1000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Gagal menyimpan pengaturan' });
        } finally {
            setIsSaving(false);
        }
    };

    const renderToggle = (label: string, description: string, value: boolean, onChange: (val: boolean) => void, disabled = false) => (
        <View style={styles.toggleRow}>
            <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>{label}</Text>
                <Text style={styles.toggleDescription}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.cardBg}
                disabled={disabled}
            />
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <MaterialIcons name="close" size={24} color={COLORS.textDark} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Notifikasi</Text>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={[styles.headerButton, styles.saveButton]}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={COLORS.textDark} size="small" />
                            ) : (
                                <MaterialIcons name="check" size={24} color={COLORS.textDark} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Message */}
                        {message && (
                            <View style={[styles.message, message.type === 'success' ? styles.messageSuccess : styles.messageError]}>
                                <MaterialIcons
                                    name={message.type === 'success' ? 'check-circle' : 'error'}
                                    size={18}
                                    color={message.type === 'success' ? COLORS.success : COLORS.error}
                                />
                                <Text style={[styles.messageText, { color: message.type === 'success' ? COLORS.success : COLORS.error }]}>
                                    {message.text}
                                </Text>
                            </View>
                        )}

                        {/* Telegram Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="telegram" size={24} color="#0088cc" />
                                <Text style={styles.sectionTitle}>Telegram</Text>
                            </View>

                            <View style={styles.card}>
                                <Text style={styles.inputLabel}>Chat ID</Text>
                                <TextInput
                                    style={styles.input}
                                    value={telegramChatId}
                                    onChangeText={setTelegramChatId}
                                    placeholder="Contoh: 123456789"
                                    placeholderTextColor={COLORS.textMuted}
                                    keyboardType="number-pad"
                                />
                                <Text style={styles.helperText}>
                                    Untuk mendapatkan Chat ID:{'\n'}
                                    1. Buka bot Telegram perusahaan{'\n'}
                                    2. Kirim pesan /start{'\n'}
                                    3. Bot akan mengirimkan Chat ID Anda
                                </Text>
                            </View>
                        </View>

                        {/* Notification Preferences */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="notifications" size={24} color={COLORS.primary} />
                                <Text style={styles.sectionTitle}>Preferensi Notifikasi</Text>
                            </View>

                            <View style={styles.card}>
                                {renderToggle(
                                    'Notifikasi Absensi',
                                    'Pengingat clock in/out dan status kehadiran',
                                    notifAbsensi,
                                    setNotifAbsensi
                                )}
                                <View style={styles.divider} />
                                {renderToggle(
                                    'Notifikasi Pengajuan',
                                    'Update status cuti, izin, dan lembur',
                                    notifPengajuan,
                                    setNotifPengajuan
                                )}
                                <View style={styles.divider} />
                                {renderToggle(
                                    'Notifikasi Persetujuan',
                                    'Pemberitahuan saat ada pengajuan baru (untuk manager)',
                                    notifPersetujuan,
                                    setNotifPersetujuan
                                )}
                            </View>

                            <View style={styles.infoBox}>
                                <MaterialIcons name="info-outline" size={18} color={COLORS.textMuted} />
                                <Text style={styles.infoText}>
                                    Pengaturan preferensi notifikasi akan diterapkan setelah sistem push notification diaktifkan.
                                </Text>
                            </View>
                        </View>

                        <View style={{ height: 50 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
    },
    content: {
        flex: 1,
    },
    message: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
    },
    messageSuccess: {
        backgroundColor: '#dcfce7',
    },
    messageError: {
        backgroundColor: '#fee2e2',
    },
    messageText: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textDark,
        marginBottom: 6,
    },
    input: {
        backgroundColor: COLORS.backgroundLight,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textDark,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 8,
        lineHeight: 18,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    toggleContent: {
        flex: 1,
        marginRight: 12,
    },
    toggleLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.textDark,
    },
    toggleDescription: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 8,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textMuted,
        lineHeight: 18,
    },
});
