"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserProfile, Department } from '../../../types';
import { apiService } from '../../../services/apiService';
import { supabase } from '../../../services/supabase';
import { PlusCircleIcon, PencilIcon, TrashIcon, SearchIcon, UsersIcon, CurrencyDollarIcon } from '../../../components/icons';
import Pagination from '../../../components/ui/Pagination';
import PegawaiModal from '../../../components/modals/PegawaiModal';
import KonfigurasiGaji from '../../../components/konfigurasi/KonfigurasiGaji';
import ConfirmationModal from '../../../components/modals/ConfirmationModal';

const PAGE_SIZE = 10;

interface KonfigurasiPegawaiPageProps {
    user: UserProfile;
}

type Tab = 'pegawai' | 'gaji';

const KonfigurasiPegawaiPage: React.FC<KonfigurasiPegawaiPageProps> = ({ user }) => {
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [organizationStructure, setOrganizationStructure] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('pegawai');

    // State for confirmation modal
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [users, structure] = await Promise.all([
                apiService.getProfiles(),
                apiService.getOrganizationStructure()
            ]);
            setAllUsers(users);
            setOrganizationStructure(structure);
        } catch (error) {
            console.error("Failed to fetch page data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);
    
    const positions = useMemo(() => {
        const cleanAndTitleCase = (str: string) => {
            let cleaned = str.replace(/^(DEPARTEMEN|BIRO|SEKSI)\s/i, '');
            return cleaned.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
        };

        const positionSet = new Set<string>();
        allUsers.forEach(user => {
            if (user.position) positionSet.add(user.position);
        });
        organizationStructure.forEach(dept => {
            positionSet.add(`Kepala Departemen ${cleanAndTitleCase(dept.name)}`);
            (dept.bureaus || []).forEach(bureau => {
                positionSet.add(`Kepala Biro ${cleanAndTitleCase(bureau.name)}`);
                positionSet.add(`Staf ${cleanAndTitleCase(bureau.name)}`);
                (bureau.sections || []).forEach(section => {
                    positionSet.add(`Kepala Seksi ${cleanAndTitleCase(section.name)}`);
                    positionSet.add(`Staf ${cleanAndTitleCase(section.name)}`);
                });
            });
        });
        return Array.from(positionSet).sort();
    }, [allUsers, organizationStructure]);


    const filteredUsers = useMemo(() => {
        if (!searchTerm) return allUsers;
        return allUsers.filter(user =>
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allUsers, searchTerm]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        return filteredUsers.slice(start, end);
    }, [filteredUsers, currentPage]);

    const handleAdd = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: UserProfile) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteRequest = (userId: string) => {
        setUserToDelete(userId);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await apiService.deleteUser(userToDelete);
            await fetchAllData(); // Refresh
        } catch (error) {
            console.error("Failed to delete user:", error);
            // In a real app, show a toast notification for the error.
        } finally {
            setIsDeleting(false);
            setIsConfirmModalOpen(false);
            setUserToDelete(null);
        }
    };
    
    const handleSave = async (userData: Omit<UserProfile, 'id'> & { id?: string; password?: string }) => {
        try {
            if (userData.id) { // Editing existing user
                const { password, ...profileData } = userData; // Exclude password from profile update
                await apiService.saveProfile(profileData as UserProfile);
            } else { // Creating new user
                const { email, password } = userData;
                if (!email || !password) {
                    throw new Error("Email and password are required for new users.");
                }

                // Step 1: Create the authentication user in Supabase Auth.
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (signUpError) {
                    throw signUpError;
                }
                if (!authData.user) {
                    throw new Error("User registration did not return a user object.");
                }

                // Step 2: The database trigger `handle_new_user` has now created a basic profile.
                // We now update that profile with the full details from the form.
                const { password: pwd, ...profileData } = userData;
                const profileToUpdate: Partial<UserProfile> = {
                    ...profileData,
                    id: authData.user.id,
                };

                await apiService.saveProfile(profileToUpdate);
            }
            fetchAllData(); // Refresh the user list
        } catch (error: any) {
            console.error("Failed to save user:", error.message);
            // In a real app, you would show an error toast to the user.
        } finally {
            setIsModalOpen(false);
            setEditingUser(null);
        }
    };
    
    const handleUpdateSalary = async (userId: string, newSalary: UserProfile['salary']) => {
        try {
            await apiService.saveProfile({ id: userId, salary: newSalary });
            fetchAllData(); // Refresh list to show updated salary
        } catch (error) {
            console.error("Failed to update salary:", error);
        }
    }

    const renderPegawaiTab = () => (
        <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div className="relative w-full sm:w-auto">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Cari berdasarkan nama atau email..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80 border rounded-md pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            <button onClick={handleAdd} className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Tambah Pegawai
            </button>
        </div>
        {loading ? (
             <div className="text-center py-12">Memuat data pegawai...</div>
        ) : (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]">
                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                    <tr>
                        <th className="px-4 py-3">Nama Pegawai</th>
                        <th className="px-4 py-3">Jabatan</th>
                        <th className="px-4 py-3">Atasan Langsung</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3 text-right">Tindakan</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedUsers.map(user => (
                        <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                    <img className="h-10 w-10 rounded-full object-cover" src={user.avatar_url} alt={user.full_name} />
                                    <div>
                                        <p>{user.full_name}</p>
                                        <p className="text-xs text-gray-500">{user.nik || 'NIK belum diatur'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 capitalize">{user.position}</td>
                            <td className="px-4 py-3">{user.manager_id ? (usersMap.get(user.manager_id)?.full_name || 'N/A') : '-'}</td>
                            <td className="px-4 py-3">{user.email}</td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end space-x-3">
                                    <button onClick={() => handleEdit(user)} className="p-1 text-gray-500 hover:text-blue-600">
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleDeleteRequest(user.id)} className="p-1 text-gray-500 hover:text-red-600">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        )}
        {filteredUsers.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
                <p>Tidak ada pegawai yang ditemukan.</p>
            </div>
        )}
        {filteredUsers.length > PAGE_SIZE && (
             <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredUsers.length / PAGE_SIZE)}
                onPageChange={setCurrentPage}
                totalRecords={filteredUsers.length}
                pageSize={PAGE_SIZE}
            />
        )}
        </>
    );

    return (
        <>
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-md">
                    <div className="border-b border-gray-200">
                         <div className="px-6">
                             <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <button onClick={() => setActiveTab('pegawai')}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'pegawai' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    <UsersIcon className="h-5 w-5"/>
                                    Manajemen Pegawai
                                </button>
                                <button onClick={() => setActiveTab('gaji')}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'gaji' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                    <CurrencyDollarIcon className="h-5 w-5"/>
                                    Konfigurasi Gaji & Slip
                                </button>
                            </nav>
                        </div>
                    </div>
                    <div className="p-6">
                       {activeTab === 'pegawai' ? renderPegawaiTab() : <KonfigurasiGaji allUsers={allUsers} onUpdateSalary={handleUpdateSalary} />}
                    </div>
                </div>
            </div>

            <PegawaiModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingUser}
                allUsers={allUsers}
                positions={positions}
            />

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Konfirmasi Hapus Pegawai"
                isConfirming={isDeleting}
            >
                <p>Anda yakin ingin menghapus pegawai ini? Tindakan ini akan menghapus pengguna dari sistem autentikasi dan semua data terkait.</p>
                <p className="font-semibold mt-2">Tindakan ini tidak dapat diurungkan.</p>
            </ConfirmationModal>
        </>
    );
};

export default KonfigurasiPegawaiPage;