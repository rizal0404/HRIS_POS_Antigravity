"use client";

import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons';

export type ItemType = 'Departemen' | 'Biro' | 'Seksi';

interface OrganisasiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    itemType: ItemType;
    initialData?: { id: number; name: string };
}

const OrganisasiModal: React.FC<OrganisasiModalProps> = ({ isOpen, onClose, onSave, itemType, initialData }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.name || '');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const isEditing = !!initialData;
    const title = `${isEditing ? 'Edit' : 'Tambah'} ${itemType}`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
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
                    <div className="p-6">
                        <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
                            Nama {itemType}
                        </label>
                        <input
                            type="text"
                            id="itemName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            autoFocus
                        />
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Batal
                        </button>
                        <button type="submit" disabled={!name.trim()} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrganisasiModal;