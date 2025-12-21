"use client";

import React, { useEffect, useState } from 'react';
import { UserProfile, DisciplineScore } from '../../types';
import { disciplineService } from '@/services/discipline';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/Modal';
import { RefreshIcon, BriefcaseIcon } from '@/components/icons';
import Spinner from '@/components/ui/Spinner';

interface SkorDisiplinCardProps {
    user: UserProfile;
}

const SkorDisiplinCard: React.FC<SkorDisiplinCardProps> = ({ user }) => {
    const [score, setScore] = useState<DisciplineScore | null>(null);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadScore = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let data = await disciplineService.getDisciplineScore(user.id, now.getMonth() + 1, now.getFullYear());
            if (!data) {
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

    // Default values when loading or no data
    const finalScore = score?.final_score ?? 0;
    const baseScore = score?.base_score ?? 100;

    // Color coding based on score
    let colorClass = 'text-emerald-600';
    let bgClass = 'bg-emerald-50';
    let barColor = 'bg-emerald-500';

    if (finalScore < 70) {
        colorClass = 'text-red-600';
        bgClass = 'bg-red-50';
        barColor = 'bg-red-500';
    } else if (finalScore < 90) {
        colorClass = 'text-orange-600';
        bgClass = 'bg-orange-50';
        barColor = 'bg-orange-500';
    }

    const handleCardClick = () => {
        if (score) {
            setIsModalOpen(true);
        }
    };

    const handleRefreshClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        loadScore();
    };

    return (
        <>
            <Card
                variant="stat"
                className="p-4 flex flex-col justify-center cursor-pointer hover:shadow-md transition-shadow"
                onClick={handleCardClick}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 ${bgClass} ${colorClass} rounded-lg`}>
                            <BriefcaseIcon className="text-[20px]" />
                        </div>
                        <span className="text-sm font-medium text-text-secondary">Disiplin</span>
                    </div>
                    <button
                        onClick={handleRefreshClick}
                        disabled={loading}
                        className="text-text-secondary hover:text-primary disabled:opacity-50 transition-colors p-1"
                        title="Refresh skor"
                    >
                        {loading ? <Spinner className="w-4 h-4" /> : <RefreshIcon className="w-4 h-4" />}
                    </button>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${colorClass}`}>{finalScore}</span>
                    <span className="text-sm text-text-secondary">/ {baseScore}</span>
                </div>
                <ProgressBar value={finalScore} max={baseScore} color={barColor} className="mt-2" />
            </Card>

            {/* Detail Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail Skor Disiplin">
                {score ? (
                    <div className="space-y-4">
                        {/* Main Score */}
                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100">
                            <p className="text-sm text-text-secondary mb-1">Skor Bulan Ini</p>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className={`text-5xl font-bold ${colorClass}`}>{score.final_score}</span>
                                <span className="text-lg text-text-secondary">/ {score.base_score}</span>
                            </div>
                            <ProgressBar value={score.final_score} max={score.base_score} color={barColor} className="mt-3" height={8} />
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-text-main border-b pb-2">Breakdown Pelanggaran</h4>

                            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span className="text-sm text-text-main">Terlambat</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${score.late_count > 0 ? 'text-red-600' : 'text-text-main'}`}>
                                        {score.late_count}x
                                    </span>
                                    <span className="text-xs text-text-secondary">(-2 poin/x)</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                    <span className="text-sm text-text-main">Pulang Cepat</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${score.early_leave_count > 0 ? 'text-orange-600' : 'text-text-main'}`}>
                                        {score.early_leave_count}x
                                    </span>
                                    <span className="text-xs text-text-secondary">(-2 poin/x)</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    <span className="text-sm text-text-main">Lokasi Salah</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${score.wrong_location_count > 0 ? 'text-purple-600' : 'text-text-main'}`}>
                                        {score.wrong_location_count}x
                                    </span>
                                    <span className="text-xs text-text-secondary">(-5 poin/x)</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <span className="text-sm text-text-main">Koreksi Absen</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${score.correction_count > 0 ? 'text-amber-600' : 'text-text-main'}`}>
                                        {score.correction_count}x
                                    </span>
                                    <span className="text-xs text-text-secondary">(-1 poin/x)</span>
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="text-xs text-text-secondary bg-blue-50 p-3 rounded-lg">
                            <p className="font-medium text-blue-700 mb-1">ℹ️ Cara Perhitungan:</p>
                            <p>Skor dasar 100 poin, dikurangi berdasarkan pelanggaran. Skor ≥90 (Baik), 70-89 (Perlu Perhatian), &lt;70 (Kurang).</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-text-secondary">
                        <p>Data tidak tersedia</p>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default SkorDisiplinCard;
