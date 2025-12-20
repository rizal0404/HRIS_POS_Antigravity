"use client";

import React from 'react';
import { UserProfile } from '../../../types';
import ModernJadwalView from '../../../components/jadwal/ModernJadwalView';

interface JadwalShiftPageProps {
  user: UserProfile;
}

const JadwalShiftPage: React.FC<JadwalShiftPageProps> = ({ user }) => {
  return <ModernJadwalView user={user} mode="colleagues" />;
};

export default JadwalShiftPage;
