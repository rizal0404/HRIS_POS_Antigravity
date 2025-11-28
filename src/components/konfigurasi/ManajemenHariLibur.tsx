"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Holiday } from '../../types';
import { apiService } from '../../services/apiService';
import { PlusCircleIcon, PencilIcon, TrashIcon, CalendarIcon } from '../icons';
import HariLiburModal from '../modals/HariLiburModal';
import ConfirmationModal from '../modals/ConfirmationModal';

const ManajemenHariLibur: React.FC = () => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Holiday | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.getHolidays();
            setHolidays(data);
        } catch (error) {
            console.error("Failed to fetch holidays:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays]);

    const openModal = (holiday: Holiday | null = null) => {
        setEditingHoliday(holiday);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingHoliday(null);
    };

    const handleSaveHoliday = async (holidayData: Omit<Holiday, 'id'>) => {
        const payload = editingHoliday ? { ...holidayData, id: editingHoliday.id } : holidayData;
        await apiService.saveHoliday(payload as Partial<Holiday>);
        fetchHolidays();
        closeModal();
    };
    
    const requestDeleteHoliday = (holiday: Holiday) => {
        setItemToDelete(holiday);
        setConfirmOpen(true);
    };
    
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await apiService.deleteHoliday(itemToDelete.id);
            await fetchHolidays();
        } catch (error) {
            console.error("Failed to delete holiday:", error);
        } finally {
            setIsDeleting(false);
            setConfirmOpen(false);
            setItemToDelete(null);
        }
    };
    
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    return (
        <>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-8 w-8 text-slate-700" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Manajemen Hari Libur Nasional</h2>
                        <p className="text-sm text-gray-500">Kelola tanggal merah dan cuti bersama.</p>
                    </div>
                </div>
                <button onClick={() => openModal()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Tambah Hari Libur
                </button>
            </div>
            
            {loading ? <p>Memuat hari libur...</p> : (
            <div className="space-y-3">
                {holidays.map(holiday => (
                    <div key={holiday.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between group">
                        <div>
                            <p className="font-bold text-gray-800">{holiday.name}</p>
                            <p className="text-sm text-gray-600">{formatDate(holiday.date)}</p>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(holiday)} className="p-1 text-gray-500 hover:text-blue-600">
                                <PencilIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => requestDeleteHoliday(holiday)} className="p-1 text-gray-500 hover:text-red-600">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            )}

            {isModalOpen && (
                <HariLiburModal 
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveHoliday}
                    initialData={editingHoliday}
                />
            )}
        </div>
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Hapus Hari Libur"
            isConfirming={isDeleting}
        >
            <p>Anda yakin ingin menghapus hari libur <strong>{itemToDelete?.name}</strong>?</p>
        </ConfirmationModal>
        </>
    );
};

export default ManajemenHariLibur;