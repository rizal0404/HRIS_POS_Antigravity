"use client";

import React from 'react';
import { AcademicCapIcon } from '@/components/icons';

interface PendingApprovalPageProps {
    onLogout: () => void;
}

const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({ onLogout }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white rounded-xl shadow-lg p-10 max-w-lg w-full text-center">
                <div className="flex justify-center mb-4">
                    <AcademicCapIcon className="h-12 w-12 text-blue-600" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-800 mb-2">Menunggu Persetujuan</h1>
                <p className="text-gray-600 mb-6">
                    Ajuan pendaftaran Anda sudah diterima. Superadmin akan meninjau data Anda terlebih dahulu.
                    Anda akan dapat login setelah ajuan disetujui.
                </p>
                <button
                    onClick={onLogout}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Keluar
                </button>
            </div>
        </div>
    );
};

export default PendingApprovalPage;
