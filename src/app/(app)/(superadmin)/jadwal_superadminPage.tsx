"use client";

import React from 'react';
import ModernJadwalView from '@/components/jadwal/ModernJadwalView';
import { UserProfile } from '@/types';

interface JadwalSuperadminPageProps {
    user: UserProfile;
}

const JadwalSuperadminPage: React.FC<JadwalSuperadminPageProps> = ({ user }) => {
    return <ModernJadwalView user={user} mode="all" forceEdit={true} />;
};

export default JadwalSuperadminPage;
