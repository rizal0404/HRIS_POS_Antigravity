
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Attendance } from '../../types';
import { XIcon, CalendarIcon, TimeIcon, UploadIcon, CameraIcon } from '../icons';

interface KoreksiAbsensiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { clockType: 'in' | 'out', newDate: string, newTime: string, reason: string, attachment: File }) => void;
    attendanceData: Attendance;
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


const KoreksiAbsensiModal: React.FC<KoreksiAbsensiModalProps> = ({ isOpen, onClose, onSubmit, attendanceData }) => {
    const [clockType, setClockType] = useState<'in' | 'out'>('in');
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [reason, setReason] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (isOpen && attendanceData) {
            // FIX: Changed attendanceData.clockIn to attendanceData.clock_in
            const originalDate = new Date(attendanceData.clock_in);
            setNewDate(originalDate.toISOString().split('T')[0]);
            setNewTime(originalDate.toTimeString().substring(0, 5));
            setReason('');
            setAttachment(null);
            setClockType('in');
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
        return newDate && newTime && reason.trim() && attachment;
    }, [newDate, newTime, reason, attachment]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid || !attachment) return; // Added null check for attachment
        onSubmit({ clockType, newDate, newTime, reason, attachment });
    };

    if (!isOpen) return null;

    // FIX: Changed attendanceData.clockIn to attendanceData.clock_in
    const originalDate = new Date(attendanceData.clock_in);
    const formattedDate = originalDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const originalTime = originalDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl transform transition-all">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">Pembetulan Presensi</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
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
                                    <InfoField label="Clock Type" value="Clock In" />
                                    <InfoField label="Periode Presensi" value={originalDate.toLocaleDateString('id-ID')} />
                                    <InfoField label="Jam (WIB)" value={originalTime} />
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
                                    <label htmlFor="clockType" className="block text-sm font-medium text-gray-700">Clock Type</label>
                                    <select id="clockType" value={clockType} onChange={e => setClockType(e.target.value as 'in' | 'out')}
                                        className="mt-1 w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                        <option value="in">Clock In</option>
                                        <option value="out">Clock Out</option>
                                    </select>
                                </div>
                                <div className="relative">
                                    <label htmlFor="newDate" className="block text-sm font-medium text-gray-700">Periode Presensi</label>
                                    <input type="date" id="newDate" value={newDate} onChange={e => setNewDate(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                    <CalendarIcon className="absolute right-3 top-8 h-5 w-5 text-gray-400" />
                                </div>
                                <div className="relative">
                                    <label htmlFor="newTime" className="block text-sm font-medium text-gray-700">Jam (WIB)</label>
                                    <input type="time" id="newTime" value={newTime} onChange={e => setNewTime(e.target.value)}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                    <TimeIcon className="absolute right-3 top-8 h-5 w-5 text-gray-400" />
                                </div>
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
