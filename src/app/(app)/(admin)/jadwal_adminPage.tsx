"use client";

import React from 'react';
import JadwalTimView from '@/components/jadwal/JadwalTimView';
import { UserProfile } from '@/types';

interface JadwalAdminPageProps {
  user: UserProfile;
}

const JadwalAdminPage: React.FC<JadwalAdminPageProps> = ({ user }) => {
  return <JadwalTimView user={user} mode="all" />;
};

export default JadwalAdminPage;
