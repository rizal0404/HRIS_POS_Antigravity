"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UserProfile, Request, RequestType, RequestStatus, LeaveType, Shift } from '../../../types';
import { apiService } from '../../../services/apiService';
import { formatDate } from '../../../lib/utils';
import {
    ClockIcon,
    BriefcaseIcon,
    CalendarIcon,
    DocumentAddIcon,
    PaperClipIcon,
    CheckCircleIcon,
    XIcon,
    UploadIcon,
    CameraIcon,
    RefreshIcon
} from '../../../components/icons';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { supabase } from '../../../services/supabase';
import { useNavigate } from 'react-router-dom';
import CameraCapture from '@/components/ui/CameraCapture';

interface PengajuanPageProps {
    user: UserProfile;
}

// ---- Constants & Helper Components ----

const REQUEST_CATEGORIES = [
    {
        id: RequestType.CUTI,
        label: 'Cuti Tahunan',
        icon: BriefcaseIcon,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        bgLight: 'bg-blue-50',
    },
    {
        id: RequestType.SAKIT,
        label: 'Sakit',
        icon: (props: any) => <span {...props} className="material-symbols-outlined text-[24px]">thermometer</span>,
        color: 'bg-red-500',
        textColor: 'text-red-500',
        bgLight: 'bg-red-50',
    },
    {
        id: RequestType.LEMBUR,
        label: 'Lembur',
        icon: ClockIcon,
        color: 'bg-amber-500',
        textColor: 'text-amber-500',
        bgLight: 'bg-amber-50',
    },
    {
        id: RequestType.SUBSTITUSI,
        label: 'Tukar Shift',
        icon: RefreshIcon,
        color: 'bg-teal-600',
        textColor: 'text-teal-600',
        bgLight: 'bg-teal-50',
    },
    {
        id: RequestType.IZIN,
        label: 'Izin / Lainnya',
        icon: DocumentAddIcon,
        color: 'bg-purple-600',
        textColor: 'text-purple-600',
        bgLight: 'bg-purple-50',
    },
];

