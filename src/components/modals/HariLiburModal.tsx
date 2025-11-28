"use client";

import React, { useState, useEffect } from 'react';
import { Holiday } from '../../types';
import { XIcon } from '../icons';

interface HariLiburModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (holidayData: Omit<Holiday, 'id'>) => void;
    initialData?: Holiday | null;
}

const HariLiburModal: React.FC<HariLiburModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [date, setDate] = useState('');
    const [name, setName] = useState('');

    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            setDate(initialData?.date || new Date().toISOString().split('T')[0]);
            setName(initialData?.name || '');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const title = `${isEditing ? 'Edit' : 'Tambah'} Hari Libur`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && date) {
            onSave({ date, name: name.trim() });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="holidayDate" className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                            <input
                                type="date"
                                id="holidayDate"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                        <div>
                             <label htmlFor="holidayName" className="block text-sm font-medium text-gray-700 mb-1">Nama Hari Libur</label>
                            <input
                                type="text"
                                id="holidayName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                                placeholder="Cth: Hari Kemerdekaan"
                            />
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Batal
                        </button>
                        <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HariLiburModal;