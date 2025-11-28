"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Request, RequestType, UserProfile, JadwalKerjaTim, Holiday, RequestStatus } from '../../types';
import { XIcon, UploadIcon, CameraIcon } from '../icons';
import { supabase } from '../../services/supabase';
import { apiService } from '../../services/apiService';
import Spinner from '../ui/Spinner';
import { logError } from '../../lib/logger';
import { formatDate } from '../../lib/utils';

interface RequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user: UserProfile;
}

const CameraCapture: React.FC<{ onCapture: (file: File) => void; onClose: () => void; }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function setupCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Kamera tidak dapat diakses. Pastikan Anda telah memberikan izin.");
                setTimeout(onClose, 3000);
            }
        }
        setupCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [onClose]);

    const handleCapturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const MAX_DIMENSION = 1024;

        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height) {
            if (width > MAX_DIMENSION) {
                height = Math.round(height * MAX_DIMENSION / width);
                width = MAX_DIMENSION;
            }
        } else {
            if (height > MAX_DIMENSION) {
                width = Math.round(width * MAX_DIMENSION / height);
                height = MAX_DIMENSION;
            }
        }

        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const fileName = `capture-${new Date().toISOString()}.jpg`;
                        const capturedFile = new File([blob], fileName, { type: 'image/jpeg' });
                        onCapture(capturedFile);
                    }
                },
                'image/jpeg',
                0.7 // JPEG quality for compression
            );
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col justify-center items-center p-2">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain max-h-[85%]" />
            <canvas ref={canvasRef} className="hidden" />
             {error && <div className="absolute top-4 bg-red-500 text-white p-3 rounded-md">{error}</div>}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-6">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md">Batal</button>
                <button type="button" onClick={handleCapturePhoto} className="px-6 py-4 bg-blue-600 text-white rounded-full font-bold">Ambil Foto</button>
            </div>
        </div>
    );
};

interface DailySubstitute {
    day?: string | null;
    night?: string | null;
}