const LeaveBalanceWidget: React.FC<{ user: UserProfile }> = ({ user }) => {
    const [balances, setBalances] = useState<{ name: string, quota: number, remaining: number }[]>([]);
    const [sickDays, setSickDays] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: types } = await supabase.from('leave_types').select('*');
                const currentYear = new Date().getFullYear();
                const startYear = `${currentYear}-01-01`;
                const endYear = `${currentYear}-12-31`;

                // Fetch approved CUTI
                const { data: cutiRequests } = await supabase
                    .from('requests')
                    .select('*')
                    .eq('profile_id', user.id)
                    .eq('request_type', RequestType.CUTI)
                    .eq('status', RequestStatus.APPROVED)
                    .gte('start_date', startYear)
                    .lte('start_date', endYear);

                // Fetch approved SAKIT
                const { data: sickRequests } = await supabase
                    .from('requests')
                    .select('*')
                    .eq('profile_id', user.id)
                    .eq('request_type', RequestType.SAKIT)
                    .eq('status', RequestStatus.APPROVED)
                    .gte('start_date', startYear)
                    .lte('start_date', endYear);

                // Calculate Sick Days
                const totalSickDays = (sickRequests || []).reduce((acc, req) => {
                    const start = new Date(req.start_date);
                    const end = new Date(req.end_date);
                    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return acc + diffDays;
                }, 0);
                setSickDays(totalSickDays);

                if (types) {
                    const calculated = types.map(type => {
                        const used = (cutiRequests || [])
                            .filter(r => r.reason.includes(type.name) || true)
                            .reduce((acc, req) => {
                                const start = new Date(req.start_date);
                                const end = new Date(req.end_date);
                                const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                return acc + diffDays;
                            }, 0);

                        return {
                            name: type.name,
                            quota: type.default_quota,
                            remaining: Math.max(0, type.default_quota - used)
                        };
                    });
                    setBalances(calculated);
                }
            } catch (error) {
                console.error("Error fetching leave balance:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user.id]);

    if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl"></div>;

    return (
        <Card className="p-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-text-main">Sisa Cuti</h3>
            </div>

            <div className="space-y-4">
                {balances.map((item, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{item.name}</span>
                            <span className="font-bold text-gray-900">{item.remaining} / {item.quota} Hari</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full ${idx === 0 ? 'bg-blue-600' : 'bg-emerald-500'}`}
                                style={{ width: `${(item.remaining / item.quota) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}

                <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500 text-[18px]">thermometer</span>
                            Izin Sakit (YTD)
                        </span>
                        <span className="font-bold text-gray-900">{sickDays} Hari</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}

const RecentActivityWidget: React.FC<{ user: UserProfile }> = ({ user }) => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const data = await apiService.getRequestsForUser(user.id, 3);
                setRequests(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchRecent();
    }, [user.id]);

    if (loading) return <div className="animate-pulse h-60 bg-gray-100 rounded-xl mt-6"></div>;

    return (
        <Card className="p-5 mt-6">
            <h3 className="font-bold text-text-main mb-4">Aktivitas Terkini</h3>

            <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 my-6">
                {requests.map((req, idx) => {
                    let statusColor = 'bg-gray-100 text-gray-400';
                    let icon = 'schedule';
                    if (req.status === RequestStatus.APPROVED) { statusColor = 'bg-green-100 text-green-600'; icon = 'check'; }
                    if (req.status === RequestStatus.REJECTED) { statusColor = 'bg-red-100 text-red-600'; icon = 'close'; }

                    return (
                        <div key={req.id} className="ml-8 relative">
                            <div className={`absolute -left-[45px] top-0 rounded-full p-1 border-4 border-white ${statusColor} shadow-sm z-10 flex items-center justify-center w-8 h-8`}>
                                <span className="material-symbols-outlined text-[16px] font-bold">{icon}</span>
                            </div>

                            <div>
                                <p className="text-sm font-bold text-gray-800">{req.request_type}</p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                                    <Badge variant={req.status === RequestStatus.APPROVED ? 'success' : req.status === RequestStatus.REJECTED ? 'danger' : 'warning'} className="text-[10px] px-2 py-0.5 w-fit">
                                        {req.status.toUpperCase()}
                                    </Badge>
                                    <span className="text-xs text-gray-500">{formatDate(new Date(req.created_at))}</span>
                                </div>
                                {idx === 0 && <span className="text-[10px] text-gray-400 mt-1 block">Diajukan: {formatDate(new Date(req.created_at))}</span>}
                            </div>
                        </div>
                    )
                })}
                {requests.length === 0 && <p className="text-sm text-gray-500 ml-6">Belum ada aktivitas.</p>}
            </div>

            <button
                onClick={() => navigate('/riwayat')}
                className="w-full mt-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
                Lihat Semua Riwayat
            </button>
        </Card>
    );
};

// ---- Main Page Component ----

const PengajuanPage: React.FC<PengajuanPageProps> = ({ user }) => {
    const [selectedCategory, setSelectedCategory] = useState<RequestType>(RequestType.CUTI);
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Common Form State
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [reason, setReason] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Lembur Specific
    const [startTime, setStartTime] = useState('17:00');
    const [endTime, setEndTime] = useState('21:00');

    // Cuti Substitutes
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [substituteDay, setSubstituteDay] = useState<string>('');
    const [substituteNight, setSubstituteNight] = useState<string>('');

    // Substitusi Specific
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [currentShiftCode, setCurrentShiftCode] = useState('');
    const [newShiftCode, setNewShiftCode] = useState('');
    const [isLoadingShift, setIsLoadingShift] = useState(false);

    useEffect(() => {
        // Fetch users for sub select and shifts for swap
        const fetchData = async () => {
            try {
                const [usersData, shiftsData] = await Promise.all([
                    apiService.getProfiles(),
                    apiService.getShifts()
                ]);
                setAllUsers(usersData.filter(u => u.id !== user.id));
                setShifts(shiftsData);
            } catch (e) {
                console.error("Failed to load prerequisites", e);
            }
        };
        fetchData();
    }, [user.id]);

    // Fetch Current Shift when Date/Category changes for Substitusi
    useEffect(() => {
        if (selectedCategory !== RequestType.SUBSTITUSI) return;

        const fetchShift = async () => {
            setIsLoadingShift(true);
            setCurrentShiftCode('');
            try {
                const schedules = await apiService.getTeamSchedules([user.id], startDate, startDate);
                if (schedules && schedules.length > 0) {
                    setCurrentShiftCode(schedules[0].shift);
                }
            } catch (e) {
                console.error("Error fetching schedule", e);
            } finally {
                setIsLoadingShift(false);
            }
        };
        fetchShift();
    }, [selectedCategory, startDate, user.id]);

    const handleCategorySelect = (type: RequestType) => {
        setSelectedCategory(type);
        setSuccessMsg(null);
        setErrorMsg(null);
        setReason('');
        setAttachment(null);
        setSubstituteDay('');
        setSubstituteNight('');
        setNewShiftCode('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    const handleCapture = (file: File) => {
        setAttachment(file);
        setIsCameraOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        // Validation
        if ((selectedCategory === RequestType.SAKIT || selectedCategory === RequestType.IZIN) && !attachment) {
            setErrorMsg("Wajib melampirkan bukti/surat keterangan (foto/dokumen).");
            setIsLoading(false);
            return;
        }

        try {
            let attachmentUrl = undefined;
            if (attachment) {
                const fileExt = attachment.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(fileName, attachment);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(fileName);
                attachmentUrl = urlData.publicUrl;
            }

            const baseRequest: Partial<Request> = {
                profile_id: user.id,
                request_type: selectedCategory,
                start_date: startDate,
                attachment_url: attachmentUrl,
                status: RequestStatus.PENDING,
                approver_id: user.manager_id || undefined,
            };

            let finalRequest = { ...baseRequest };

            switch (selectedCategory) {
                case RequestType.LEMBUR:
                    finalRequest.end_date = startDate;
                    finalRequest.start_time = startTime;
                    finalRequest.end_time = endTime;
                    finalRequest.reason = reason;
                    break;
                case RequestType.SUBSTITUSI:
                    finalRequest.end_date = startDate;
                    finalRequest.reason = JSON.stringify({
                        shift_awal: { code: currentShiftCode },
                        shift_baru: { code: newShiftCode },
                        keterangan: reason
                    });
                    break;
                case RequestType.CUTI:
                    finalRequest.end_date = endDate;
                    // Construct substitutes object simplistically for now (one day for range is tricky, 
                    // usually modal handled per-day subs. Here we'll just attach one general sub or simplistic approach 
                    // since UI is single select. "Primary Substitute")
                    // Better approach: Just save the IDs in metadata.
                    const substitutes: any = {};
                    if (substituteDay) substitutes.day = allUsers.find(u => u.id === substituteDay)?.full_name;
                    if (substituteNight) substitutes.night = allUsers.find(u => u.id === substituteNight)?.full_name;

                    finalRequest.reason = JSON.stringify({
                        reason: reason,
                        substitutes: Object.keys(substitutes).length ? { "ALL_DAYS": substitutes } : {}
                    }); // Simplified structure for this UI
                    break;
                default: // SAKIT, IZIN
                    finalRequest.end_date = endDate;
                    finalRequest.reason = reason;
                    break;
            }

            await apiService.submitRequest(finalRequest as Request);

            setSuccessMsg('Pengajuan berhasil dikirim!');
            setReason('');
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || "Gagal mengirim pengajuan.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-text-main">Pengajuan Baru</h1>
                <p className="text-text-secondary mt-1">Pilih kategori dan isi detail untuk mengajukan permintaan.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                <div className="lg:col-span-2 space-y-8">

                    <div>
                        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">category</span> Kategori Pengajuan
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 sm:grid-cols-5 gap-3">
                            {REQUEST_CATEGORIES.map((cat) => {
                                const isSelected = selectedCategory === cat.id;
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleCategorySelect(cat.id)}
                                        className={`relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 h-28 text-center
                                            ${isSelected
                                                ? `border-blue-600 bg-blue-50/50`
                                                : 'border-transparent bg-white shadow-sm hover:shadow-md hover:scale-[1.02]'
                                            }
                                        `}
                                    >
                                        <div className={`p-2 rounded-full ${cat.bgLight} ${cat.textColor}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                            {cat.label}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 text-blue-600">
                                                <CheckCircleIcon className="w-4 h-4" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <Card className="p-6 lg:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-text-main">
                                Detail {REQUEST_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                            </h2>
                            {selectedCategory === RequestType.CUTI && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium">Draft Form</span>
                            )}
                        </div>

                        {successMsg && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700 animate-fade-in">
                                <CheckCircleIcon className="w-5 h-5" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        {errorMsg && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-fade-in">
                                <span className="material-symbols-outlined">error</span>
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                {selectedCategory !== RequestType.LEMBUR && selectedCategory !== RequestType.SUBSTITUSI && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            min={startDate}
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                )}

                                {selectedCategory === RequestType.LEMBUR && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Jam Mulai</label>
                                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Jam Selesai</label>
                                            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" required />
                                        </div>
                                    </>
                                )}
                            </div>

                            {selectedCategory === RequestType.SUBSTITUSI && (
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Shift Saat Ini</label>
                                        <div className="font-semibold text-gray-800 flex items-center gap-2 h-10">
                                            {isLoadingShift ? <Spinner className="w-4 h-4 text-blue-600" /> : (currentShiftCode || 'Tidak ada jadwal')}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tukar Menjadi</label>
                                        <select
                                            value={newShiftCode}
                                            onChange={(e) => setNewShiftCode(e.target.value)}
                                            className="w-full h-10 bg-white border border-gray-200 rounded-lg px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        >
                                            <option value="">Pilih Shift Baru</option>
                                            {shifts.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectedCategory === RequestType.CUTI && (
                                <div className="space-y-4 pt-2 border-t border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-700">Delegasi / Pengganti (Opsional)</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Pengganti Shift Pagi</label>
                                            <select
                                                value={substituteDay}
                                                onChange={(e) => setSubstituteDay(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-blue-400"
                                            >
                                                <option value="">-- Tidak Ada --</option>
                                                {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Pengganti Shift Malam</label>
                                            <select
                                                value={substituteNight}
                                                onChange={(e) => setSubstituteNight(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-blue-400"
                                            >
                                                <option value="">-- Tidak Ada --</option>
                                                {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedCategory === RequestType.CUTI && (
                                <div className="p-4 bg-blue-50 rounded-lg flex gap-3 text-sm text-blue-800">
                                    <span className="material-symbols-outlined text-[20px]">info</span>
                                    <p>
                                        Anda mengajukan cuti selama <span className="font-bold">
                                            {startDate === endDate ? '1 hari' : `${Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1} hari`}
                                        </span>.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                                    <span>{selectedCategory === RequestType.SUBSTITUSI ? 'Keterangan Tukar Shift' : 'Alasan Pengajuan'}</span>
                                    <span className="text-xs text-gray-400">Max 500 chars</span>
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={4}
                                    placeholder={selectedCategory === RequestType.SUBSTITUSI ? 'Jelaskan kenapa perlu tukar shift...' : "Deskripsikan alasan pengajuan Anda..."}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                    maxLength={500}
                                    required={selectedCategory !== RequestType.CUTI} // Reasoning might be optional for straightforward annual leave? Usually required.
                                />
                            </div>

                            {/* Attachments Area */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Lampiran
                                    {(selectedCategory === RequestType.SAKIT || selectedCategory === RequestType.IZIN) ? <span className="text-red-500 ml-1">* Wajib</span> : <span className="text-gray-400 ml-1">(Opsional)</span>}
                                </label>
                                <div className="flex gap-4">
                                    <div
                                        className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors group flex flex-col items-center justify-center gap-2"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/*,application/pdf"
                                        />
                                        <UploadIcon className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm text-gray-600 font-medium">Upload File</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsCameraOpen(true)}
                                        className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors group flex flex-col items-center justify-center gap-2"
                                    >
                                        <CameraIcon className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm text-gray-600 font-medium">Ambil Foto</span>
                                    </button>
                                </div>
                                {attachment && (
                                    <div className="mt-3 flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <PaperClipIcon className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-800 truncate max-w-[200px]">{attachment.name}</span>
                                            <span className="text-xs text-blue-600">({(attachment.size / 1024).toFixed(0)} KB)</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAttachment(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="p-1 hover:bg-blue-200 rounded-full text-blue-600"
                                        >
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform transform hover:scale-[1.02] disabled:opacity-70 disabled:scale-100 flex items-center gap-2"
                                >
                                    {isLoading && <Spinner className="w-5 h-5 text-white" />}
                                    <span>{isLoading ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
                                </button>
                            </div>

                        </form>
                    </Card>
                </div>

                <div className="space-y-6">
                    <LeaveBalanceWidget user={user} />
                    <RecentActivityWidget user={user} />
                    <Card className="p-5 bg-blue-600 text-white">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                                <span className="material-symbols-outlined text-2xl">help</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Butuh Bantuan?</h3>
                                <p className="text-sm text-white/80 mt-1">Jika anda memiliki pertanyaan seputar kebijakan cuti.</p>
                                <button className="mt-3 text-sm font-bold underline hover:text-white/90">Hubungi HR</button>
                            </div>
                        </div>
                    </Card>
                </div>

            </div>
            {isCameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
        </div>
    );
};

export default PengajuanPage;
