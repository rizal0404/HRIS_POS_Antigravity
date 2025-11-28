"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { OvertimeConfiguration } from '../../types';
import { apiService } from '../../services/apiService';
import { CalculatorIcon, PencilIcon, SaveIcon } from '../icons';

const InfoRow: React.FC<{ label: string, value: React.ReactNode, unit?: string }> = ({ label, value, unit }) => (
    <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-lg text-gray-800">{value} <span className="text-base font-normal text-gray-600">{unit}</span></p>
    </div>
);

const InputRow: React.FC<{ label: string, value: number, onChange: (val: number) => void, unit?: string, step?: number }> = ({ label, value, onChange, unit, step = 0.1 }) => (
     <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 flex items-center">
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                step={step}
            />
            {unit && <span className="ml-3 text-gray-500 text-sm">{unit}</span>}
        </div>
    </div>
);

const ManajemenUpahLembur: React.FC = () => {
    const [config, setConfig] = useState<OvertimeConfiguration | null>(null);
    const [tempConfig, setTempConfig] = useState<OvertimeConfiguration | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            let data = await apiService.getOvertimeConfiguration();
            
            if (!data) {
                console.log("No overtime configuration found. Creating default based on regulations.");
                const defaultConfig: Omit<OvertimeConfiguration, 'id'> = {
                    hourly_wage_divider: 173,
                    max_hours_per_day: 4,
                    // FIX: Changed property names from weekly to monthly and updated values to reflect a monthly quota.
                    max_hours_per_month_non_shift: 72,
                    max_hours_per_month_shift: 72,
                    normal_day: { first_hour_multiplier: 1.5, subsequent_hours_multiplier: 2.0 },
                    non_shift: { first_eight_hours_multiplier: 2.0, ninth_hour_multiplier: 3.0, tenth_to_twelfth_hour_multiplier: 4.0 },
                    shift: { first_seven_hours_multiplier: 2.0, eighth_hour_multiplier: 3.0, ninth_to_eleventh_hour_multiplier: 4.0 },
                };
                data = await apiService.saveOvertimeConfiguration(defaultConfig);
            }

            setConfig(data);
            setTempConfig(data);
        } catch (error) {
            console.error("Failed to fetch or create overtime configuration:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleEdit = () => {
        setTempConfig(config);
        setIsEditing(true);
    };
    
    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (tempConfig) {
            try {
                await apiService.saveOvertimeConfiguration(tempConfig);
                fetchConfig(); // Re-fetch to confirm
            } catch (error) {
                 console.error("Failed to save overtime configuration:", error);
            } finally {
                setIsEditing(false);
            }
        }
    };
    
    const renderViewMode = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <InfoRow label="Rumus Upah Per Jam" value={`1 / ${config!.hourly_wage_divider}`} unit="x Upah Sebulan" />
            </div>
            
            <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-600 mb-2">Tarif Lembur Hari Kerja Normal (Berlaku untuk Semua Karyawan)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Jam Lembur Ke-1" value={`${config!.normal_day.first_hour_multiplier}x`} unit="Upah Sejam" />
                    <InfoRow label="Jam Lembur Ke-2 dst." value={`${config!.normal_day.subsequent_hours_multiplier}x`} unit="Upah Sejam" />
                </div>
            </div>

            <div className="border-t pt-4">
                 <h4 className="font-semibold text-gray-600 mb-2">Tarif Lembur Hari Libur - Karyawan Non-Shift (5 Hari Kerja)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InfoRow label="Jam 1-8" value={`${config!.non_shift.first_eight_hours_multiplier}x`} unit="Upah Sejam" />
                    <InfoRow label="Jam 9" value={`${config!.non_shift.ninth_hour_multiplier}x`} unit="Upah Sejam" />
                    <InfoRow label="Jam 10-12" value={`${config!.non_shift.tenth_to_twelfth_hour_multiplier}x`} unit="Upah Sejam" />
                </div>
            </div>

             <div className="border-t pt-4">
                 <h4 className="font-semibold text-gray-600 mb-2">Tarif Lembur Hari Libur - Karyawan Shift (6 Hari Kerja)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InfoRow label="Jam 1-7" value={`${config!.shift.first_seven_hours_multiplier}x`} unit="Upah Sejam" />
                    <InfoRow label="Jam 8" value={`${config!.shift.eighth_hour_multiplier}x`} unit="Upah Sejam" />
                    <InfoRow label="Jam 9-11" value={`${config!.shift.ninth_to_eleventh_hour_multiplier}x`} unit="Upah Sejam" />
                </div>
            </div>
        </div>
    );
    
    const renderEditMode = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <InputRow label="Pembagi Upah per Jam" value={tempConfig!.hourly_wage_divider} onChange={val => setTempConfig({...tempConfig!, hourly_wage_divider: val})} unit="dari upah sebulan" step={1} />
            </div>

            <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-600 mb-2">Tarif Lembur Hari Kerja Normal (Berlaku untuk Semua Karyawan)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputRow label="Pengali Jam ke-1" value={tempConfig!.normal_day.first_hour_multiplier} onChange={val => setTempConfig({...tempConfig!, normal_day: {...tempConfig!.normal_day, first_hour_multiplier: val}})} unit="x Upah Sejam" />
                    <InputRow label="Pengali Jam ke-2 dst." value={tempConfig!.normal_day.subsequent_hours_multiplier} onChange={val => setTempConfig({...tempConfig!, normal_day: {...tempConfig!.normal_day, subsequent_hours_multiplier: val}})} unit="x Upah Sejam" />
                </div>
            </div>
            
             <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-600 mb-2">Tarif Lembur Hari Libur - Karyawan Non-Shift (5 Hari Kerja)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputRow label="Pengali Jam 1-8" value={tempConfig!.non_shift.first_eight_hours_multiplier} onChange={val => setTempConfig({...tempConfig!, non_shift: {...tempConfig!.non_shift, first_eight_hours_multiplier: val}})} unit="x Upah Sejam" />
                    <InputRow label="Pengali Jam 9" value={tempConfig!.non_shift.ninth_hour_multiplier} onChange={val => setTempConfig({...tempConfig!, non_shift: {...tempConfig!.non_shift, ninth_hour_multiplier: val}})} unit="x Upah Sejam" />
                    <InputRow label="Pengali Jam 10-12" value={tempConfig!.non_shift.tenth_to_twelfth_hour_multiplier} onChange={val => setTempConfig({...tempConfig!, non_shift: {...tempConfig!.non_shift, tenth_to_twelfth_hour_multiplier: val}})} unit="x Upah Sejam" />
                </div>
            </div>

            <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-600 mb-2">Tarif Lembur Hari Libur - Karyawan Shift (6 Hari Kerja)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputRow label="Pengali Jam 1-7" value={tempConfig!.shift.first_seven_hours_multiplier} onChange={val => setTempConfig({...tempConfig!, shift: {...tempConfig!.shift, first_seven_hours_multiplier: val}})} unit="x Upah Sejam" />
                    <InputRow label="Pengali Jam 8" value={tempConfig!.shift.eighth_hour_multiplier} onChange={val => setTempConfig({...tempConfig!, shift: {...tempConfig!.shift, eighth_hour_multiplier: val}})} unit="x Upah Sejam" />
                    <InputRow label="Pengali Jam 9-11" value={tempConfig!.shift.ninth_to_eleventh_hour_multiplier} onChange={val => setTempConfig({...tempConfig!, shift: {...tempConfig!.shift, ninth_to_eleventh_hour_multiplier: val}})} unit="x Upah Sejam" />
                </div>
            </div>
        </div>
    );


    return (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div className="flex items-center space-x-3">
                    <CalculatorIcon className="h-8 w-8 text-slate-700" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Perhitungan Upah Lembur</h2>
                        <p className="text-sm text-gray-500">Atur parameter dan pengali untuk perhitungan upah lembur sesuai regulasi.</p>
                    </div>
                </div>
                {!isEditing && (
                    <button onClick={handleEdit} disabled={loading || !config} className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                        <PencilIcon className="h-4 w-4 mr-1.5" />
                        Edit Konfigurasi
                    </button>
                )}
            </div>
            
            {loading ? (
                <div className="text-center p-4">Memuat konfigurasi...</div>
            ) : !config ? (
                <div className="bg-white border rounded-lg p-4 text-sm text-gray-500">
                    Konfigurasi perhitungan upah lembur belum diatur.
                </div>
            ) : (
                <>
                    <div className="bg-gray-50 rounded-lg p-4">
                        {isEditing ? renderEditMode() : renderViewMode()}
                    </div>
                    {isEditing && (
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Batal
                            </button>
                            <button onClick={handleSave} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                                <SaveIcon className="h-4 w-4 mr-2" />
                                Simpan Perubahan
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ManajemenUpahLembur;