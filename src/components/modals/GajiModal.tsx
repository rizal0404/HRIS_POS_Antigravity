
"use client";

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { XIcon } from '../icons';

interface GajiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newSalary: UserProfile['salary']) => void;
    user: UserProfile;
}

const GajiModal: React.FC<GajiModalProps> = ({ isOpen, onClose, onSave, user }) => {
    const [gajiPokok, setGajiPokok] = useState(0);
    const [tunjanganJabatan, setTunjanganJabatan] = useState(0);
    const [tunjanganLain, setTunjanganLain] = useState(0);

    useEffect(() => {
        if (isOpen && user.salary) {
            setGajiPokok(user.salary.gaji_pokok);
            setTunjanganJabatan(user.salary.tunjangan_jabatan);
            setTunjanganLain(user.salary.tunjangan_lain);
        } else if (isOpen) {
            setGajiPokok(0);
            setTunjanganJabatan(0);
            setTunjanganLain(0);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            gaji_pokok: gajiPokok,
            tunjangan_jabatan: tunjanganJabatan,
            tunjangan_lain: tunjanganLain
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                    {/* FIX: Changed user.fullName to user.full_name */}
                    <h3 className="text-xl font-semibold text-gray-800">Atur Gaji: {user.full_name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="gajiPokok" className="block text-sm font-medium text-gray-700 mb-1">Gaji Pokok</label>
                            <input
                                type="number"
                                id="gajiPokok"
                                value={gajiPokok}
                                onChange={(e) => setGajiPokok(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                         <div>
                            <label htmlFor="tunjanganJabatan" className="block text-sm font-medium text-gray-700 mb-1">Tunjangan Jabatan</label>
                            <input
                                type="number"
                                id="tunjanganJabatan"
                                value={tunjanganJabatan}
                                onChange={(e) => setTunjanganJabatan(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                         <div>
                            <label htmlFor="tunjanganLain" className="block text-sm font-medium text-gray-700 mb-1">Tunjangan Lainnya</label>
                            <input
                                type="number"
                                id="tunjanganLain"
                                value={tunjanganLain}
                                onChange={(e) => setTunjanganLain(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Batal
                        </button>
                        <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                            Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GajiModal;
