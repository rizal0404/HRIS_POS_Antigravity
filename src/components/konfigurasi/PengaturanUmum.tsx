"use client";

import React, { useEffect, useState } from 'react';
import { CogIcon, LocationMarkerIcon, BellIcon, SaveIcon, PencilIcon, UploadIcon, CheckCircleIcon } from '../icons';
import { supabase } from '@/services/supabase';
import { BRAND_BUCKET, BRAND_LOGO_PATH, getBrandLogoUrl } from '@/lib/branding';
import { apiService } from '@/services/apiService';
import { NotificationPreferences } from '@/types';

const ADMIN_PRIVATE_SECTION_KEY = 'hris_admin_private_services';

const ToggleRow: React.FC<{ label: string; checked: boolean; disabled?: boolean; onChange: () => void }> = ({ label, checked, disabled, onChange }) => (
    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-md">
        <span className="font-medium text-gray-700">{label}</span>
        <button
            type="button"
            onClick={onChange}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                checked ? 'bg-green-500' : 'bg-gray-300'
            } ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-1'
                }`}
            />
        </button>
    </div>
);

const PengaturanUmum: React.FC = () => {
    const [radius, setRadius] = useState<number>(350);
    const [tempRadius, setTempRadius] = useState<number>(350);
    const [isEditingRadius, setIsEditingRadius] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoMessage, setLogoMessage] = useState<string | null>(null);
    const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({ new_request: true, request_approved: true, request_rejected: true });
    const [notifLoading, setNotifLoading] = useState<boolean>(true);
    const [notifSaving, setNotifSaving] = useState<boolean>(false);
    const [notifMessage, setNotifMessage] = useState<string | null>(null);
    const [notifError, setNotifError] = useState<string | null>(null);
    const [chatId, setChatId] = useState<string>('');
    const [chatSaving, setChatSaving] = useState<boolean>(false);
    const [chatMessage, setChatMessage] = useState<string | null>(null);
    const [chatError, setChatError] = useState<string | null>(null);
    const [adminPrivateEnabled, setAdminPrivateEnabled] = useState<boolean>(true);

    const handleSaveRadius = () => {
        setRadius(tempRadius);
        setIsEditingRadius(false);
    };

    useEffect(() => {
        try {
            setLogoUrl(getBrandLogoUrl());
        } catch {
            setLogoUrl(null);
        }
    }, []);

    useEffect(() => {
        const fetchPrefs = async () => {
            setNotifLoading(true);
            setNotifError(null);
            try {
                const prefs = await apiService.getNotificationPreferences();
                setNotifPrefs(prefs);
                setChatId(prefs.telegram_chat_id || '');
            } catch (error: any) {
                setNotifError(error.message || 'Gagal memuat pengaturan notifikasi.');
            } finally {
                setNotifLoading(false);
            }
        };
        fetchPrefs();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const val = localStorage.getItem(ADMIN_PRIVATE_SECTION_KEY);
        setAdminPrivateEnabled(val !== 'off');
    }, []);

    const handleAdminPrivateToggle = () => {
        const next = !adminPrivateEnabled;
        setAdminPrivateEnabled(next);
        if (typeof window !== 'undefined') {
            localStorage.setItem(ADMIN_PRIVATE_SECTION_KEY, next ? 'on' : 'off');
            window.dispatchEvent(new Event('admin-private-section-changed'));
        }
    };

    const handleNotifToggle = async (key: keyof NotificationPreferences) => {
        setNotifMessage(null);
        setNotifError(null);
        const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
        setNotifPrefs(updated);
        setNotifSaving(true);
        try {
            const saved = await apiService.updateNotificationPreferences(updated);
            setNotifPrefs(saved);
            setNotifMessage('Pengaturan notifikasi disimpan.');
        } catch (error: any) {
            setNotifError(error.message || 'Gagal menyimpan pengaturan notifikasi.');
            setNotifPrefs(notifPrefs); // revert
        } finally {
            setNotifSaving(false);
        }
    };

    const handleSaveChatId = async () => {
        setChatMessage(null);
        setChatError(null);
        setChatSaving(true);
        try {
            const saved = await apiService.updateTelegramChatId(chatId.trim() || null);
            setNotifPrefs(saved);
            setChatId(saved.telegram_chat_id || '');
            setChatMessage('Chat ID Telegram berhasil disimpan.');
        } catch (error: any) {
            setChatError(error.message || 'Gagal menyimpan Chat ID Telegram.');
        } finally {
            setChatSaving(false);
        }
    };

    const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        setLogoMessage(null);
        const { error } = await supabase.storage.from(BRAND_BUCKET).upload(BRAND_LOGO_PATH, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: '3600',
        });
        if (error) {
            setLogoMessage(`Gagal mengunggah logo: ${error.message}`);
        } else {
            const refreshedUrl = `${getBrandLogoUrl()}?t=${Date.now()}`; // bust cache
            setLogoUrl(refreshedUrl);
            setLogoMessage('Logo berhasil diperbarui. Reload aplikasi untuk melihat perubahan.');
        }
        setLogoUploading(false);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
                <CogIcon className="h-8 w-8 text-slate-700" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Pengaturan Umum</h2>
                    <p className="text-sm text-gray-500">Kelola parameter umum sistem.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Logo Aplikasi */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                            <UploadIcon className="h-5 w-5" /> Logo Aplikasi
                        </h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Superadmin dapat mengganti logo aplikasi yang tampil di login dan sidebar. Logo akan diambil dari penyimpanan Supabase bucket "{BRAND_BUCKET}".</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="h-20 w-20 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo aplikasi" className="h-full w-full object-contain" />
                            ) : (
                                <span className="text-xs text-gray-400">Belum ada logo</span>
                            )}
                        </div>
                        <label className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleUploadLogo}
                                disabled={logoUploading}
                            />
                            {logoUploading ? 'Mengunggah...' : 'Unggah Logo Baru'}
                        </label>
                    </div>
                    {logoMessage && (
                        <div className="mt-3 inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <CheckCircleIcon className="h-4 w-4" />
                            <span>{logoMessage}</span>
                        </div>
                    )}
                </div>

                {/* Radius Lokasi Absensi */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                            <LocationMarkerIcon className="h-5 w-5"/> Radius Lokasi Absensi
                        </h3>
                        {!isEditingRadius && (
                            <button onClick={() => setIsEditingRadius(true)} className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                <PencilIcon className="h-4 w-4 mr-1.5" /> Edit
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Atur jarak maksimal (dalam meter) karyawan dapat melakukan clock-in/out dari lokasi kerja yang ditentukan.</p>
                    
                    {isEditingRadius ? (
                        <div className="flex items-center gap-4">
                            <input 
                                type="number"
                                value={tempRadius}
                                onChange={(e) => setTempRadius(Number(e.target.value))}
                                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                             <div className="flex items-center space-x-2">
                                 <button onClick={handleSaveRadius} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                                    <SaveIcon className="h-4 w-4 mr-2" /> Simpan
                                </button>
                                <button onClick={() => setIsEditingRadius(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Batal
                                </button>
                             </div>
                        </div>
                    ) : (
                        <p className="font-bold text-2xl text-blue-600">{radius} <span className="text-lg text-gray-600">meter</span></p>
                    )}
                </div>

                {/* Pengaturan Notifikasi */}
                <div className="bg-gray-50 rounded-lg p-4">
                     <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-2">
                        <BellIcon className="h-5 w-5"/> Pengaturan Notifikasi
                    </h3>
                     <p className="text-sm text-gray-500 mb-4">Aktifkan notifikasi email untuk pengajuan baru, persetujuan, atau penolakan. Preferensi ini tersimpan per pengguna.</p>
                     
                     <div className="space-y-3">
                        {notifError && <p className="text-sm text-red-600">{notifError}</p>}
                        {notifMessage && <p className="text-sm text-green-600">{notifMessage}</p>}
                        <ToggleRow 
                            label="Notifikasi Pengajuan Baru" 
                            checked={notifPrefs.new_request} 
                            disabled={notifLoading || notifSaving} 
                            onChange={() => handleNotifToggle('new_request')}
                        />
                        <ToggleRow 
                            label="Notifikasi Pengajuan Disetujui" 
                            checked={notifPrefs.request_approved} 
                            disabled={notifLoading || notifSaving} 
                            onChange={() => handleNotifToggle('request_approved')}
                        />
                        <ToggleRow 
                            label="Notifikasi Pengajuan Ditolak" 
                            checked={notifPrefs.request_rejected} 
                            disabled={notifLoading || notifSaving} 
                            onChange={() => handleNotifToggle('request_rejected')}
                        />
                        {notifLoading && <p className="text-sm text-gray-500">Memuat pengaturan...</p>}
                        <div className="pt-3 border-t border-gray-200 mt-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Telegram Chat ID</p>
                            <p className="text-xs text-gray-500 mb-2">Masukkan Chat ID dari bot Telegram untuk menerima notifikasi via Telegram.</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                    type="text"
                                    value={chatId}
                                    onChange={(e) => setChatId(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="contoh: 123456789"
                                    disabled={notifLoading || chatSaving}
                                />
                                <button 
                                    type="button"
                                    onClick={handleSaveChatId}
                                    disabled={notifLoading || chatSaving}
                                    className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    {chatSaving ? 'Menyimpan...' : 'Simpan Chat ID'}
                                </button>
                            </div>
                            {chatMessage && <p className="text-sm text-green-600 mt-1">{chatMessage}</p>}
                            {chatError && <p className="text-sm text-red-600 mt-1">{chatError}</p>}
                        </div>
                     </div>
                </div>

                {/* Tampilkan/Layanan Pribadi untuk Admin */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-2">
                        <CogIcon className="h-5 w-5" /> Layanan Pribadi untuk Admin
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                        Kontrol apakah menu “Layanan Pribadi” muncul di sidebar pengguna dengan peran admin. Pengaturan ini disimpan di browser.
                    </p>
                    <ToggleRow 
                        label="Tampilkan Layanan Pribadi pada admin" 
                        checked={adminPrivateEnabled} 
                        onChange={handleAdminPrivateToggle}
                    />
                </div>
            </div>
        </div>
    );
};

export default PengaturanUmum;
