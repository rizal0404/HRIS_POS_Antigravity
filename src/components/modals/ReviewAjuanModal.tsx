"use client";

import React from 'react';
import { RequestType, UserProfile } from '../../types';
import { XIcon, PaperClipIcon } from '../icons';
import Spinner from '../ui/Spinner';
import { formatDate } from '../../lib/utils';

interface ReviewAjuanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    requestType: RequestType;
    startDate: string;
    endDate: string;
    reason: string;
    attachment?: File | null;
    // Lembur specific
    startTime?: string;
    endTime?: string;
    // Substitusi specific
    currentShiftCode?: string;
    newShiftCode?: string;
    // Cuti specific
    substituteDay?: string;
    substituteNight?: string;
    allUsers?: UserProfile[];
}

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value || '-'}</span>
    </div>
);

const ReviewAjuanModal: React.FC<ReviewAjuanModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isSubmitting,
    requestType,
    startDate,
    endDate,
    reason,
    attachment,
    startTime,
    endTime,
    currentShiftCode,
    newShiftCode,
    substituteDay,
    substituteNight,
    allUsers = [],
}) => {
    if (!isOpen) return null;

    const resolveUserName = (id?: string) => {
        if (!id) return null;
        const user = allUsers.find(u => u.id === id);
        return user?.full_name || id;
    };

    const getTitle = () => {
        switch (requestType) {
            case RequestType.CUTI: return 'Konfirmasi Pengajuan Cuti';
            case RequestType.SAKIT: return 'Konfirmasi Pengajuan Izin Sakit';
            case RequestType.LEMBUR: return 'Konfirmasi Pengajuan Lembur';
            case RequestType.SUBSTITUSI: return 'Konfirmasi Tukar Shift';
            case RequestType.IZIN: return 'Konfirmasi Pengajuan Izin';
            default: return 'Konfirmasi Pengajuan';
        }
    };

    const calculateDays = () => {
        if (startDate === endDate) return '1 hari';
        const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} hari`;
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">{getTitle()}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-1 max-h-[60vh] overflow-y-auto">
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <p className="text-xs text-blue-700 font-medium">
                            {requestType === RequestType.LEMBUR ? (
                                (() => {
                                    if (!startTime || !endTime) return 'Pastikan data berikut sudah benar sebelum mengirim ke atasan.';
                                    const [startH, startM] = startTime.split(':').map(Number);
                                    const [endH, endM] = endTime.split(':').map(Number);
                                    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                                    if (diffMinutes < 0) diffMinutes += 24 * 60;
                                    const hours = Math.floor(diffMinutes / 60);
                                    const minutes = diffMinutes % 60;
                                    const durationStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                                    return `Apakah Anda sudah yakin durasi lembur anda ${durationStr} Jam dari jam ${startTime} ke jam ${endTime}?`;
                                })()
                            ) : (
                                'Pastikan data berikut sudah benar sebelum mengirim ke atasan.'
                            )}
                        </p>
                    </div>

                    <InfoRow label="Jenis Pengajuan" value={requestType} />

                    {requestType === RequestType.LEMBUR ? (
                        <>
                            <>
                                <InfoRow label="Tanggal" value={formatDate(new Date(startDate))} />
                                <InfoRow label="Waktu Lembur" value={`${startTime} - ${endTime}`} />
                                <InfoRow label="Durasi Lembur" value={(() => {
                                    if (!startTime || !endTime) return '-';
                                    const [startH, startM] = startTime.split(':').map(Number);
                                    const [endH, endM] = endTime.split(':').map(Number);
                                    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                                    if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle crossing midnight if needed
                                    const hours = Math.floor(diffMinutes / 60);
                                    const minutes = diffMinutes % 60;
                                    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} Jam`;
                                })()} />
                            </>
                        </>
                    ) : requestType === RequestType.SUBSTITUSI ? (
                        <>
                            <InfoRow label="Tanggal" value={formatDate(new Date(startDate))} />
                            <InfoRow label="Shift Awal" value={currentShiftCode || 'Tidak ada'} />
                            <InfoRow label="Shift Baru" value={newShiftCode || 'Belum dipilih'} />
                        </>
                    ) : (
                        <>
                            <InfoRow label="Periode" value={startDate === endDate
                                ? formatDate(new Date(startDate))
                                : `${formatDate(new Date(startDate))} - ${formatDate(new Date(endDate))}`
                            } />
                            <InfoRow label="Durasi" value={calculateDays()} />
                        </>
                    )}

                    {requestType === RequestType.CUTI && (substituteDay || substituteNight) && (
                        <>
                            {substituteDay && <InfoRow label="Pengganti Pagi" value={resolveUserName(substituteDay)} />}
                            {substituteNight && <InfoRow label="Pengganti Malam" value={resolveUserName(substituteNight)} />}
                        </>
                    )}

                    <div className="pt-2">
                        <p className="text-sm text-gray-500 mb-1">Alasan</p>
                        <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded-lg whitespace-pre-line italic">
                            "{reason || '-'}"
                        </p>
                    </div>

                    {attachment && (
                        <div className="flex items-center gap-2 pt-2">
                            <PaperClipIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-gray-700 truncate">{attachment.name}</span>
                            <span className="text-[10px] text-gray-400">({(attachment.size / 1024).toFixed(0)} KB)</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Revisi
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="min-w-[140px] flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-wait"
                    >
                        {isSubmitting ? <Spinner className="w-4 h-4 text-white" /> : 'Kirim ke Atasan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewAjuanModal;
