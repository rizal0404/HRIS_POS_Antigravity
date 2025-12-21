"use client";

import React from 'react';
import { UserProfile } from '../../../types';
import StrukturOrganisasi from '../../../components/konfigurasi/StrukturOrganisasi';
import ManajemenShift from '../../../components/konfigurasi/ManajemenShift';
import ManajemenCutiLembur from '../../../components/konfigurasi/ManajemenCutiLembur';
import ManajemenHariLibur from '../../../components/konfigurasi/ManajemenHariLibur';
import PengaturanUmum from '../../../components/konfigurasi/PengaturanUmum';
import ManajemenUpahLembur from '../../../components/konfigurasi/ManajemenUpahLembur';
import ManajemenLokasiKerja from '../../../components/konfigurasi/ManajemenLokasiKerja';

interface KonfigurasiSistemPageProps {
    user: UserProfile;
}

const KonfigurasiSistemPage: React.FC<KonfigurasiSistemPageProps> = ({ user }) => {
    return (
        <div className="p-6 space-y-8">
            <div>
                <StrukturOrganisasi />
            </div>

            <div>
                <ManajemenLokasiKerja />
            </div>

            <div>
                <ManajemenShift />
            </div>

            <div>
                <ManajemenCutiLembur />
            </div>

            <div>
                <ManajemenUpahLembur />
            </div>

            <div>
                <ManajemenHariLibur />
            </div>

            <div>
                <PengaturanUmum />
            </div>

        </div>
    );
};

export default KonfigurasiSistemPage;