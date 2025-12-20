"use client";

import React from 'react';
import { UserProfile } from '../../../types';
import ModernJadwalView from '../../../components/jadwal/ModernJadwalView';

interface TimSayaPageProps {
  user: UserProfile;
}

const TimSayaPage: React.FC<TimSayaPageProps> = ({ user }) => {
  return <ModernJadwalView user={user} mode="team" />;
};

export default TimSayaPage;
