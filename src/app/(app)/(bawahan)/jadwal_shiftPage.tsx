"use client";

import React from 'react';
import { UserProfile } from '../../../types';
import JadwalTimView from '../../../components/jadwal/JadwalTimView';

interface JadwalShiftPageProps {
  user: UserProfile;
}

const JadwalShiftPage: React.FC<JadwalShiftPageProps> = ({ user }) => {
  return <JadwalTimView user={user} mode="colleagues" />;
};

export default JadwalShiftPage;
