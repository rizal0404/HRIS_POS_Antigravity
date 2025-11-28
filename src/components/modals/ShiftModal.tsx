"use client";

import React, { useState, useEffect } from 'react';
import { Shift } from '../../types';
import { XIcon } from '../icons';

interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shift: Shift) => void;
    initialData?: Shift | null;
}

const colors = [
    { name: 'Gray', class: 'bg-gray-500' },
    { name: 'Red', class: 'bg-red-600' },
    { name: 'Orange', class: 'bg-orange-500' },
    { name: 'Yellow', class: 'bg-yellow-500' },
    { name: 'Green', class: 'bg-green-500' },
    { name: 'Teal', class: 'bg-teal-500' },
    { name: 'Blue', class: 'bg-blue-600' },
    { name: 'Indigo', class: 'bg-indigo-600' },
    { name: 'Purple', class: 'bg-purple-600' },
    { name: 'Pink', class: 'bg-pink-600' },
    { name: 'Dark', class: 'bg-gray-800' },
];

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [color, setColor] = useState(colors[0].class);
    const [workDayType, setWorkDayType] = useState<'non-shift' | 'shift'>('shift');
    
    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            setCode(initialData?.code || '');
            setName(initialData?.name || '');
            // FIX: Changed startTime to start_time
            setStartTime(initialData?.start_time || '');
            // FIX: Changed endTime to end_time
            setEndTime(initialData?.end_time || '');
            setColor(initialData?.color || colors[0].class);
            // FIX: Changed workDayType to work_day_type
            setWorkDayType(initialData?.work_day_type || 'shift');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const title = `${isEditing ? 'Edit' : 'Tambah'} Shift Kerja`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isOffShift = name.toUpperCase() === 'OFF' || code.toUpperCase() === 'OFF';
        if (code.trim() && name.trim()) {
            // FIX: Changed property names to snake_case and send null for OFF shifts
            onSave({ 
                code: code.trim(), 
                name: name.trim(), 
                start_time: isOffShift ? null : startTime, 
                end_time: isOffShift ? null : endTime, 
                color,
                work_day_type: workDayType,
            });
        }
    };

    const isOffShift = name.toUpperCase() === 'OFF' || code.toUpperCase() === 'OFF';

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
                            <label htmlFor="shiftCode" className="block text-sm font-medium text-gray-700 mb-1">Kode Shift</label>
                            <input type="text" id="shiftCode" value={code} onChange={(e) => setCode(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="shiftName" className="block text-sm font-medium text-gray-700 mb-1">Nama Shift</label>
                            <input type="text" id="shiftName" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Jam Masuk</label>
                                <input type="time" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isOffShift}
                                    required={!isOffShift}
                                />
                            </div>
                             <div>
                                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">Jam Pulang</label>
                                <input type="time" id="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isOffShift}
                                    required={!isOffShift}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="workDayType" className="block text-sm font-medium text-gray-700 mb-1">Jenis Hari Kerja</label>
                            <select 
                                id="workDayType" 
                                value={workDayType} 
                                onChange={(e) => setWorkDayType(e.target.value as 'non-shift' | 'shift')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="shift">Shift (6 hari kerja)</option>
                                <option value="non-shift">Non-Shift (5 hari kerja)</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Warna Label</label>
                            <div className="flex flex-wrap gap-2">
                                {colors.map(c => (
                                    <button
                                        key={c.class}
                                        type="button"
                                        onClick={() => setColor(c.class)}
                                        className={`h-8 w-8 rounded-full ${c.class} ${color === c.class ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                                        aria-label={`Select color ${c.name}`}
                                    ></button>
                                ))}
                            </div>
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

export default ShiftModal;