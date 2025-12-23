"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { DisciplineConfigurationDB, DEFAULT_DISCIPLINE_CONFIG } from '../../types/discipline';
import { disciplineService } from '../../services/discipline';
import { BriefcaseIcon, SaveIcon, PencilIcon, RefreshIcon } from '../icons';
import Spinner from '../ui/Spinner';

const ManajemenSkorDisiplin: React.FC = () => {
    const [config, setConfig] = useState<DisciplineConfigurationDB | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tempConfig, setTempConfig] = useState<Partial<DisciplineConfigurationDB>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            const data = await disciplineService.getDisciplineConfiguration();
            setConfig(data);
            setTempConfig(data || DEFAULT_DISCIPLINE_CONFIG);
        } catch (error) {
            console.error("Failed to fetch discipline config:", error);
            setMessage({ type: 'error', text: 'Gagal memuat konfigurasi.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const updated = await disciplineService.updateDisciplineConfiguration({
                late_penalty: tempConfig.late_penalty,
                early_leave_penalty: tempConfig.early_leave_penalty,
                wrong_location_penalty: tempConfig.wrong_location_penalty,
                correction_penalty: tempConfig.correction_penalty,
                base_score: tempConfig.base_score,
            });
            setConfig(updated);
            setIsEditing(false);
            setMessage({ type: 'success', text: 'Konfigurasi berhasil disimpan!' });
            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error("Failed to save discipline config:", error);
            setMessage({ type: 'error', text: 'Gagal menyimpan konfigurasi.' });
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field: keyof DisciplineConfigurationDB, value: number) => {
        setTempConfig(prev => ({
            ...prev,
            [field]: Math.max(0, value), // Ensure non-negative
        }));
    };

    const handleCancel = () => {
        setTempConfig(config || DEFAULT_DISCIPLINE_CONFIG);
        setIsEditing(false);
    };

    const configItems = [
        { key: 'late_penalty', label: 'Penalti Terlambat', description: 'Poin dikurangi per kejadian terlambat', icon: '🕐' },
        { key: 'early_leave_penalty', label: 'Penalti Pulang Cepat', description: 'Poin dikurangi per kejadian pulang cepat', icon: '🚪' },
        { key: 'wrong_location_penalty', label: 'Penalti Lokasi Salah', description: 'Poin dikurangi per absen di luar area kerja', icon: '📍' },
        { key: 'correction_penalty', label: 'Penalti Koreksi Absen', description: 'Poin dikurangi per pengajuan koreksi absensi', icon: '✏️' },
        { key: 'base_score', label: 'Skor Dasar', description: 'Skor awal sebelum dikurangi penalti', icon: '💯' },
    ];

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-2">
                    <Spinner className="w-5 h-5" />
                    <span className="text-slate-600 dark:text-slate-400">Memuat konfigurasi...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <BriefcaseIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Konfigurasi Skor Disiplin</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Atur nilai penalti untuk perhitungan skor disiplin karyawan.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchConfig}
                        disabled={loading}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshIcon className="w-5 h-5" />
                    </button>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                        >
                            <PencilIcon className="h-4 w-4 mr-1.5" />
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Configuration Items */}
            <div className="space-y-4">
                {configItems.map((item) => (
                    <div
                        key={item.key}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{item.icon}</span>
                            <div>
                                <p className="font-medium text-slate-800 dark:text-white">{item.label}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={tempConfig[item.key as keyof DisciplineConfigurationDB] as number || 0}
                                        onChange={(e) => handleInputChange(item.key as keyof DisciplineConfigurationDB, Number(e.target.value))}
                                        className="w-20 px-3 py-2 text-center border border-slate-300 dark:border-slate-500 rounded-md shadow-sm bg-white dark:bg-slate-600 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {item.key === 'base_score' ? 'poin' : 'poin/x'}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className={`text-2xl font-bold ${item.key === 'base_score' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {item.key === 'base_score' ? '' : '-'}
                                        {(config?.[item.key as keyof DisciplineConfigurationDB] as number) ?? DEFAULT_DISCIPLINE_CONFIG[item.key as keyof typeof DEFAULT_DISCIPLINE_CONFIG]}
                                    </span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                        {item.key === 'base_score' ? 'poin' : 'poin/x'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            {isEditing && (
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? (
                            <>
                                <Spinner className="w-4 h-4 mr-2" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <SaveIcon className="h-4 w-4 mr-2" />
                                Simpan Konfigurasi
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                    <strong>ℹ️ Cara Perhitungan:</strong> Skor disiplin dihitung dengan mengurangi skor dasar
                    dengan total penalti dari setiap pelanggaran. Formula: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">
                        Skor = Skor Dasar - (Terlambat × Penalti) - (Pulang Cepat × Penalti) - ...</code>
                </p>
            </div>
        </div>
    );
};

export default ManajemenSkorDisiplin;
