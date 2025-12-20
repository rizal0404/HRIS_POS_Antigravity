import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// Theme Colors
const COLORS = {
    primary: '#f9f506',
    backgroundLight: '#f8f8f5',
    backgroundDark: '#23220f',
    textDark: '#181811',
    textLight: '#ffffff',
    textMuted: '#737373',
    cardBg: '#ffffff',
    border: '#e5e5e5',
    success: '#22c55e',
    error: '#ef4444',
};

interface ChangePasswordModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleClose = () => {
        setNewPassword('');
        setConfirmPassword('');
        setMessage(null);
        onClose();
    };

    const handleSave = async () => {
        setMessage(null);

        // Validation
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password minimal 6 karakter' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Password dan konfirmasi tidak cocok' });
            return;
        }

        setIsSaving(true);

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Password berhasil diubah!' });
            setNewPassword('');
            setConfirmPassword('');

            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Gagal mengubah password' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container} edges={['top']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                            <MaterialIcons name="close" size={24} color={COLORS.textDark} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Ubah Password</Text>
                        <View style={styles.headerButton} />
                    </View>

                    <View style={styles.content}>
                        {/* Icon */}
                        <View style={styles.iconContainer}>
                            <MaterialIcons name="lock" size={48} color={COLORS.primary} />
                        </View>

                        <Text style={styles.subtitle}>
                            Masukkan password baru Anda. Password minimal 6 karakter.
                        </Text>

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

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password Baru</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Minimal 6 karakter"
                                    placeholderTextColor={COLORS.textMuted}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                >
                                    <MaterialIcons
                                        name={showPassword ? 'visibility-off' : 'visibility'}
                                        size={22}
                                        color={COLORS.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Konfirmasi Password Baru</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Ulangi password baru"
                                    placeholderTextColor={COLORS.textMuted}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={isSaving || !newPassword}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={COLORS.textDark} />
                            ) : (
                                <>
                                    <MaterialIcons name="lock-outline" size={20} color={COLORS.textDark} />
                                    <Text style={styles.saveButtonText}>Ubah Password</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
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
    content: {
        flex: 1,
        padding: 24,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.backgroundDark,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    message: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
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
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textDark,
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textDark,
    },
    eyeButton: {
        padding: 12,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        marginTop: 24,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
    },
});
