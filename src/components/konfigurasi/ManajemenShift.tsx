"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Shift } from '../../types';
import { apiService } from '../../services/apiService';
import { PlusCircleIcon, PencilIcon, TrashIcon, ClockIcon } from '../icons';
import ShiftModal from '../modals/ShiftModal';
import ConfirmationModal from '../modals/ConfirmationModal';

const ManajemenShift: React.FC = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);

    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchShifts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.getShifts();
            setShifts(data);
        } catch (error) {
            console.error("Failed to fetch shifts:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    const openModal = (shift: Shift | null = null) => {
        setEditingShift(shift);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingShift(null);
    };

    const handleSaveShift = async (shiftData: Shift) => {
        try {
            await apiService.saveShift(shiftData);
            fetchShifts();
        } catch (error) {
            console.error("Failed to save shift:", error);
        } finally {
            closeModal();
        }
    };
    
    const requestDeleteShift = (shift: Shift) => {
        setShiftToDelete(shift);
        setConfirmOpen(true);
    };

    const handleConfirmDeleteShift = async () => {
        if (!shiftToDelete) return;
        setIsDeleting(true);
        try {
            await apiService.deleteShift(shiftToDelete.code);
            await fetchShifts();
        } catch (error: any) {
            console.error("Failed to delete shift:", error);
            if (error.message && error.message.includes('fallback "OFF" shift does not exist')) {
                alert('Gagal menghapus shift. Shift "OFF" tidak ditemukan. Harap buat shift dengan kode "OFF" terlebih dahulu sebagai fallback.');
            } else {
                 alert(`Gagal menghapus shift. Terjadi kesalahan: ${error.message}`);
            }
        } finally {
            setIsDeleting(false);
            setConfirmOpen(false);
            setShiftToDelete(null);
        }
    };

    return (
        <>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div className="flex items-center space-x-3">
                    <ClockIcon className="h-8 w-8 text-slate-700" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Manajemen Shift Kerja</h2>
                        <p className="text-sm text-gray-500">Kelola semua jenis shift kerja yang tersedia.</p>
                    </div>
                </div>
                <button onClick={() => openModal()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Tambah Shift
                </button>
            </div>
            {loading ? <p>Memuat data shift...</p> : (
            <div className="space-y-3">
                {shifts.map(shift => (
                    <div key={shift.code} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between group">
                        <div className="flex items-center space-x-4">
                            <span className={`h-8 w-2 rounded-full ${shift.color}`}></span>
                            <div>
                                <p className="font-bold text-gray-800">{shift.name} <span className="text-gray-500 font-normal">({shift.code})</span></p>
                                <p className="text-sm text-gray-600">
                                    {shift.start_time ? `${shift.start_time} - ${shift.end_time}` : 'Hari Libur'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(shift)} className="p-1 text-gray-500 hover:text-blue-600">
                                <PencilIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => requestDeleteShift(shift)} className="p-1 text-gray-500 hover:text-red-600">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            )}
            {isModalOpen && (
                <ShiftModal 
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveShift}
                    initialData={editingShift}
                />
            )}
        </div>
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirmDeleteShift}
            title="Hapus Shift"
            isConfirming={isDeleting}
        >
            <p>Anda yakin ingin menghapus shift <strong>{shiftToDelete?.name} ({shiftToDelete?.code})</strong>?</p>
            <p className="mt-2 text-sm text-yellow-600">
                Semua jadwal kerja yang saat ini menggunakan shift ini akan otomatis diubah menjadi shift "OFF".
            </p>
            <p className="font-semibold mt-2">Tindakan ini tidak dapat diurungkan.</p>
        </ConfirmationModal>
        </>
    );
};

export default ManajemenShift;