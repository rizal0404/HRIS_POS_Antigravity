"use client";

import React, { useState, useEffect } from 'react';
import { UserProfile, Shift } from '../../types';
import { XIcon, ChevronDoubleDownIcon } from '../icons';

interface EditShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employeeId: string, date: string, newShift: Shift) => void;
    employee: UserProfile | null;
    date: string | null;
    currentShiftCode: string | null;
    allShifts: Shift[];
}

const EditShiftModal: React.FC<EditShiftModalProps> = ({ isOpen, onClose, onSave, employee, date, currentShiftCode, allShifts }) => {
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && currentShiftCode) {
            const initialShift = allShifts.find(s => s.code === currentShiftCode) || null;
            setSelectedShift(initialShift);
            setIsSaving(false);
        }
    }, [isOpen, currentShiftCode, allShifts]);

    if (!isOpen || !employee || !date) return null;

    const formattedDate = new Date(date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const handleShiftClick = async (shift: Shift) => {
        if (isSaving) return;
        setSelectedShift(shift);
        setIsSaving(true);
        try {
            await onSave(employee.id, date, shift);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">Jadwal Shift</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Karyawan</p>
                        <p className="font-bold text-gray-800">{employee.id.replace('usr-', '0000').toUpperCase()}</p>
                        {/* FIX: Changed fullName to full_name */}
                        <p className="font-bold text-lg text-gray-900">{employee.full_name.toUpperCase()}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-gray-500">Hari, Tanggal</p>
                        <p className="font-semibold text-gray-800">{formattedDate}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Kode Shift</p>
                        <p className="font-bold text-orange-500 text-xl">{selectedShift?.code || 'Pilih Shift'}</p>
                        {/* FIX: Changed startTime and endTime to snake_case */}
                        <p className="text-sm text-gray-600">{selectedShift?.start_time && `${selectedShift.start_time} - ${selectedShift.end_time}`}</p>
                        <p className="text-xs text-gray-500 mt-1">Klik shift di bawah untuk menyimpan otomatis.</p>
                    </div>
                     <div className="text-center">
                        <ChevronDoubleDownIcon className="h-6 w-6 text-gray-400 mx-auto" />
                    </div>
                </div>

                <div className="px-4 pb-4 flex-1 overflow-y-auto max-h-[40vh]">
                    <div className="space-y-2">
                        {allShifts.map(shift => (
                            <button
                                key={shift.code}
                                onClick={() => handleShiftClick(shift)}
                                disabled={isSaving}
                                className={`w-full text-left p-3 rounded-lg text-white font-semibold transition-transform transform hover:scale-105 ${shift.color} ${selectedShift?.code === shift.code ? 'ring-4 ring-offset-2 ring-blue-500' : ''} ${isSaving ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                                <p>{shift.code}</p>
                                {/* FIX: Changed startTime and endTime to snake_case */}
                                {shift.start_time && <p className="text-sm font-normal">{shift.start_time} - {shift.end_time}</p>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 border border-transparent rounded-md text-sm font-medium text-gray-700 hover:bg-gray-300">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditShiftModal;
