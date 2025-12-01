"use client";

import React from 'react';
import { UserProfile } from '@/types';
import KpiCalculator from '@/components/kpi/KpiCalculator';

interface KpiPageProps {
    user: UserProfile;
}

const KpiPage: React.FC<KpiPageProps> = ({ user }) => {
    return (
        <div className="min-h-full bg-gray-100">
            <KpiCalculator user={user} />
        </div>
    );
};

export default KpiPage;