const RequestModal: React.FC<RequestModalProps> = ({ isOpen, onClose, onSuccess, user }) => {
    const [requestType, setRequestType] = useState<RequestType>(RequestType.SAKIT);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    
    const [startTime, setStartTime] = useState('17:00');
    const [endTime, setEndTime] = useState('21:00');

    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [validationError, setValidationError] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [selectedDateSchedule, setSelectedDateSchedule] = useState<string | null>(null);
    const [isCheckingSchedule, setIsCheckingSchedule] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // State for Cuti
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [allSchedules, setAllSchedules] = useState<Record<string, Record<string, string>>>({});
    const [leaveDays, setLeaveDays] = useState<number | null>(null);
    const [dailySubstitutes, setDailySubstitutes] = useState<Record<string, DailySubstitute>>({});
    const [workingDates, setWorkingDates] = useState<string[]>([]);


    useEffect(() => {
        if (isOpen) {
            const fetchPrerequisites = async () => {
                try {
                    const users = await apiService.getProfiles();
                    setAllUsers(users.filter(u => u.id !== user.id));
                } catch (err) {
                    logError("Failed to fetch prerequisites for request modal", err);
                    setError("Gagal memuat data pendukung.");
                }
            };
            fetchPrerequisites();
        }
    }, [isOpen, user.id]);

    useEffect(() => {
        const fetchScheduleForDate = async () => {
            if (requestType === RequestType.LEMBUR && startDate) {
                setIsCheckingSchedule(true);
                setSelectedDateSchedule(null);
                try {
                    const schedules = await apiService.getTeamSchedules([user.id], startDate, startDate);
                    if (schedules && schedules.length > 0) {
                        setSelectedDateSchedule(schedules[0].shift);
                    } else {
                        setSelectedDateSchedule('Jadwal tidak ditemukan');
                    }
                } catch (err) {
                    logError("Failed to fetch schedule for overtime date", err);
                    setSelectedDateSchedule('Error memuat jadwal');
                } finally {
                    setIsCheckingSchedule(false);
                }
            } else {
                setSelectedDateSchedule(null);
            }
        };
        
        fetchScheduleForDate();
    }, [requestType, startDate, user.id]);

    const checkValidity = useCallback(async () => {
        const effectiveEndDate = (requestType === RequestType.LEMBUR || !endDate) ? startDate : endDate;
        if (!startDate || !effectiveEndDate || new Date(effectiveEndDate) < new Date(startDate)) {
            setValidationError(null);
            setLeaveDays(null);
            setWorkingDates([]); // Reset working dates
            setDailySubstitutes({}); // Reset substitutes
            setAllSchedules({}); // Reset schedules
            return;
        }

        setIsChecking(true);
        setValidationError(null);
        setLeaveDays(null);
        setWorkingDates([]);
        setDailySubstitutes({});
        setAllSchedules({});

        try {
            const { schedules, requests } = await apiService.getRequestPrerequisites(user.id, startDate, effectiveEndDate);
            
            const activeRequests = requests.filter(
                req => req.status === RequestStatus.PENDING || req.status === RequestStatus.APPROVED
            );
            
            if (activeRequests.length > 0) {
                const conflictingRequest = activeRequests.find(req => {
                    if (requestType === RequestType.LEMBUR) {
                        return req.request_type !== RequestType.KOREKSI;
                    }
                    return true;
                });

                if (conflictingRequest) {
                    const existingDate = formatDate(new Date(conflictingRequest.start_date));
                    const statusText = conflictingRequest.status === RequestStatus.PENDING ? "sedang diproses" : "sudah disetujui";
                    setValidationError(`Anda sudah memiliki ajuan (${conflictingRequest.request_type}) yang ${statusText} pada periode ini (mulai ${existingDate}).`);
                    setIsChecking(false);
                    return;
                }
            }
            
            if (requestType === RequestType.CUTI) {
                // Fetch schedules for all potential substitutes
                if (allUsers.length > 0) {
                    const substituteIds = allUsers.map(u => u.id);
                    const allSchedulesData = await apiService.getTeamSchedules(substituteIds, startDate, effectiveEndDate);
                    
                    const newAllSchedules: Record<string, Record<string, string>> = {};
                    allSchedulesData.forEach(schedule => {
                        if (!newAllSchedules[schedule.profile_id]) {
                            newAllSchedules[schedule.profile_id] = {};
                        }
                        newAllSchedules[schedule.profile_id][schedule.date] = schedule.shift;
                    });
                    setAllSchedules(newAllSchedules);
                }

                const scheduleMap = new Map(schedules.map(s => [s.date, s.shift]));
                
                const parseDate = (dateStr: string) => {
                    const [year, month, day] = dateStr.split('-').map(Number);
                    return new Date(Date.UTC(year, month - 1, day));
                };

                const start = parseDate(startDate);
                const end = parseDate(effectiveEndDate);
                
                let workingDays = 0;
                const newWorkingDates: string[] = [];
                for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                    const year = d.getUTCFullYear();
                    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(d.getUTCDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
            
                    const shift = scheduleMap.get(dateStr);
                    
                    if (shift && shift !== 'OFF') {
                        workingDays++;
                        newWorkingDates.push(dateStr);
                    }
                }

                setLeaveDays(workingDays);
                setWorkingDates(newWorkingDates);

                if (workingDays === 0) {
                    setValidationError(`Periode yang dipilih tidak mengandung hari kerja.`);
                }
            }

        } catch (err: any) {
            logError("Validation check failed", err);
            setValidationError("Gagal memvalidasi tanggal pengajuan.");
        } finally {
            setIsChecking(false);
        }
    }, [startDate, endDate, user.id, requestType, allUsers]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = setTimeout(() => {
            checkValidity();
        }, 500);
        return () => clearTimeout(handler);
    }, [isOpen, checkValidity]);


    useEffect(() => {
        if (isOpen) {
            const today = new Date().toISOString().split('T')[0];
            setStartDate(today);
            setEndDate(today);
            setReason('');
            setStartTime('17:00');
            setEndTime('21:00');
            setAttachment(null);
            setError(null);
            setValidationError(null);
            setSelectedDateSchedule(null);
            setIsCheckingSchedule(false);
            setIsCameraOpen(false);
            setLeaveDays(null);
            setDailySubstitutes({});
            setWorkingDates([]);
            setAllSchedules({});
        }
    }, [isOpen, user.id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };
    
    const handleCapture = (file: File) => {
        setAttachment(file);
        setIsCameraOpen(false);
    };

    const handleSubstituteChange = (date: string, shift: 'day' | 'night', value: string) => {
        setDailySubstitutes(prev => ({
            ...prev,
            [date]: {
                ...prev[date],
                [shift]: value || null
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            let attachmentUrl: string | undefined = undefined;
            if (attachment && requestType === RequestType.SAKIT) {
                const filePath = `${user.id}/${Date.now()}_${attachment.name}`;
                const { error: uploadError } = await supabase.storage
                  .from('attachments')
                  .upload(filePath, attachment);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                  .from('attachments')
                  .getPublicUrl(filePath);
                
                attachmentUrl = urlData.publicUrl;
            }
            
            const baseRequestData = {
                profile_id: user.id,
                request_type: requestType,
                start_date: startDate,
                end_date: requestType === RequestType.LEMBUR ? startDate : (endDate || startDate),
                approver_id: user.manager_id || undefined,
            };

            let finalRequestData;

            switch (requestType) {
                case RequestType.CUTI:
                    finalRequestData = {
                        ...baseRequestData,
                        reason: JSON.stringify({ reason, leave_days: leaveDays, substitutes: dailySubstitutes }),
                    };
                    break;
                case RequestType.LEMBUR:
                    finalRequestData = {
                        ...baseRequestData,
                        reason,
                        start_time: startTime,
                        end_time: endTime,
                    };
                    break;
                case RequestType.SAKIT:
                    finalRequestData = {
                        ...baseRequestData,
                        reason,
                        attachment_url: attachmentUrl,
                    };
                    break;
                default:
                    throw new Error("Invalid request type");
            }

            await apiService.submitRequest(finalRequestData as Omit<Request, 'id' | 'created_at' | 'status'>);
            onSuccess();

        } catch (err: any) {
            logError('Failed to submit request', { error: err, userId: user.id });
            setError(err.message || 'Gagal mengirim pengajuan.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = useMemo(() => {
        if (!startDate || !reason.trim()) return false;
        
        if (requestType !== RequestType.LEMBUR) {
            if (!endDate || new Date(endDate) < new Date(startDate)) return false;
        }

        if (requestType === RequestType.LEMBUR) {
            return !!(startTime && endTime);
        }
        if (requestType === RequestType.SAKIT) {
             return !!attachment;
        }
        if (requestType === RequestType.CUTI) {
            return leaveDays !== null && leaveDays > 0;
        }

        return false;
    }, [startDate, endDate, reason, requestType, startTime, endTime, attachment, leaveDays]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">Buat Pengajuan Baru</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {error && (
                            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-sm">
                                <p>{error}</p>
                            </div>
                        )}
                        {(isChecking || validationError) && (
                            <div className={`p-3 text-sm rounded-md ${validationError ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                {isChecking ? 'Memeriksa jadwal dan ajuan...' : validationError}
                            </div>
                        )}
                        <div>
                            <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-1">Jenis Pengajuan</label>
                            <select
                                id="requestType"
                                value={requestType}
                                onChange={(e) => setRequestType(e.target.value as RequestType)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {Object.values(RequestType)
                                    .filter(type => type !== RequestType.KOREKSI && type !== RequestType.IZIN)
                                    .map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {requestType === RequestType.LEMBUR ? (
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tanggal Lembur
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                        <input 
                                            type="text" 
                                            value={isCheckingSchedule ? 'Memeriksa...' : selectedDateSchedule || ''}
                                            placeholder="Jadwal Kerja"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500 cursor-not-allowed" 
                                            disabled 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                                            Tanggal Mulai
                                        </label>
                                        <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                                        <input type="date" id="endDate" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {requestType === RequestType.LEMBUR && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <div>
                                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
                                    <input type="time" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                 <div>
                                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai</label>
                                    <input type="time" id="endTime" value={endTime} onChange={e => setEndTime(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                            </div>
                        )}
                        
                        {requestType === RequestType.CUTI && (
                            <>
                                {leaveDays !== null && (
                                <div className="bg-blue-50 p-3 rounded-md text-center">
                                    <p className="text-sm font-medium text-blue-800">Total Hari Kerja Cuti: <span className="font-bold text-lg">{leaveDays} hari</span></p>
                                </div>
                                )}
                                
                                {workingDates.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <div className="grid grid-cols-[1fr,2fr,2fr] gap-x-3 text-sm font-medium text-gray-700 px-2">
                                            <span>Tanggal</span>
                                            <span>Pengganti Pagi (Opsional)</span>
                                            <span>Pengganti Malam (Opsional)</span>
                                        </div>
                                        {workingDates.map(date => {
                                            const dateObj = new Date(date + 'T00:00:00'); // Treat as local
                                            const formattedDate = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                                            const selectedDaySub = dailySubstitutes[date]?.day;
                                            const selectedNightSub = dailySubstitutes[date]?.night;
                                            return (
                                                <div key={date} className="grid grid-cols-[1fr,2fr,2fr] gap-x-3 items-center">
                                                    <label className="text-sm font-medium text-gray-800 bg-gray-100 p-2 rounded-md text-center">{formattedDate}</label>
                                                    
                                                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                                                        <select
                                                            value={selectedDaySub || ''}
                                                            onChange={(e) => handleSubstituteChange(date, 'day', e.target.value)}
                                                            className="flex-grow min-w-0 px-3 py-2 border-none bg-transparent rounded-md focus:outline-none text-sm w-full"
                                                        >
                                                            <option value="">-- Tidak Ada --</option>
                                                            {allUsers.map(u => (
                                                                <option key={u.id} value={u.id}>{u.full_name}</option>
                                                            ))}
                                                        </select>
                                                        {selectedDaySub && (
                                                            <span className="flex-shrink-0 text-xs font-mono bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded mr-2">
                                                                {allSchedules[selectedDaySub]?.[date] || 'OFF'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                                                        <select
                                                            value={selectedNightSub || ''}
                                                            onChange={(e) => handleSubstituteChange(date, 'night', e.target.value)}
                                                            className="flex-grow min-w-0 px-3 py-2 border-none bg-transparent rounded-md focus:outline-none text-sm w-full"
                                                        >
                                                            <option value="">-- Tidak Ada --</option>
                                                            {allUsers.map(u => (
                                                                <option key={u.id} value={u.id}>{u.full_name}</option>
                                                            ))}
                                                        </select>
                                                        {selectedNightSub && (
                                                            <span className="flex-shrink-0 text-xs font-mono bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded mr-2">
                                                                {allSchedules[selectedNightSub]?.[date] || 'OFF'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}


                        {(requestType === RequestType.SAKIT) && (
                           <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Lampiran <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-4 mt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        <UploadIcon className="h-5 w-5 mr-2"/>
                                        Unggah File
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsCameraOpen(true)}
                                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        <CameraIcon className="h-5 w-5 mr-2"/>
                                        Ambil Foto
                                    </button>
                                </div>
                                <input 
                                    type="file" 
                                    id="attachments"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf"
                                    className="hidden"
                                />
                                {attachment && <p className="text-xs text-gray-500 mt-2">File terpilih: {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)</p>}
                            </div>
                        )}

                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
                            <textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                                placeholder="Jelaskan alasan pengajuan Anda..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            ></textarea>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Batal
                        </button>
                        <button type="submit" disabled={!isFormValid || loading || isChecking || !!validationError}
                            className="w-36 flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {loading ? <Spinner /> : 'Kirim Pengajuan'}
                        </button>
                    </div>
                </form>
            </div>
            {isCameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
        </div>
    );
};

export default RequestModal;