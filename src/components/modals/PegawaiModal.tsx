"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, UserRole } from '../../types';
import { XIcon } from '../icons';

interface PegawaiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Omit<UserProfile, 'id'> & { id?: string; password?: string }) => void;
    initialData?: UserProfile | null;
    allUsers: UserProfile[];
    positions: string[];
}

export const pegawaiDefaultFormData: Omit<UserProfile, 'id'> = {
    full_name: '',
    nik: '',
    email: '',
    approved: true,
    role: UserRole.USER,
    position: '',
    manager_id: null,
    avatar_url: 'https://i.pravatar.cc/150',
    default_shift: '',
    phone_number: '',
    place_of_birth: '',
    date_of_birth: '',
    education_level: '',
    education_major: '',
    employment_status: '',
    address: '',
};

const PegawaiModal: React.FC<PegawaiModalProps> = ({ isOpen, onClose, onSave, initialData, allUsers, positions }) => {
    const [formData, setFormData] = useState<Omit<UserProfile, 'id'>>(pegawaiDefaultFormData);
    const [password, setPassword] = useState('');

    const isEditing = !!initialData;
    const title = `${isEditing ? 'Edit' : 'Tambah'} Pegawai`;

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || pegawaiDefaultFormData);
            setPassword(''); // Always reset password field
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const potentialManagers = allUsers.filter(u => u.id !== initialData?.id);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave: Omit<UserProfile, 'id'> & { id?: string; password?: string } = {
            ...formData,
        };
        if (isEditing) {
            dataToSave.id = initialData.id;
        } else {
            dataToSave.password = password;
        }
        onSave(dataToSave);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                            </div>
                            <div>
                                <label htmlFor="nik" className="block text-sm font-medium text-gray-700 mb-1">NIK</label>
                                <input type="text" id="nik" name="nik" value={formData.nik || ''} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                        </div>

                        {!isEditing && (
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Set temporary password"
                                    required 
                                />
                            </div>
                        )}

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                                <select id="position" name="position" value={formData.position} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required>
                                    <option value="" disabled>-- Pilih Jabatan --</option>
                                    {positions.map(pos => (
                                        <option key={pos} value={pos}>{pos}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role Sistem</label>
                                <select id="role" name="role" value={formData.role} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                    {Object.values(UserRole).map(role => (
                                        <option key={role} value={role} className="capitalize">{role}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="manager_id" className="block text-sm font-medium text-gray-700 mb-1">Atasan Langsung</label>
                                <select id="manager_id" name="manager_id" value={formData.manager_id || 'null'} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                    <option value="null">-- Tidak Ada Atasan --</option>
                                    {potentialManagers.map(user => (
                                        <option key={user.id} value={user.id}>{user.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="default_shift" className="block text-sm font-medium text-gray-700 mb-1">Shift Default</label>
                                <input type="text" id="default_shift" name="default_shift" value={formData.default_shift || ''} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="place_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                                <input type="text" id="place_of_birth" name="place_of_birth" value={formData.place_of_birth || ''} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                            <div>
                                <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                                <input type="date" id="date_of_birth" name="date_of_birth" value={formData.date_of_birth || ''} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1">Pendidikan Terakhir</label>
                                <input type="text" id="education_level" name="education_level" value={formData.education_level || ''} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                            <div>
                                <label htmlFor="education_major" className="block text-sm font-medium text-gray-700 mb-1">Jurusan Pendidikan</label>
                                <input type="text" id="education_major" name="education_major" value={formData.education_major || ''} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="employment_status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <input type="text" id="employment_status" name="employment_status" value={formData.employment_status || ''} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Contoh: Tetap, Kontrak, Lajang, Menikah" />
                            </div>
                            <div>
                                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
                                <input type="text" id="phone_number" name="phone_number" value={formData.phone_number || ''} onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                            <textarea id="address" name="address" value={formData.address || ''} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" rows={2} />
                        </div>
                        <div>
                            <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700 mb-1">URL Avatar</label>
                            <input type="text" id="avatar_url" name="avatar_url" value={formData.avatar_url} onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Batal
                        </button>
                        <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                            Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PegawaiModal;
