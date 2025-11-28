"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Department, Bureau, Section } from '../../types';
import { apiService } from '../../services/apiService';
import { PlusCircleIcon, PencilIcon, TrashIcon, OfficeBuildingIcon, DownloadIcon, UploadIcon } from '../icons';
import OrganisasiModal, { ItemType } from '../modals/OrganisasiModal';
import ConfirmationModal from '../modals/ConfirmationModal';

const ActionButtons: React.FC<{ onEdit: () => void; onDelete: () => void; }> = ({ onEdit, onDelete }) => (
    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 text-gray-500 hover:text-blue-600"><PencilIcon className="h-4 w-4" /></button>
        <button onClick={onDelete} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
    </div>
);

const StrukturOrganisasi: React.FC = () => {
    const [structure, setStructure] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        itemType: ItemType;
        onSave: (name: string) => Promise<void>;
        initialData?: { id: number; name: string };
    } | null>(null);

    // Confirmation Modal State
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [deleteAction, setDeleteAction] = useState<{ action: () => void; name: string; type: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchStructure = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.getOrganizationStructure();
            setStructure(data);
        } catch (error) {
            console.error("Failed to fetch organization structure:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStructure();
    }, [fetchStructure]);

    const openModal = (itemType: ItemType, onSave: (name: string) => Promise<void>, initialData?: { id: number; name: string }) => {
        setModalConfig({ itemType, onSave, initialData });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalConfig(null);
    };
    
    const requestDelete = (action: () => void, name: string, type: string) => {
        setDeleteAction({ action, name, type });
        setConfirmOpen(true);
    };
    
    const confirmDelete = async () => {
        if (deleteAction) {
            setIsDeleting(true);
            try {
                await deleteAction.action();
            } catch (error) {
                console.error(`Failed to delete ${deleteAction.type}:`, error);
            } finally {
                setIsDeleting(false);
                setConfirmOpen(false);
                setDeleteAction(null);
            }
        }
    };


    const handleAddDept = () => openModal('Departemen', async (name) => {
        await apiService.saveDepartment({ name });
        fetchStructure();
        closeModal();
    });

    const handleEditDept = (dept: Department) => openModal('Departemen', async (name) => {
        await apiService.saveDepartment({ id: dept.id, name });
        fetchStructure();
        closeModal();
    }, dept);
    
    const handleDeleteDept = (dept: Department) => requestDelete(
        async () => {
            await apiService.deleteDepartment(dept.id);
            await fetchStructure();
        },
        dept.name, 'Departemen'
    );
    
    const handleAddBureau = (deptId: number) => openModal('Biro', async (name) => {
        await apiService.saveBureau({ name, department_id: deptId });
        fetchStructure();
        closeModal();
    });
    
    const handleEditBureau = (bureau: Bureau) => openModal('Biro', async (name) => {
        await apiService.saveBureau({ id: bureau.id, name });
        fetchStructure();
        closeModal();
    }, bureau);

    const handleDeleteBureau = (bureau: Bureau) => requestDelete(
        async () => {
            await apiService.deleteBureau(bureau.id);
            await fetchStructure();
        },
        bureau.name, 'Biro'
    );

    const handleAddSection = (bureauId: number) => openModal('Seksi', async (name) => {
        await apiService.saveSection({ name, bureau_id: bureauId });
        fetchStructure();
        closeModal();
    });
    
    const handleEditSection = (section: Section) => openModal('Seksi', async (name) => {
        await apiService.saveSection({ id: section.id, name });
        fetchStructure();
        closeModal();
    }, section);

    const handleDeleteSection = (section: Section) => requestDelete(
        async () => {
            await apiService.deleteSection(section.id);
            await fetchStructure();
        },
        section.name, 'Seksi'
    );

    // ... (CSV functions remain the same for now, but would need backend integration in a real app)
    const handleDownloadTemplate = () => {
        const header = "Department,Bureau,Section\n";
        const example = "DEPARTEMEN PRODUKSI,BIRO PRODUKSI TERAK,SEKSI PRODUKSI BAHAN BAKU\n";
        const csvContent = "data:text/csv;charset=utf-8," + encodeURI(header + example);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", "struktur_organisasi_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        // This is a complex operation that should ideally be handled by the backend
        alert("Fungsi import CSV belum diimplementasikan dengan backend.");
    };
    
    return (
        <>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div className="flex items-center space-x-3">
                    <OfficeBuildingIcon className="h-8 w-8 text-slate-700" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Struktur Organisasi</h2>
                        <p className="text-sm text-gray-500">Kelola departemen, biro, dan seksi perusahaan.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={handleDownloadTemplate} className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <DownloadIcon className="h-4 w-4 mr-1.5" />
                        Template
                    </button>
                    <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        <UploadIcon className="h-4 w-4 mr-1.5" />
                        Import
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                    </label>
                    <button onClick={handleAddDept} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        <PlusCircleIcon className="h-5 w-5 mr-2" />
                        Tambah Dept
                    </button>
                </div>
            </div>

            {loading ? <p>Memuat struktur...</p> : (
            <div className="space-y-4">
                {structure.map(dept => (
                    <div key={dept.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center group">
                            <h3 className="font-bold text-lg text-gray-800">{dept.name}</h3>
                            <div className="flex items-center">
                                <ActionButtons onEdit={() => handleEditDept(dept)} onDelete={() => handleDeleteDept(dept)} />
                                <button onClick={() => handleAddBureau(dept.id)} className="ml-2 p-1 text-gray-400 hover:text-green-600">
                                    <PlusCircleIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="pl-6 mt-2 space-y-2">
                            {(dept.bureaus || []).map(bureau => (
                                <div key={bureau.id} className="bg-white rounded-md p-2">
                                    <div className="flex justify-between items-center group">
                                        <h4 className="font-semibold text-md text-gray-700">{bureau.name}</h4>
                                        <div className="flex items-center">
                                            <ActionButtons onEdit={() => handleEditBureau(bureau)} onDelete={() => handleDeleteBureau(bureau)} />
                                            <button onClick={() => handleAddSection(bureau.id)} className="ml-2 p-1 text-gray-400 hover:text-green-600">
                                                 <PlusCircleIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pl-6 mt-1 space-y-1">
                                        {(bureau.sections || []).map(section => (
                                            <div key={section.id} className="flex justify-between items-center group">
                                                <p className="text-sm text-gray-600">{section.name}</p>
                                                <ActionButtons onEdit={() => handleEditSection(section)} onDelete={() => handleDeleteSection(section)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            )}
            
            {isModalOpen && modalConfig && (
                <OrganisasiModal 
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={modalConfig.onSave}
                    itemType={modalConfig.itemType}
                    initialData={modalConfig.initialData}
                />
            )}
        </div>
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={confirmDelete}
            title={`Hapus ${deleteAction?.type}`}
            isConfirming={isDeleting}
        >
            <p>Anda yakin ingin menghapus <strong>{deleteAction?.name}</strong>?</p>
            <p className="mt-2 text-sm text-yellow-600">Menghapus item ini juga akan menghapus semua sub-item di dalamnya (misalnya, menghapus departemen akan menghapus semua biro dan seksinya).</p>
            <p className="font-semibold mt-2">Tindakan ini tidak dapat diurungkan.</p>
        </ConfirmationModal>
        </>
    );
};

export default StrukturOrganisasi;