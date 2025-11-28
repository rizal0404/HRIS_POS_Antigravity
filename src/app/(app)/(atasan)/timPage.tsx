"use client";

import React from 'react';
import { UserProfile } from '../../../types';
import JadwalTimView from '../../../components/jadwal/JadwalTimView';

interface TimSayaPageProps {
  user: UserProfile;
}

const TimSayaPage: React.FC<TimSayaPageProps> = ({ user }) => {
  return <JadwalTimView user={user} mode="team" />;
};

export default TimSayaPage;
