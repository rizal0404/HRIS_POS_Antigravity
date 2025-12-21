"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Workplace } from '../../types';
import { disciplineService } from '../../services/discipline';
import { PlusCircleIcon, PencilIcon, TrashIcon, LocationMarkerIcon } from '../icons';
import ConfirmationModal from '../modals/ConfirmationModal';

interface WorkplaceFormData {
    name: string;
    latitude: string;
    longitude: string;
    radius_meters: string;
    is_active: boolean;
}

const initialFormData: WorkplaceFormData = {
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '350',
    is_active: true,
};

const ManajemenLokasiKerja: React.FC = () => {
    const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorkplace, setEditingWorkplace] = useState<Workplace | null>(null);
    const [formData, setFormData] = useState<WorkplaceFormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [workplaceToDelete, setWorkplaceToDelete] = useState<Workplace | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchWorkplaces = useCallback(async () => {
        setLoading(true);
        try {
            const data = await disciplineService.getAllWorkplaces(false); // Include inactive
            setWorkplaces(data);
        } catch (error) {
            console.error("Failed to fetch workplaces:", error);
            setError("Gagal memuat data lokasi kerja");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkplaces();
    }, [fetchWorkplaces]);

    const openModal = (workplace: Workplace | null = null) => {
        if (workplace) {
            setEditingWorkplace(workplace);
            setFormData({
                name: workplace.name,
                latitude: workplace.latitude.toString(),
                longitude: workplace.longitude.toString(),
                radius_meters: workplace.radius_meters.toString(),
                is_active: workplace.is_active,
            });
        } else {
            setEditingWorkplace(null);
            setFormData(initialFormData);
        }
        setError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingWorkplace(null);
        setFormData(initialFormData);
        setError(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const data = {
                name: formData.name.trim(),
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                radius_meters: parseInt(formData.radius_meters, 10),
                is_active: formData.is_active,
            };

            if (isNaN(data.latitude) || isNaN(data.longitude)) {
                throw new Error('Koordinat tidak valid');
            }

            if (editingWorkplace) {
                await disciplineService.updateWorkplace(editingWorkplace.id, data);
            } else {
                await disciplineService.createWorkplace(data);
            }

            await fetchWorkplaces();
            closeModal();
        } catch (err: any) {
            console.error("Failed to save workplace:", err);
            setError(err.message || 'Gagal menyimpan lokasi kerja');
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestDelete = (workplace: Workplace) => {
        setWorkplaceToDelete(workplace);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!workplaceToDelete) return;
        setIsDeleting(true);
        try {
            await disciplineService.deleteWorkplace(workplaceToDelete.id);
            await fetchWorkplaces();
        } catch (error) {
            console.error("Failed to delete workplace:", error);
            alert('Gagal menghapus lokasi kerja');
        } finally {
            setIsDeleting(false);
            setConfirmOpen(false);
            setWorkplaceToDelete(null);
        }
    };

    const openInGoogleMaps = (lat: number, lon: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <div className="flex items-center space-x-3">
                        <LocationMarkerIcon className="h-8 w-8 text-emerald-600" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Manajemen Lokasi Kerja</h2>
                            <p className="text-sm text-gray-500">Kelola lokasi kantor untuk validasi presensi dan perhitungan disiplin.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
                    >
                        <PlusCircleIcon className="h-5 w-5 mr-2" />
                        Tambah Lokasi
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        <span className="ml-3 text-gray-500">Memuat data lokasi...</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {workplaces.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">Belum ada lokasi kerja terdaftar.</p>
                        ) : (
                            workplaces.map(workplace => (
                                <div
                                    key={workplace.id}
                                    className={`rounded-lg p-4 flex items-center justify-between group transition-all ${workplace.is_active
                                        ? 'bg-gray-50 hover:bg-gray-100'
                                        : 'bg-red-50 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${workplace.is_active ? 'bg-emerald-100' : 'bg-red-100'
                                            }`}>
                                            <LocationMarkerIcon className={`h-5 w-5 ${workplace.is_active ? 'text-emerald-600' : 'text-red-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">
                                                {workplace.name}
                                                {!workplace.is_active && (
                                                    <span className="ml-2 text-xs text-red-500 font-normal">(Nonaktif)</span>
                                                )}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {workplace.latitude.toFixed(6)}, {workplace.longitude.toFixed(6)}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Radius toleransi: <strong>{workplace.radius_meters}m</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openInGoogleMaps(workplace.latitude, workplace.longitude)}
                                            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50"
                                            title="Lihat di Google Maps"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => openModal(workplace)}
                                            className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50"
                                            title="Edit"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => requestDelete(workplace)}
                                            className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
                                            title="Hapus"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {editingWorkplace ? 'Edit Lokasi Kerja' : 'Tambah Lokasi Kerja Baru'}
                        </h3>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nama Lokasi
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Contoh: Kantor Pusat"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Latitude
                                    </label>
                                    <input
                                        type="text"
                                        name="latitude"
                                        value={formData.latitude}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="-4.78831"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Longitude
                                    </label>
                                    <input
                                        type="text"
                                        name="longitude"
                                        value={formData.longitude}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="119.6165"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Radius Toleransi (meter)
                                </label>
                                <input
                                    type="number"
                                    name="radius_meters"
                                    value={formData.radius_meters}
                                    onChange={handleInputChange}
                                    required
                                    min="50"
                                    max="1000"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Jarak maksimal dari titik lokasi untuk presensi dianggap valid
                                </p>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                                />
                                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                                    Lokasi aktif
                                </label>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Nonaktifkan Lokasi"
                isConfirming={isDeleting}
            >
                <p>
                    Anda yakin ingin menonaktifkan lokasi <strong>{workplaceToDelete?.name}</strong>?
                </p>
                <p className="mt-2 text-sm text-yellow-600">
                    Lokasi yang dinonaktifkan tidak akan digunakan untuk validasi presensi.
                </p>
            </ConfirmationModal>
        </>
    );
};

export default ManajemenLokasiKerja;
