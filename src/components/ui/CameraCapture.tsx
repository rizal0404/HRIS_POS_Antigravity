import React, { useRef, useState, useEffect } from 'react';

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
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
                0.7
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

export default CameraCapture;
