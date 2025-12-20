"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Request, RequestType, UserProfile, Attendance, RequestStatus } from '../../types';
import { XIcon, PaperClipIcon } from '../icons';
import Badge from '../ui/Badge';
import { formatDate, formatTime } from '../../lib/utils';
import AttachmentViewerModal from './AttachmentViewerModal';
import { supabase } from '../../services/supabase';

interface DetailAjuanModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: Request | null;
    allUsers: UserProfile[];
}

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-md text-gray-800">{value || '-'}</p>
    </div>
);

const DetailAjuanModal: React.FC<DetailAjuanModalProps> = ({ isOpen, onClose, request, allUsers }) => {
    const [isAttachmentViewerOpen, setAttachmentViewerOpen] = useState(false);
    const [originalAttendance, setOriginalAttendance] = useState<Attendance | null>(null);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const userNameMap = useMemo(() => new Map(allUsers.map(u => [u.id, u.full_name])), [allUsers]);

    useEffect(() => {
        const fetchOriginalAttendance = async () => {
            setOriginalAttendance(null);
            if (isOpen && request && request.request_type === RequestType.KOREKSI && request.attendance_id_to_correct) {
                setLoadingAttendance(true);
                try {
                    const { data, error } = await supabase
                        .from('attendance')
                        .select('*')
                        .eq('id', request.attendance_id_to_correct)
                        .single();

                    if (error && error.code !== 'PGRST116') throw error;
                    setOriginalAttendance(data as Attendance | null);
                } catch (err) {
                    console.error("Failed to fetch original attendance record", err);
                } finally {
                    setLoadingAttendance(false);
                }
            }
        };

        fetchOriginalAttendance();
    }, [isOpen, request]);


    const correctionDetails = useMemo(() => {
        if (!request || request.request_type !== RequestType.KOREKSI) return null;
        try {
            if (request.reason && request.reason.startsWith('{')) {
                return JSON.parse(request.reason) as {
                    type?: 'in' | 'out' | 'missed_in' | 'missed_out' | 'missed_both' | 'wrong_time';
                    reason?: string;
                    intended_iso?: string;
                    new_clock_in_iso?: string;
                    new_clock_out_iso?: string;
                };
            }
        } catch (e) {
            // Fallback for malformed JSON or plain text
        }
        return null;
    }, [request]);

    const cutiDetails = useMemo(() => {
        if (!request || request.request_type !== RequestType.CUTI || !request.reason.startsWith('{')) {
            return null;
        }
        try {
            return JSON.parse(request.reason) as { reason: string; leave_days: number; substitutes: Record<string, { day?: string; night?: string }> };
        } catch (e) {
            console.error("Failed to parse Cuti reason JSON:", e);
            return null;
        }
    }, [request]);

    const substitusiDetails = useMemo(() => {
        if (!request || request.request_type !== RequestType.SUBSTITUSI) return null;
        try {
            return JSON.parse(request.reason) as { shift_awal?: { code?: string; name?: string }; shift_baru?: { code?: string; name?: string }; keterangan?: string };
        } catch (e) {
            return null;
        }
    }, [request]);

    const reasonText = useMemo(() => {
        if (!request) return '';
        if (cutiDetails) {
            return `"${cutiDetails.reason || 'Tidak ada alasan'}"`;
        }
        if (substitusiDetails) {
            return `"${substitusiDetails.keterangan || request.reason}"`;
        }
        // Fallback for non-JSON or other request types
        return `"${request.reason}"`;
    }, [request, cutiDetails, substitusiDetails]);

    const actionDate = useMemo(() => {
        // updated_at is the timestamp for the approval/rejection action
        if (!request || !request.updated_at) return null;

        // Only show this date if the request has a final status
        if (request.status === RequestStatus.APPROVED || request.status === RequestStatus.REJECTED) {
            return formatDate(new Date(request.updated_at));
        }

        return null;
    }, [request]);

    const actionDateLabel = useMemo(() => {
        if (!request?.status) return '';
        if (request.status === RequestStatus.APPROVED) return "Tanggal Disetujui";
        if (request.status === RequestStatus.REJECTED) return "Tanggal Ditolak";
        return "Tanggal Direspon";
    }, [request?.status]);


    if (!isOpen || !request) return null;

    const formatShiftInfo = (shift?: { code?: string; name?: string }) => {
        if (!shift) return '-';
        if (shift.name && shift.code) return `${shift.name} (${shift.code})`;
        return shift.name || shift.code || '-';
    };

    const findUserNameById = (id?: string | null) => {
        if (!id) return 'N/A';
        return userNameMap.get(id) || 'N/A';
    };
    const resolveSubstituteName = (id?: string | null) => {
        if (!id) return 'N/A';
        return userNameMap.get(id) || id;
    };

    const renderRequestSpecificDetails = () => {
        switch (request.request_type) {
            case RequestType.CUTI:
                if (!cutiDetails?.substitutes || Object.keys(cutiDetails.substitutes).length === 0) {
                    return <InfoRow label="Pengganti Shift" value="Tidak ada" />;
                }
                return (
                    <div className="sm:col-span-2">
                        <p className="text-sm font-medium text-gray-500">Detail Pengganti Shift</p>
                        <div className="mt-1 space-y-2 border rounded-md p-3 bg-gray-50 max-h-48 overflow-y-auto">
                            {Object.entries(cutiDetails.substitutes).map(([date, shifts]) => {
                                const daySub = resolveSubstituteName(shifts.day);
                                const nightSub = resolveSubstituteName(shifts.night);
                                return (
                                    <div key={date} className="grid grid-cols-[1fr,2fr,2fr] gap-x-4 text-sm items-center">
                                        <span className="font-semibold text-gray-800">{formatDate(new Date(date + 'T00:00:00'))}</span>
                                        <span className="text-gray-700">Pagi: {daySub}</span>
                                        <span className="text-gray-700">Malam: {nightSub}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case RequestType.LEMBUR:
                return <InfoRow label="Waktu Lembur" value={`${request.start_time} - ${request.end_time}`} />;
            case RequestType.SUBSTITUSI:
                return (
                    <>
                        <InfoRow label="Shift Awal" value={formatShiftInfo(substitusiDetails?.shift_awal)} />
                        <InfoRow label="Shift Baru" value={formatShiftInfo(substitusiDetails?.shift_baru)} />
                    </>
                );
            case RequestType.SAKIT:
            case RequestType.KOREKSI: // Also show attachment for Koreksi
                return (
                    <InfoRow
                        label="Lampiran"
                        value={
                            request.attachment_url ? (
                                <button onClick={() => setAttachmentViewerOpen(true)} className="flex items-center text-blue-600 hover:underline">
                                    <PaperClipIcon className="h-4 w-4 mr-1" />
                                    Lihat Lampiran
                                </button>
                            ) : '-'
                        }
                    />
                );
            default:
                return null;
        }
    };

    const renderAlasan = () => {
        if (request.request_type === RequestType.KOREKSI && correctionDetails) {
            const actualClockIn = loadingAttendance
                ? 'Memuat...'
                : originalAttendance
                    ? formatTime(new Date(originalAttendance.clock_in))
                    : 'Data tidak ditemukan';
            const actualClockOut = loadingAttendance
                ? 'Memuat...'
                : originalAttendance?.clock_out
                    ? formatTime(new Date(originalAttendance.clock_out))
                    : '- (Tidak ada)';

            const correctedClockIn = correctionDetails.new_clock_in_iso
                ? formatTime(new Date(correctionDetails.new_clock_in_iso))
                : (correctionDetails.type === 'in' && correctionDetails.intended_iso)
                    ? formatTime(new Date(correctionDetails.intended_iso))
                    : '-';
            const correctedClockOut = correctionDetails.new_clock_out_iso
                ? formatTime(new Date(correctionDetails.new_clock_out_iso))
                : (correctionDetails.type === 'out' && correctionDetails.intended_iso)
                    ? formatTime(new Date(correctionDetails.intended_iso))
                    : '-';

            const correctionLabel = (() => {
                switch (correctionDetails.type) {
                    case 'missed_in': return 'Lupa Clock-In';
                    case 'missed_out': return 'Lupa Clock-Out';
                    case 'missed_both': return 'Lupa Clock-In & Clock-Out';
                    case 'wrong_time': return 'Salah Jam';
                    default: return (correctionDetails.type || '').toString().toUpperCase();
                }
            })();

            return (
                <div className="bg-gray-50 p-3 rounded-md mt-1 space-y-2">
                    <InfoRow label="Tipe Koreksi" value={correctionLabel} />
                    <InfoRow label="Clock-In Aktual" value={actualClockIn} />
                    <InfoRow label="Clock-In Koreksi" value={correctedClockIn} />
                    <InfoRow label="Clock-Out Aktual" value={actualClockOut} />
                    <InfoRow label="Clock-Out Koreksi" value={correctedClockOut} />
                    <InfoRow label="Keterangan" value={`"${correctionDetails.reason || '-'}"`} />
                </div>
            )
        }

        if (request.request_type === RequestType.SUBSTITUSI && substitusiDetails) {
            return (
                <p className="text-md text-gray-800 bg-gray-50 p-3 rounded-md mt-1 italic whitespace-pre-line">
                    "{substitusiDetails.keterangan || '-'}"
                </p>
            );
        }

        return <p className="text-md text-gray-800 bg-gray-50 p-3 rounded-md mt-1 italic whitespace-pre-line">{reasonText}</p>
    };

    const approverName = findUserNameById(request.approver_id);
    const requesterName = findUserNameById(request.profile_id);

    const formattedStartDate = formatDate(new Date(request.start_date));
    const formattedEndDate = formatDate(new Date(request.end_date));
    const period = request.start_date === request.end_date
        ? formattedStartDate
        : `${formattedStartDate} - ${formattedEndDate}`;
    const periodLabel = request.request_type === RequestType.LEMBUR
        ? "Tanggal Lembur"
        : request.request_type === RequestType.SUBSTITUSI
            ? "Tanggal"
            : "Periode";

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-50 flex justify-center items-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h3 className="text-xl font-semibold text-gray-800">Detail Pengajuan {request.request_type}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                            <h4 className="text-lg font-bold text-gray-900">{request.request_type}</h4>
                            <Badge status={request.status} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoRow label={periodLabel} value={period} />
                            {renderRequestSpecificDetails()}
                        </div>

                        <div>
                            <p className="text-sm font-medium text-gray-500">Alasan</p>
                            {renderAlasan()}
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="text-md font-semibold text-gray-700 mb-2">Informasi Pengajuan</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InfoRow label="Diajukan oleh" value={requesterName} />
                                <InfoRow label="Tanggal Pengajuan" value={formatDate(new Date(request.created_at))} />
                                <InfoRow label="Penyetuju" value={approverName} />
                                {actionDate && (
                                    <InfoRow label={actionDateLabel} value={actionDate} />
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-gray-700 focus:outline-none">
                            Kembali
                        </button>
                    </div>
                </div>
            </div>
            <AttachmentViewerModal
                isOpen={isAttachmentViewerOpen}
                onClose={() => setAttachmentViewerOpen(false)}
                fileUrl={request.attachment_url || null}
            />
        </>
    );
};

export default DetailAjuanModal;
