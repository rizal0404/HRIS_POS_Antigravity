"use client";

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../../../types';
import { supabase } from '../../../services/supabase';
import { apiService } from '../../../services/apiService';
import { CameraIcon, PencilIcon, SaveIcon } from '../../../components/icons';
import Spinner from '../../../components/ui/Spinner';

interface ProfilSayaPageProps {
  user: UserProfile;
}

const ProfilSayaPage: React.FC<ProfilSayaPageProps> = ({ user }) => {
    const [formData, setFormData] = useState<Partial<UserProfile>>(user);
    const [isEditing, setIsEditing] = useState(false);
    
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        setFormData(user);
        setAvatarPreview(user.avatar_url);
    }, [user]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
            setIsEditing(true); // Automatically enter edit mode when picture is changed
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        setProfileMessage(null);
        let updatedData = { ...formData };
        let newAvatarUrl = formData.avatar_url;

        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, avatarFile, { upsert: true });

            if (uploadError) {
                setProfileMessage({ type: 'error', text: `Gagal mengunggah foto: ${uploadError.message}` });
                setIsSaving(false);
                return;
            }
            
            const { data: urlData } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);
            
            newAvatarUrl = urlData.publicUrl;
        }

        const telegramChatId = typeof updatedData.telegram_chat_id === 'string' ? updatedData.telegram_chat_id.trim() : updatedData.telegram_chat_id;

        try {
            await apiService.saveProfile({ ...updatedData, id: user.id, avatar_url: newAvatarUrl, telegram_chat_id: telegramChatId });
            setProfileMessage({ type: 'success', text: 'Profil berhasil diperbarui. Beberapa perubahan mungkin memerlukan refresh halaman.' });
            setIsEditing(false);
            setAvatarFile(null); // Clear staged file
        } catch (error: any) {
            setProfileMessage({ type: 'error', text: `Gagal menyimpan profil: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        setPasswordMessage(null);
        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password minimal harus 6 karakter.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Password dan konfirmasi tidak cocok.' });
            return;
        }

        setIsSavingPassword(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            setPasswordMessage({ type: 'error', text: `Gagal mengganti password: ${error.message}` });
        } else {
            setPasswordMessage({ type: 'success', text: 'Password berhasil diganti.' });
            setNewPassword('');
            setConfirmPassword('');
        }
        setIsSavingPassword(false);
    };


    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800">Profil Saya</h1>
            
            {/* Personal Information Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-6 pb-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-700">Informasi Pribadi</h2>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            <PencilIcon className="h-4 w-4" /> Edit Profil
                        </button>
                    )}
                </div>

                {profileMessage && (
                    <div className={`mb-4 p-3 rounded-md text-sm ${profileMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {profileMessage.text}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 flex flex-col items-center">
                        <div className="relative group">
                            <img src={avatarPreview || `https://ui-avatars.com/api/?name=${user.full_name}&background=random`} alt="Profile" className="h-32 w-32 rounded-full object-cover ring-4 ring-gray-200" />
                            <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity">
                                <CameraIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100" />
                            </button>
                            <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleAvatarChange} />
                        </div>
                    </div>
                    
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoField label="Nama Lengkap" value={formData.full_name} disabled />
                        <InfoField label="NIK" name="nik" value={formData.nik || ''} onChange={handleFormChange} disabled={!isEditing} placeholder="Belum diatur" />
                        <InfoField label="Jabatan" value={formData.position} disabled />
                        <InfoField label="Email" name="email" value={formData.email} onChange={handleFormChange} disabled={!isEditing} />
                        <InfoField label="Nomor HP" name="phone_number" value={formData.phone_number || ''} onChange={handleFormChange} disabled={!isEditing} placeholder="Belum diatur" />
                        <InfoField label="Telegram Chat ID" name="telegram_chat_id" value={formData.telegram_chat_id || ''} onChange={handleFormChange} disabled={!isEditing} placeholder="contoh: 123456789" helperText="Dapatkan dari bot Telegram perusahaan dengan kirim /start, lalu salin chat ID Anda." />
                        <InfoField label="Tempat Lahir" name="place_of_birth" value={formData.place_of_birth || ''} onChange={handleFormChange} disabled={!isEditing} placeholder="Belum diatur" />
                        <InfoField type="date" label="Tanggal Lahir" name="date_of_birth" value={formData.date_of_birth || ''} onChange={handleFormChange} disabled={!isEditing} />
                        <InfoField label="Pendidikan Terakhir" name="education_level" value={formData.education_level || ''} onChange={handleFormChange} disabled={!isEditing} placeholder="Belum diatur" />
                        <InfoField label="Jurusan Pendidikan" name="education_major" value={formData.education_major || ''} onChange={handleFormChange} disabled={!isEditing} placeholder="Belum diatur" />
                        <InfoField label="Status" name="employment_status" value={formData.employment_status || ''} onChange={handleFormChange} disabled={!isEditing} placeholder="Contoh: Single / Cerai / Menikah" />
                        <InfoField label="Alamat" name="address" value={formData.address || ''} onChange={handleFormChange} disabled={!isEditing} multiline placeholder="Belum diatur" />
                    </div>
                </div>

                {isEditing && (
                    <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                        <button onClick={() => { setIsEditing(false); setFormData(user); setAvatarPreview(user.avatar_url); setAvatarFile(null); }} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
                        <button onClick={handleSaveProfile} disabled={isSaving} className="w-32 flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">
                            {isSaving ? <Spinner /> : <><SaveIcon className="h-4 w-4 mr-2" /> Simpan</>}
                        </button>
                    </div>
                )}
            </div>

            {/* Password Change Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
                 <h2 className="text-xl font-semibold text-gray-700 mb-4 pb-4 border-b">Ganti Password</h2>
                 {passwordMessage && (
                    <div className={`mb-4 p-3 rounded-md text-sm ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {passwordMessage.text}
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoField type="password" label="Password Baru" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" />
                    <InfoField type="password" label="Konfirmasi Password Baru" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" />
                </div>
                 <div className="mt-6 flex justify-end">
                    <button onClick={handleUpdatePassword} disabled={isSavingPassword || !newPassword} className="w-40 flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400">
                        {isSavingPassword ? <Spinner /> : 'Ganti Password'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const InfoField: React.FC<{
    label: string;
    name?: string;
    value: string;
    type?: string;
    disabled?: boolean;
    placeholder?: string;
    multiline?: boolean;
    helperText?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}> = ({ label, name, value, type = "text", disabled = false, onChange, placeholder, multiline, helperText }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {multiline ? (
            <textarea
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
            />
        ) : (
            <input 
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200 disabled:cursor-not-allowed" 
            />
        )}
        {helperText && <p className="text-[11px] text-gray-500 mt-1">{helperText}</p>}
    </div>
);


export default ProfilSayaPage;
