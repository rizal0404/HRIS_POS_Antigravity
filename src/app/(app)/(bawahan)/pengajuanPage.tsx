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
import { useToast } from '@/components/ui/Toast';
import ReviewAjuanModal from '@/components/modals/ReviewAjuanModal';

interface PengajuanPageProps {
    user: UserProfile;
}

// ---- Constants & Helper Components ----

const REQUEST_CATEGORIES = [
    {
        id: RequestType.CUTI,
        label: 'Cuti',
        icon: BriefcaseIcon,
        color: 'bg-blue-600',
        textColor: 'text-blue-600',
        bgLight: 'bg-blue-50',
    },
    {
        id: RequestType.SAKIT,
        label: 'Sakit',
        icon: (props: any) => <span {...props} className="material-symbols-outlined text-[18px]">thermometer</span>,
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
        label: 'Subst.',
        icon: RefreshIcon,
        color: 'bg-teal-600',
        textColor: 'text-teal-600',
        bgLight: 'bg-teal-50',
    },
    {
        id: RequestType.IZIN,
        label: 'Izin',
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

    if (loading) return <div className="animate-pulse h-32 bg-gray-100 dark:bg-slate-800 rounded-xl"></div>;

    return (
        <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm">Sisa Cuti</h3>
            </div>

            <div className="space-y-3">
                {balances.map((item, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600 dark:text-slate-400">{item.name}</span>
                            <span className="font-bold text-gray-900 dark:text-slate-100">{item.remaining} / {item.quota}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                            <div
                                className={`h-1.5 rounded-full ${idx === 0 ? 'bg-blue-600' : 'bg-emerald-500'}`}
                                style={{ width: `${(item.remaining / item.quota) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}

                <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-red-500 text-[14px]">thermometer</span>
                            Izin Sakit (YTD)
                        </span>
                        <span className="font-bold text-gray-900 dark:text-slate-100">{sickDays} Hari</span>
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

    if (loading) return <div className="animate-pulse h-40 bg-gray-100 dark:bg-slate-800 rounded-xl"></div>;

    return (
        <Card className="p-4">
            <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm mb-3">Aktivitas Terkini</h3>

            <div className="space-y-3">
                {requests.map((req) => {
                    let statusColor = 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500';
                    let icon = 'schedule';
                    if (req.status === RequestStatus.APPROVED) { statusColor = 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'; icon = 'check'; }
                    if (req.status === RequestStatus.REJECTED) { statusColor = 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'; icon = 'close'; }

                    return (
                        <div key={req.id} className="flex items-start gap-3">
                            <div className={`rounded-full p-1.5 ${statusColor} flex items-center justify-center`}>
                                <span className="material-symbols-outlined text-[14px] font-bold">{icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate">{req.request_type}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant={req.status === RequestStatus.APPROVED ? 'success' : req.status === RequestStatus.REJECTED ? 'danger' : 'warning'} className="text-[9px] px-1.5 py-0.5">
                                        {req.status.toUpperCase()}
                                    </Badge>
                                    <span className="text-[10px] text-gray-400 dark:text-slate-500">{formatDate(new Date(req.created_at))}</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
                {requests.length === 0 && <p className="text-xs text-gray-500 dark:text-slate-400">Belum ada aktivitas.</p>}
            </div>

            <button
                onClick={() => navigate('/riwayat')}
                className="w-full mt-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
                Lihat Semua Riwayat
            </button>
        </Card>
    );
};

// ---- Main Page Component ----

const PengajuanPage: React.FC<PengajuanPageProps> = ({ user }) => {
    const { showToast } = useToast();
    const [selectedCategory, setSelectedCategory] = useState<RequestType>(RequestType.CUTI);
    const [isLoading, setIsLoading] = useState(false);
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
    const [showReviewModal, setShowReviewModal] = useState(false);

    useEffect(() => {
        // Fetch users for sub select and shifts for swap
        const fetchData = async () => {
            try {
                const [usersData, shiftsData] = await Promise.all([
                    apiService.getProfiles(),
                    apiService.getShifts()
                ]);
                // Filter to show only colleagues from the same section (same manager_id)
                const sectionColleagues = usersData.filter(u =>
                    u.id !== user.id && u.manager_id === user.manager_id
                );
                setAllUsers(sectionColleagues);
                setShifts(shiftsData);
            } catch (e) {
                console.error("Failed to load prerequisites", e);
            }
        };
        fetchData();
    }, [user.id, user.manager_id]);

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

    const handleOpenReview = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if ((selectedCategory === RequestType.SAKIT || selectedCategory === RequestType.IZIN) && !attachment) {
            showToast('error', 'Wajib melampirkan bukti/surat keterangan (foto/dokumen).');
            return;
        }

        setShowReviewModal(true);
    };

    const handleSubmit = async () => {
        setIsLoading(true);

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
                    const substitutes: any = {};
                    if (substituteDay) substitutes.day = allUsers.find(u => u.id === substituteDay)?.full_name;
                    if (substituteNight) substitutes.night = allUsers.find(u => u.id === substituteNight)?.full_name;

                    finalRequest.reason = JSON.stringify({
                        reason: reason,
                        substitutes: Object.keys(substitutes).length ? { "ALL_DAYS": substitutes } : {}
                    });
                    break;
                default: // SAKIT, IZIN
                    finalRequest.end_date = endDate;
                    finalRequest.reason = reason;
                    break;
            }

            await apiService.submitRequest(finalRequest as Request);

            showToast('success', 'Pengajuan berhasil dikirim ke atasan!');
            setReason('');
            setAttachment(null);
            setShowReviewModal(false);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (err: any) {
            console.error(err);
            showToast('error', err.message || 'Gagal mengirim pengajuan. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    const selectedCategoryData = REQUEST_CATEGORIES.find(c => c.id === selectedCategory);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans">
            {/* Header Section */}
            <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 lg:px-8 shrink-0">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Buat ajuan baru</h2>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">

                        {/* Left Column - Form */}
                        <div className="lg:col-span-2 space-y-4">

                            {/* Category Selection - Compact Horizontal */}
                            <Card className="p-4">
                                <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">category</span> Kategori
                                </h3>
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {REQUEST_CATEGORIES.map((cat) => {
                                        const isSelected = selectedCategory === cat.id;
                                        const Icon = cat.icon;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleCategorySelect(cat.id)}
                                                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200
                                                    ${isSelected
                                                        ? `border-blue-600 bg-blue-50 dark:bg-blue-900/30`
                                                        : 'border-transparent bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'
                                                    }
                                                `}
                                            >
                                                <div className={`p-1.5 rounded-lg ${cat.bgLight} ${cat.textColor}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className={`text-xs font-bold whitespace-nowrap ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-slate-300'}`}>
                                                    {cat.label}
                                                </span>
                                                {isSelected && (
                                                    <CheckCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Form Card */}
                            <Card className="p-4 lg:p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                                        Detail {selectedCategoryData?.label}
                                    </h2>
                                    {selectedCategory === RequestType.CUTI && (
                                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium">Draft</span>
                                    )}
                                </div>

                                <form onSubmit={handleOpenReview} className="space-y-4">

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">Tanggal Mulai</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                                required
                                            />
                                        </div>
                                        {selectedCategory !== RequestType.LEMBUR && selectedCategory !== RequestType.SUBSTITUSI && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">Tanggal Selesai</label>
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    min={startDate}
                                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                                                    required
                                                />
                                            </div>
                                        )}

                                        {selectedCategory === RequestType.LEMBUR && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">Jam Mulai</label>
                                                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">Jam Selesai</label>
                                                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm" required />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {selectedCategory === RequestType.SUBSTITUSI && (
                                        <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 grid sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Shift Saat Ini</label>
                                                <div className="font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2 h-8 text-sm">
                                                    {isLoadingShift ? <Spinner className="w-4 h-4 text-blue-600" /> : (currentShiftCode || 'Tidak ada jadwal')}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Tukar Menjadi</label>
                                                <select
                                                    value={newShiftCode}
                                                    onChange={(e) => setNewShiftCode(e.target.value)}
                                                    className="w-full h-8 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg px-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    required
                                                >
                                                    <option value="">Pilih Shift Baru</option>
                                                    {shifts.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {selectedCategory === RequestType.CUTI && (
                                        <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                                            <h3 className="text-xs font-bold text-gray-700 dark:text-slate-300">Delegasi / Pengganti (Opsional)</h3>
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 dark:text-slate-400 mb-1">Pengganti Shift Pagi</label>
                                                    <select
                                                        value={substituteDay}
                                                        onChange={(e) => setSubstituteDay(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-blue-400"
                                                    >
                                                        <option value="">-- Tidak Ada --</option>
                                                        {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500 dark:text-slate-400 mb-1">Pengganti Shift Malam</label>
                                                    <select
                                                        value={substituteNight}
                                                        onChange={(e) => setSubstituteNight(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg text-sm outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-blue-400"
                                                    >
                                                        <option value="">-- Tidak Ada --</option>
                                                        {allUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedCategory === RequestType.CUTI && (
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex gap-2 text-xs text-blue-800 dark:text-blue-300">
                                            <span className="material-symbols-outlined text-[16px]">info</span>
                                            <p>
                                                Anda mengajukan cuti selama <span className="font-bold">
                                                    {startDate === endDate ? '1 hari' : `${Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1} hari`}
                                                </span>.
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5 flex justify-between">
                                            <span>{selectedCategory === RequestType.SUBSTITUSI ? 'Keterangan Tukar Shift' : 'Alasan Pengajuan'}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-slate-500">Max 500</span>
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            rows={3}
                                            placeholder={selectedCategory === RequestType.SUBSTITUSI ? 'Jelaskan kenapa perlu tukar shift...' : "Deskripsikan alasan pengajuan Anda..."}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-sm"
                                            maxLength={500}
                                            required={selectedCategory !== RequestType.CUTI}
                                        />
                                    </div>

                                    {/* Attachments Area */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                                            Lampiran
                                            {(selectedCategory === RequestType.SAKIT || selectedCategory === RequestType.IZIN) ? <span className="text-red-500 ml-1">* Wajib</span> : <span className="text-gray-400 dark:text-slate-500 ml-1">(Opsional)</span>}
                                        </label>
                                        <div className="flex gap-3">
                                            <div
                                                className="flex-1 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group flex flex-col items-center justify-center gap-1"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    accept="image/*,application/pdf"
                                                />
                                                <UploadIcon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs text-gray-600 dark:text-slate-300 font-medium">Upload</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setIsCameraOpen(true)}
                                                className="flex-1 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group flex flex-col items-center justify-center gap-1"
                                            >
                                                <CameraIcon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs text-gray-600 dark:text-slate-300 font-medium">Foto</span>
                                            </button>
                                        </div>
                                        {attachment && (
                                            <div className="mt-2 flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <PaperClipIcon className="w-3 h-3 text-blue-600" />
                                                    <span className="text-xs font-medium text-blue-800 truncate max-w-[150px]">{attachment.name}</span>
                                                    <span className="text-[10px] text-blue-600">({(attachment.size / 1024).toFixed(0)} KB)</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAttachment(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    className="p-1 hover:bg-blue-200 rounded-full text-blue-600"
                                                >
                                                    <XIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform transform hover:scale-[1.02] disabled:opacity-70 disabled:scale-100 flex items-center gap-2 text-sm"
                                        >
                                            {isLoading && <Spinner className="w-4 h-4 text-white" />}
                                            <span>{isLoading ? 'Mengirim...' : 'Kirim Pengajuan'}</span>
                                        </button>
                                    </div>

                                </form>
                            </Card>
                        </div>

                        {/* Right Column - Sidebar Widgets */}
                        <div className="space-y-4">
                            <LeaveBalanceWidget user={user} />
                            <RecentActivityWidget user={user} />
                            <Card className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <span className="material-symbols-outlined text-xl">help</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Butuh Bantuan?</h3>
                                        <p className="text-xs text-white/80 mt-0.5">Pertanyaan seputar kebijakan cuti.</p>
                                        <button className="mt-2 text-xs font-bold underline hover:text-white/90">Hubungi HR</button>
                                    </div>
                                </div>
                            </Card>
                        </div>

                    </div>
                </div>
            </div>
            {isCameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
            <ReviewAjuanModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onConfirm={handleSubmit}
                isSubmitting={isLoading}
                requestType={selectedCategory}
                startDate={startDate}
                endDate={endDate}
                reason={reason}
                attachment={attachment}
                startTime={startTime}
                endTime={endTime}
                currentShiftCode={currentShiftCode}
                newShiftCode={newShiftCode}
                substituteDay={substituteDay}
                substituteNight={substituteNight}
                allUsers={allUsers}
            />
        </div>
    );
};

export default PengajuanPage;
