
"use client";

import React, { useState, useMemo } from 'react';
import { UserProfile } from '../../types';
import Pagination from '../ui/Pagination';
import GajiModal from '../modals/GajiModal';
import SlipGajiModal from '../modals/SlipGajiModal';

const PAGE_SIZE = 10;

interface KonfigurasiGajiProps {
    allUsers: UserProfile[];
    onUpdateSalary: (userId: string, newSalary: UserProfile['salary']) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const KonfigurasiGaji: React.FC<KonfigurasiGajiProps> = ({ allUsers, onUpdateSalary }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [isGajiModalOpen, setIsGajiModalOpen] = useState(false);
    const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        // FIX: Paginate all users, not just those with salaries
        return allUsers.slice(start, end);
    }, [allUsers, currentPage]);

    const handleOpenGajiModal = (user: UserProfile) => {
        setSelectedUser(user);
        setIsGajiModalOpen(true);
    };
    
    const handleOpenSlipModal = (user: UserProfile) => {
        setSelectedUser(user);
        setIsSlipModalOpen(true);
    };

    const handleSaveGaji = (newSalary: UserProfile['salary']) => {
        if (selectedUser) {
            onUpdateSalary(selectedUser.id, newSalary);
        }
        setIsGajiModalOpen(false);
        setSelectedUser(null);
    };

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[700px]">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                            <th className="px-4 py-3">Nama Pegawai</th>
                            <th className="px-4 py-3">Gaji Pokok</th>
                            <th className="px-4 py-3">Tunjangan</th>
                            <th className="px-4 py-3">Total Gaji</th>
                            <th className="px-4 py-3 text-center">Tindakan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map(user => {
                            const totalTunjangan = (user.salary?.tunjangan_jabatan || 0) + (user.salary?.tunjangan_lain || 0);
                            const totalGaji = (user.salary?.gaji_pokok || 0) + totalTunjangan;

                            return (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        <div className="flex items-center space-x-3">
                                            {/* FIX: Changed avatarUrl and fullName to snake_case */}
                                            <img className="h-10 w-10 rounded-full object-cover" src={user.avatar_url} alt={user.full_name} />
                                            <div>
                                                {/* FIX: Changed fullName to full_name */}
                                                <p>{user.full_name}</p>
                                                <p className="text-xs text-gray-500">{user.position}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{formatCurrency(user.salary?.gaji_pokok || 0)}</td>
                                    <td className="px-4 py-3">{formatCurrency(totalTunjangan)}</td>
                                    <td className="px-4 py-3 font-semibold">{formatCurrency(totalGaji)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button onClick={() => handleOpenGajiModal(user)} className="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-md hover:bg-yellow-600">
                                                Atur Gaji
                                            </button>
                                            <button onClick={() => handleOpenSlipModal(user)} className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-md hover:bg-blue-600">
                                                Lihat Slip
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {allUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p>Tidak ada data pegawai untuk ditampilkan.</p>
                </div>
            )}

            {allUsers.length > PAGE_SIZE && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(allUsers.length / PAGE_SIZE)}
                    onPageChange={setCurrentPage}
                    totalRecords={allUsers.length}
                    pageSize={PAGE_SIZE}
                />
            )}
            
            {isGajiModalOpen && selectedUser && (
                <GajiModal
                    isOpen={isGajiModalOpen}
                    onClose={() => setIsGajiModalOpen(false)}
                    onSave={handleSaveGaji}
                    user={selectedUser}
                />
            )}

            {isSlipModalOpen && selectedUser && (
                 <SlipGajiModal
                    isOpen={isSlipModalOpen}
                    onClose={() => setIsSlipModalOpen(false)}
                    user={selectedUser}
                />
            )}
        </>
    );
};

export default KonfigurasiGaji;
