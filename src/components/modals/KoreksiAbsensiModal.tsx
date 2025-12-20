
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Attendance } from '../../types';
import { XIcon, CalendarIcon, TimeIcon, UploadIcon, CameraIcon } from '../icons';
import { APP_TIME_ZONE, formatDateKey } from '../../lib/utils';

interface KoreksiAbsensiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { correctionType: 'missed_in' | 'missed_out' | 'missed_both' | 'wrong_time', newDate: string, newClockIn?: string, newClockOut?: string, reason: string, attachment: File }) => void;
    attendanceData: Attendance;
}

type CorrectionType = 'missed_in' | 'missed_out' | 'missed_both' | 'wrong_time';

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


const KoreksiAbsensiModal: React.FC<KoreksiAbsensiModalProps> = ({ isOpen, onClose, onSubmit, attendanceData }) => {
    const [correctionType, setCorrectionType] = useState<CorrectionType>('missed_in');
    const [newDate, setNewDate] = useState('');
    const [newClockIn, setNewClockIn] = useState('');
    const [newClockOut, setNewClockOut] = useState('');
    const [reason, setReason] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (isOpen && attendanceData) {
            const originalDate = new Date(attendanceData.clock_in || new Date().toISOString());
            setNewDate(formatDateKey(originalDate));
            setNewClockIn(
                attendanceData.clock_in
                    ? new Intl.DateTimeFormat('en-GB', {
                        timeZone: APP_TIME_ZONE,
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    }).format(originalDate)
                    : ''
            );
            setNewClockOut(
                attendanceData.clock_out
                    ? new Intl.DateTimeFormat('en-GB', {
                        timeZone: APP_TIME_ZONE,
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    }).format(new Date(attendanceData.clock_out))
                    : ''
            );
            setReason('');
            setAttachment(null);
            setCorrectionType(attendanceData.clock_out ? 'wrong_time' : 'missed_in');
            setIsCameraOpen(false);
        }
    }, [isOpen, attendanceData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    const handleCapture = (file: File) => {
        setAttachment(file);
        setIsCameraOpen(false);
    };

    const isFormValid = useMemo(() => {
        const needClockIn = correctionType === 'missed_in' || correctionType === 'missed_both' || correctionType === 'wrong_time';
        const needClockOut = correctionType === 'missed_out' || correctionType === 'missed_both' || correctionType === 'wrong_time';
        const hasClockIn = !!newClockIn;
        const hasClockOut = !!newClockOut;
        const timesOk = correctionType === 'wrong_time'
            ? (hasClockIn || hasClockOut)
            : (!needClockIn || hasClockIn) && (!needClockOut || hasClockOut);
        return Boolean(newDate && timesOk && reason.trim() && attachment);
    }, [correctionType, newClockIn, newClockOut, newDate, reason, attachment]);

    const handleOpenReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        setShowReview(true);
    };

    if (!isOpen) return null;

    // FIX: Changed attendanceData.clockIn to attendanceData.clock_in
    const originalDate = new Date(attendanceData.clock_in);
    const formattedDate = originalDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: APP_TIME_ZONE });
    const originalTime = new Intl.DateTimeFormat('id-ID', {
        timeZone: APP_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(originalDate);
    const showClockInReview =
        correctionType === 'missed_in' ||
        correctionType === 'missed_both' ||
        (correctionType === 'wrong_time' && !!newClockIn);
    const showClockOutReview =
        correctionType === 'missed_out' ||
        correctionType === 'missed_both' ||
        (correctionType === 'wrong_time' && !!newClockOut);

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl transform transition-all">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">Pembetulan Presensi</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleOpenReview}>
                    <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div>
                            <p className="font-semibold">Hari, Tanggal</p>
                            <p className="text-gray-600">{formattedDate}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            {/* Original Data Column */}
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h4 className="font-semibold text-lg mb-4">Presensi</h4>
                                <div className="space-y-3">
                                    <InfoField label="Periode Presensi" value={originalDate.toLocaleDateString('id-ID', { timeZone: APP_TIME_ZONE })} />
                                    <InfoField label="Clock In (WITA)" value={originalTime} />
                                    <InfoField
                                        label="Clock Out (WITA)"
                                        value={attendanceData.clock_out ? new Intl.DateTimeFormat('id-ID', {
                                            timeZone: APP_TIME_ZONE,
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false,
                                        }).format(new Date(attendanceData.clock_out)) : '-'}
                                    />
                                    {/* FIX: Changed attendanceData.lokasiKerja to attendanceData.lokasi_kerja */}
                                    <InfoField label="Lokasi Kerja" value={attendanceData.lokasi_kerja || '-'} />
                                    {/* FIX: Changed attendanceData.tempatKerja to attendanceData.tempat_kerja */}
                                    <InfoField label="Tempat Kerja" value={attendanceData.tempat_kerja || '-'} />
                                </div>
                            </div>

                            {/* Correction Form Column */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-lg">Pembetulan</h4>
                                <div>
                                    <label htmlFor="correctionType" className="block text-sm font-medium text-gray-700">Jenis Koreksi</label>
                                    <select id="correctionType" value={correctionType} onChange={e => setCorrectionType(e.target.value as CorrectionType)}
                                        className="mt-1 w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                        <option value="missed_in">Lupa Clock-In</option>
                                        <option value="missed_out">Lupa Clock-Out</option>
                                        <option value="missed_both">Lupa Clock-In & Clock-Out</option>
                                        <option value="wrong_time">Salah Jam (koreksi waktu)</option>
                                    </select>
                                </div>
                                <div className="relative">
                                    <label htmlFor="newDate" className="block text-sm font-medium text-gray-700">Periode Presensi</label>
                                    <input type="date" id="newDate" value={newDate} onChange={e => setNewDate(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                    <CalendarIcon className="absolute right-3 top-8 h-5 w-5 text-gray-400" />
                                </div>
                                {(correctionType !== 'missed_out') && (
                                    <div className="relative">
                                        <label htmlFor="newClockIn" className="block text-sm font-medium text-gray-700">Jam Clock-In (WITA)</label>
                                        <input type="time" id="newClockIn" value={newClockIn} onChange={e => setNewClockIn(e.target.value)}
                                            className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                        <TimeIcon className="absolute right-3 top-8 h-5 w-5 text-gray-400" />
                                    </div>
                                )}
                                {(correctionType !== 'missed_in') && (
                                    <div className="relative">
                                        <label htmlFor="newClockOut" className="block text-sm font-medium text-gray-700">Jam Clock-Out (WITA)</label>
                                        <input type="time" id="newClockOut" value={newClockOut} onChange={e => setNewClockOut(e.target.value)}
                                            className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                        <TimeIcon className="absolute right-3 top-8 h-5 w-5 text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Alasan/Keterangan Pembetulan</label>
                                    <textarea id="reason" rows={3} value={reason} onChange={e => setReason(e.target.value)}
                                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Bukti Alasan <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-4 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            <UploadIcon className="h-5 w-5 mr-2" />
                                            Unggah File
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsCameraOpen(true)}
                                            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                        >
                                            <CameraIcon className="h-5 w-5 mr-2" />
                                            Ambil Foto
                                        </button>
                                    </div>
                                    <input
                                        type="file"
                                        id="file-upload"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*,.pdf"
                                        className="hidden"
                                    />
                                    {attachment && <p className="text-xs text-gray-500 mt-2">File terpilih: {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                            Kembali
                        </button>
                        <button type="submit" disabled={!isFormValid}
                            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed">
                            Ajukan Pembetulan
                        </button>
                    </div>
                </form>
            </div>
            {isCameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
            {showReview && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h4 className="text-lg font-semibold text-gray-800">Kirim Pembetulan ke Atasan?</h4>
                            <button onClick={() => setShowReview(false)} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3 text-sm text-gray-700">
                            <div className="flex justify-between">
                                <span className="font-medium">Jenis Koreksi</span>
                                <span className="text-gray-900">
                                    {correctionType === 'missed_in' && 'Lupa Clock-In'}
                                    {correctionType === 'missed_out' && 'Lupa Clock-Out'}
                                    {correctionType === 'missed_both' && 'Lupa Clock-In & Clock-Out'}
                                    {correctionType === 'wrong_time' && 'Salah Jam'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Periode Presensi</span>
                                <span className="text-gray-900">{newDate}</span>
                            </div>
                            {showClockInReview && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Clock-In (WITA)</span>
                                    <span className="text-gray-900">{newClockIn}</span>
                                </div>
                            )}
                            {showClockOutReview && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Clock-Out (WITA)</span>
                                    <span className="text-gray-900">{newClockOut}</span>
                                </div>
                            )}
                            <div>
                                <p className="font-medium">Alasan</p>
                                <p className="text-gray-800 whitespace-pre-line">{reason}</p>
                            </div>
                            {attachment && (
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Lampiran</span>
                                    <span className="text-gray-900 text-xs">{attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)</span>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowReview(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Revisi
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isFormValid || !attachment) return;
                                    onSubmit({ correctionType, newDate, newClockIn, newClockOut, reason, attachment });
                                    setShowReview(false);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                            >
                                Yakin Kirim ke Atasan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InfoField: React.FC<{ label: string, value: string }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-800 bg-gray-100 p-2 rounded">{value}</p>
    </div>
);

export default KoreksiAbsensiModal;
