"use client";

import React, { useEffect, useState } from 'react';
import { UserProfile, DisciplineScore } from '../../types';
import { disciplineService } from '@/services/discipline';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import { RefreshIcon, CheckCircleIcon, BriefcaseIcon } from '@/components/icons';
import Spinner from '@/components/ui/Spinner';

interface SkorDisiplinCardProps {
    user: UserProfile;
}

const SkorDisiplinCard: React.FC<SkorDisiplinCardProps> = ({ user }) => {
    const [score, setScore] = useState<DisciplineScore | null>(null);
    const [loading, setLoading] = useState(false);

    const loadScore = async () => {
        setLoading(true);
        try {
            const now = new Date();
            // Try to get existing score first
            let data = await disciplineService.getDisciplineScore(user.id, now.getMonth() + 1, now.getFullYear());

            // If no data, try to refresh/calculate it
            if (!data) {
                // Initial calculation or creation
                data = await disciplineService.refreshDisciplineScore(user.id, now.getMonth() + 1, now.getFullYear());
            }
            setScore(data);
        } catch (error) {
            console.error("Failed to load discipline score:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadScore();
    }, [user.id]);

    if (!score && loading) {
        return (
            <Card className="p-4 flex items-center justify-center min-h-[200px]">
                <Spinner />
            </Card>
        );
    }

    if (!score) {
        return (
            <Card className="p-4 flex flex-col justify-center h-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <BriefcaseIcon className="text-[20px]" />
                    </div>
                    <h3 className="font-semibold text-text-main">Skor Disiplin</h3>
                </div>
                <div className="text-center text-text-secondary py-2">
                    <p className="text-sm mb-2">Data belum tersedia.</p>
                    <button onClick={loadScore} className="text-primary text-xs font-medium hover:underline">
                        Hitung Sekarang
                    </button>
                </div>
            </Card>
        );
    }

    const { final_score, base_score, late_count, early_leave_count, wrong_location_count, correction_count } = score;

    let colorClass = 'text-emerald-600';
    let bgClass = 'bg-emerald-50';
    let barColor = 'bg-emerald-500';

    if (final_score < 70) {
        colorClass = 'text-red-600';
        bgClass = 'bg-red-50';
        barColor = 'bg-red-500';
    } else if (final_score < 90) {
        colorClass = 'text-orange-600';
        bgClass = 'bg-orange-50';
        barColor = 'bg-orange-500';
    }

    return (
        <Card className="p-4 flex flex-col h-full bg-white">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${bgClass} ${colorClass}`}>
                        <BriefcaseIcon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-text-main">Skor Disiplin</h3>
                </div>
                <button
                    onClick={loadScore}
                    disabled={loading}
                    className="text-text-secondary hover:text-primary disabled:opacity-50 transition-colors"
                >
                    <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
                <span className={`text-4xl font-bold ${colorClass}`}>{final_score}</span>
                <span className="text-sm text-text-secondary">/ {base_score}</span>
            </div>

            <ProgressBar value={final_score} max={base_score} color={barColor} className="mb-6" />

            <div className="space-y-3 border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Terlambat</span>
                    <span className={`font-medium ${late_count > 0 ? 'text-red-500' : 'text-text-main'}`}>{late_count}x</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Pulang Cepat</span>
                    <span className={`font-medium ${early_leave_count > 0 ? 'text-red-500' : 'text-text-main'}`}>{early_leave_count}x</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Lokasi Salah</span>
                    <span className={`font-medium ${wrong_location_count > 0 ? 'text-red-500' : 'text-text-main'}`}>{wrong_location_count}x</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Koreksi Absen</span>
                    <span className={`font-medium ${correction_count > 0 ? 'text-orange-500' : 'text-text-main'}`}>{correction_count}x</span>
                </div>
            </div>
        </Card>
    );
};

export default SkorDisiplinCard;
