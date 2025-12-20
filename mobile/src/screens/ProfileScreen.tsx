import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import NotificationSettingsModal from '../components/NotificationSettingsModal';

const { width } = Dimensions.get('window');

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
    danger: '#ef4444',
    dangerBg: '#fee2e2',
};

export default function ProfileScreen() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal visibility states
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showNotificationSettings, setShowNotificationSettings] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) throw error;
            setUser(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);



    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Apakah Anda yakin ingin keluar?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                    },
                },
            ]
        );
    };

    const menuItems = [
        { icon: 'person-outline' as const, label: 'Edit Profil', action: () => setShowEditProfile(true) },
        { icon: 'notifications-none' as const, label: 'Notifikasi', action: () => setShowNotificationSettings(true) },
        { icon: 'lock-outline' as const, label: 'Ubah Password', action: () => setShowChangePassword(true) },
        { icon: 'info-outline' as const, label: 'Tentang Aplikasi', action: () => Alert.alert('HRIS Mobile', 'Versi 1.0.1\n© 2026 QCTonasa') },
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            {user?.avatar_url ? (
                                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.activeIndicator} />
                        </View>
                        <TouchableOpacity style={styles.editButton} onPress={() => setShowEditProfile(true)}>
                            <MaterialIcons name="edit" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.name}>{user?.full_name || 'Loading...'}</Text>
                    <Text style={styles.position}>{user?.position || 'Karyawan'}</Text>

                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <MaterialIcons name="verified-user" size={14} color={COLORS.primary} />
                            <Text style={styles.badgeText}>{user?.role?.toUpperCase() || 'USER'}</Text>
                        </View>
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <MaterialIcons name="badge" size={20} color={COLORS.textMuted} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>NIK</Text>
                                <Text style={styles.infoValue}>{user?.nik || '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <MaterialIcons name="email" size={20} color={COLORS.textMuted} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Email</Text>
                                <Text style={styles.infoValue}>{user?.email || '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <MaterialIcons name="phone" size={20} color={COLORS.textMuted} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Nomor HP</Text>
                                <Text style={styles.infoValue}>{user?.phone_number || '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <MaterialIcons name="home" size={20} color={COLORS.textMuted} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Alamat</Text>
                                <Text style={styles.infoValue} numberOfLines={2}>{user?.address || '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.infoDivider} />
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <MaterialIcons name="schedule" size={20} color={COLORS.textMuted} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Shift Default</Text>
                                <Text style={styles.infoValue}>{user?.default_shift || '-'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Menu Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pengaturan</Text>
                    <View style={styles.menuCard}>
                        {menuItems.map((item, index) => (
                            <React.Fragment key={index}>
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={item.action}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.menuIconContainer}>
                                        <MaterialIcons name={item.icon} size={22} color={COLORS.textDark} />
                                    </View>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <MaterialIcons name="chevron-right" size={22} color={COLORS.textMuted} />
                                </TouchableOpacity>
                                {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* Logout Button */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
                        <MaterialIcons name="logout" size={20} color={COLORS.danger} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* Version */}
                <Text style={styles.version}>HRIS Mobile v1.0.1</Text>
            </ScrollView>

            {/* Modals */}
            {user && (
                <>
                    <EditProfileModal
                        visible={showEditProfile}
                        onClose={() => setShowEditProfile(false)}
                        user={user}
                        onProfileUpdated={fetchProfile}
                    />
                    <NotificationSettingsModal
                        visible={showNotificationSettings}
                        onClose={() => setShowNotificationSettings(false)}
                        user={user}
                        onProfileUpdated={fetchProfile}
                    />
                </>
            )}
            <ChangePasswordModal
                visible={showChangePassword}
                onClose={() => setShowChangePassword(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.backgroundDark,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    scrollContent: {
        paddingBottom: 100,
    },

    // Profile Card
    profileCard: {
        backgroundColor: COLORS.backgroundDark,
        paddingTop: 24,
        paddingBottom: 32,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    profileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.surfaceDark,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#22c55e',
        borderWidth: 3,
        borderColor: COLORS.backgroundDark,
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textLight,
        marginBottom: 4,
    },
    position: {
        fontSize: 16,
        color: '#a3a3a3',
        marginBottom: 16,
    },
    badgeRow: {
        flexDirection: 'row',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.surfaceDark,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },

    // Sections
    section: {
        paddingHorizontal: 24,
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Info Card
    infoCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    infoIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f3f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.textDark,
    },
    infoDivider: {
        height: 1,
        backgroundColor: '#f3f3f1',
        marginLeft: 68,
    },

    // Menu Card
    menuCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f3f1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuLabel: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textDark,
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#f3f3f1',
        marginLeft: 68,
    },

    // Logout
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.dangerBg,
        borderRadius: 16,
        padding: 16,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.danger,
    },

    // Version
    version: {
        textAlign: 'center',
        color: COLORS.textMuted,
        fontSize: 12,
        paddingVertical: 24,
    },
});
