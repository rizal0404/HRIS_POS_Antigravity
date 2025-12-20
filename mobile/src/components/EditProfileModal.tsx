import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
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

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    user: UserProfile;
    onProfileUpdated: () => void;
}

export default function EditProfileModal({ visible, onClose, user, onProfileUpdated }: EditProfileModalProps) {
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (visible && user) {
            setFormData({
                nik: user.nik,
                email: user.email,
                phone_number: user.phone_number,
                place_of_birth: user.place_of_birth,
                date_of_birth: user.date_of_birth,
                education_level: user.education_level,
                education_major: user.education_major,
                employment_status: user.employment_status,
                address: user.address,
            });
            setAvatarUri(user.avatar_url);
            setAvatarBase64(null);
            setMessage(null);
        }
    }, [visible, user]);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Izin Diperlukan', 'Aplikasi memerlukan izin akses ke galeri foto.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,  // Get base64 directly from image picker
        });

        if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri);
            setAvatarBase64(result.assets[0].base64 || null);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);

        try {
            let newAvatarUrl = user.avatar_url;

            // Upload new avatar if changed
            if (avatarBase64 && avatarUri && avatarUri !== user.avatar_url) {
                const fileExt = avatarUri.split('.').pop()?.toLowerCase() || 'jpg';
                const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(fileName, decode(avatarBase64), {
                        upsert: true,
                        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
                    });

                if (uploadError) {
                    throw new Error(`Upload gagal: ${uploadError.message}`);
                }

                const { data: urlData } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(fileName);

                newAvatarUrl = urlData.publicUrl;
            }

            // Update profile in database
            const { error } = await supabase
                .from('profiles')
                .update({
                    ...formData,
                    avatar_url: newAvatarUrl,
                })
                .eq('id', user.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Profil berhasil disimpan!' });
            setTimeout(() => {
                onProfileUpdated();
                onClose();
            }, 1000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Gagal menyimpan profil' });
        } finally {
            setIsSaving(false);
        }
    };

    const renderInput = (
        label: string,
        key: keyof UserProfile,
        placeholder?: string,
        multiline?: boolean,
        keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default'
    ) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={[styles.input, multiline && styles.inputMultiline]}
                value={formData[key]?.toString() || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, [key]: text }))}
                placeholder={placeholder || `Masukkan ${label.toLowerCase()}`}
                placeholderTextColor={COLORS.textMuted}
                multiline={multiline}
                numberOfLines={multiline ? 3 : 1}
                keyboardType={keyboardType}
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
                        <Text style={styles.headerTitle}>Edit Profil</Text>
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

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Avatar Section */}
                        <View style={styles.avatarSection}>
                            <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.avatarEditBadge}>
                                    <MaterialIcons name="camera-alt" size={16} color={COLORS.textDark} />
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.avatarHint}>Tap untuk ganti foto</Text>
                        </View>

                        {/* Form Fields */}
                        <View style={styles.form}>
                            <Text style={styles.sectionTitle}>Informasi Dasar</Text>
                            {renderInput('NIK', 'nik', 'Nomor Induk Karyawan')}
                            {renderInput('Email', 'email', 'email@example.com', false, 'email-address')}
                            {renderInput('Nomor HP', 'phone_number', '08xxxxxxxxxx', false, 'phone-pad')}

                            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Data Pribadi</Text>
                            {renderInput('Tempat Lahir', 'place_of_birth', 'Kota kelahiran')}
                            {renderInput('Tanggal Lahir', 'date_of_birth', 'YYYY-MM-DD')}
                            {renderInput('Pendidikan Terakhir', 'education_level', 'S1, D3, SMA, dll')}
                            {renderInput('Jurusan Pendidikan', 'education_major', 'Teknik Informatika, dll')}
                            {renderInput('Status Pernikahan', 'employment_status', 'Single / Menikah / Cerai')}
                            {renderInput('Alamat', 'address', 'Alamat lengkap', true)}
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
    },
    content: {
        flex: 1,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.backgroundDark,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.cardBg,
    },
    avatarHint: {
        marginTop: 8,
        fontSize: 13,
        color: COLORS.textMuted,
    },
    form: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
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
    input: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.textDark,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
});
