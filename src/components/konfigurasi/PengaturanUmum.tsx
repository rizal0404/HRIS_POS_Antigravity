"use client";

import React, { useEffect, useState } from 'react';
import { CogIcon, LocationMarkerIcon, BellIcon, SaveIcon, PencilIcon, UploadIcon, CheckCircleIcon } from '../icons';
import { supabase } from '@/services/supabase';
import { BRAND_BUCKET, BRAND_LOGO_PATH, getBrandLogoUrl } from '@/lib/branding';

const PengaturanUmum: React.FC = () => {
    const [radius, setRadius] = useState<number>(350);
    const [tempRadius, setTempRadius] = useState<number>(350);
    const [isEditingRadius, setIsEditingRadius] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoMessage, setLogoMessage] = useState<string | null>(null);

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
                <div className="bg-gray-50 rounded-lg p-4 opacity-60">
                     <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-2">
                        <BellIcon className="h-5 w-5"/> Pengaturan Notifikasi
                    </h3>
                     <p className="text-sm text-gray-500 mb-4">Aktifkan atau non-aktifkan notifikasi email/aplikasi untuk berbagai kejadian (segera hadir).</p>
                    <div className="flex items-center justify-between p-3 bg-gray-200 rounded-md">
                        <span className="font-medium text-gray-600">Notifikasi Pengajuan Baru</span>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-not-allowed" disabled/>
                            <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-not-allowed"></label>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PengaturanUmum;
