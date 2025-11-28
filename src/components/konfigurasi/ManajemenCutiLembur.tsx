"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { LeaveType, OvertimeConfiguration } from '../../types';
import { apiService } from '../../services/apiService';
import { PlusCircleIcon, PencilIcon, TrashIcon, BriefcaseIcon, ClockIcon, SaveIcon } from '../icons';
import CutiModal from '../modals/CutiModal';
import ConfirmationModal from '../modals/ConfirmationModal';

const ManajemenCutiLembur: React.FC = () => {
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [overtimeConfig, setOvertimeConfig] = useState<OvertimeConfiguration | null>(null);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
    const [isEditingOvertime, setIsEditingOvertime] = useState(false);
    const [tempOvertimeConfig, setTempOvertimeConfig] = useState<OvertimeConfiguration | null>(null);

    // Confirmation Modal State
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<LeaveType | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [leaves, overtime] = await Promise.all([
                apiService.getLeaveTypes(),
                apiService.getOvertimeConfiguration()
            ]);
            setLeaveTypes(leaves);

            let configToSet = overtime;
            if (!configToSet) {
                console.log("No overtime configuration found. Creating default based on regulations.");
                const defaultConfig: Omit<OvertimeConfiguration, 'id'> = {
                    hourly_wage_divider: 173,
                    max_hours_per_day: 4,
                    max_hours_per_month_non_shift: 72, // 18 jam/minggu * 4 minggu
                    max_hours_per_month_shift: 72,
                    normal_day: { first_hour_multiplier: 1.5, subsequent_hours_multiplier: 2.0 },
                    non_shift: { first_eight_hours_multiplier: 2.0, ninth_hour_multiplier: 3.0, tenth_to_twelfth_hour_multiplier: 4.0 },
                    shift: { first_seven_hours_multiplier: 2.0, eighth_hour_multiplier: 3.0, ninth_to_eleventh_hour_multiplier: 4.0 },
                };
                configToSet = await apiService.saveOvertimeConfiguration(defaultConfig);
            }

            setOvertimeConfig(configToSet);
            setTempOvertimeConfig(configToSet);
        } catch (error) {
            console.error("Failed to fetch leave/overtime config:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openModal = (leaveType: LeaveType | null = null) => {
        setEditingLeaveType(leaveType);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLeaveType(null);
    };

    const handleSaveLeaveType = async (leaveData: Omit<LeaveType, 'id'>) => {
        const payload = editingLeaveType ? { ...leaveData, id: editingLeaveType.id } : leaveData;
        await apiService.saveLeaveType(payload as Partial<LeaveType>);
        fetchData();
        closeModal();
    };
    
    const requestDeleteLeaveType = (leaveType: LeaveType) => {
        setItemToDelete(leaveType);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await apiService.deleteLeaveType(itemToDelete.id);
            await fetchData();
        } catch (error) {
            console.error("Failed to delete leave type:", error);
        } finally {
            setIsDeleting(false);
            setConfirmOpen(false);
            setItemToDelete(null);
        }
    };
    
    const handleSaveOvertime = async () => {
        if (tempOvertimeConfig) {
            await apiService.saveOvertimeConfiguration(tempOvertimeConfig);
            fetchData();
            setIsEditingOvertime(false);
        }
    };
    
    const handleCancelEditOvertime = () => {
        setTempOvertimeConfig(overtimeConfig);
        setIsEditingOvertime(false);
    }

    if (loading) {
        return <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">Memuat konfigurasi...</div>;
    }

    return (
        <>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b">
                <BriefcaseIcon className="h-8 w-8 text-slate-700" />
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Manajemen Cuti & Lembur</h2>
                    <p className="text-sm text-gray-500">Kelola tipe cuti, kuota, dan batas lembur.</p>
                </div>
            </div>

            {/* Cuti Section */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Tipe Cuti & Kuota</h3>
                    <button onClick={() => openModal()} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        <PlusCircleIcon className="h-4 w-4 mr-1.5" />
                        Tambah Cuti
                    </button>
                </div>
                <div className="space-y-3">
                    {leaveTypes.map(leave => (
                        <div key={leave.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between group">
                            <div>
                                <p className="font-bold text-gray-800">{leave.name}</p>
                                <p className="text-sm text-gray-600">Kuota Default: {leave.default_quota} hari/tahun</p>
                            </div>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(leave)} className="p-1 text-gray-500 hover:text-blue-600"><PencilIcon className="h-4 w-4" /></button>
                                <button onClick={() => requestDeleteLeaveType(leave)} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Lembur Section */}
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><ClockIcon className="h-5 w-5"/> Batas Maksimal Lembur</h3>
                     {!isEditingOvertime && (
                        <button onClick={() => { setTempOvertimeConfig(overtimeConfig); setIsEditingOvertime(true); }} className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            <PencilIcon className="h-4 w-4 mr-1.5" />
                            Edit
                        </button>
                    )}
                </div>
                <div className="bg-white border rounded-lg p-4">
                    {isEditingOvertime && tempOvertimeConfig ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Maksimal per Hari (Jam)</label>
                                    <input 
                                        type="number" 
                                        value={tempOvertimeConfig.max_hours_per_day}
                                        onChange={(e) => setTempOvertimeConfig(prev => prev ? {...prev, max_hours_per_day: Number(e.target.value)} : null)}
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Maks. Bulanan (Non-Shift)</label>
                                    <input 
                                        type="number" 
                                        value={tempOvertimeConfig.max_hours_per_month_non_shift}
                                        onChange={(e) => setTempOvertimeConfig(prev => prev ? {...prev, max_hours_per_month_non_shift: Number(e.target.value)} : null)}
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Maks. Bulanan (Shift)</label>
                                    <input 
                                        type="number" 
                                        value={tempOvertimeConfig.max_hours_per_month_shift}
                                        onChange={(e) => setTempOvertimeConfig(prev => prev ? {...prev, max_hours_per_month_shift: Number(e.target.value)} : null)}
                                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 border-t pt-4">
                                <button onClick={handleCancelEditOvertime} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Batal
                                </button>
                                <button onClick={handleSaveOvertime} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                                    <SaveIcon className="h-4 w-4 mr-2" />
                                    Simpan Kuota
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Maksimal per Hari (Jam)</label>
                                <p className="font-bold text-lg text-gray-800">{overtimeConfig?.max_hours_per_day || 0} Jam</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500">Maks. per Bulan (Non-Shift)</label>
                                <p className="font-bold text-lg text-gray-800">{overtimeConfig?.max_hours_per_month_non_shift || 0} Jam</p>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-500">Maks. per Bulan (Shift)</label>
                                <p className="font-bold text-lg text-gray-800">{overtimeConfig?.max_hours_per_month_shift || 0} Jam</p>
                            </div>
                        </div>
                    )}
                </div>
                {!isEditingOvertime && (!overtimeConfig || (overtimeConfig.max_hours_per_day === 0 && overtimeConfig.max_hours_per_month_non_shift === 0 && overtimeConfig.max_hours_per_month_shift === 0)) && (
                    <div className="bg-white border rounded-lg p-4 mt-2 text-sm text-gray-500">
                        Konfigurasi lembur belum diatur.
                    </div>
                )}
            </div>

            {isModalOpen && (
                <CutiModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveLeaveType}
                    initialData={editingLeaveType}
                />
            )}
        </div>
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Hapus Tipe Cuti"
            isConfirming={isDeleting}
        >
            <p>Anda yakin ingin menghapus tipe cuti <strong>{itemToDelete?.name}</strong>?</p>
        </ConfirmationModal>
        </>
    );
};

export default ManajemenCutiLembur;