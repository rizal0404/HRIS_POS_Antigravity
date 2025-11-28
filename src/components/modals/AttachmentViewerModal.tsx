
"use client";

import React from 'react';
import { XIcon } from '../icons';

interface AttachmentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string | null;
}

const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({ isOpen, onClose, fileUrl }) => {
    if (!isOpen || !fileUrl) return null;

    const fileName = fileUrl.split('/').pop()?.split('?')[0] || 'attachment';
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
    const isPdf = /\.pdf$/i.test(fileName);
    
    // Blob URLs don't have a meaningful file name in the URL itself
    const downloadName = fileUrl.startsWith('blob:') ? 'attachment' : fileName;


    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">{fileName}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-2 flex-1 bg-gray-200 flex justify-center items-center">
                    {isImage ? (
                        <img src={fileUrl} alt={fileName} className="max-h-full max-w-full object-contain" />
                    ) : isPdf ? (
                        <iframe src={fileUrl} className="w-full h-full" title={fileName} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <p className="text-gray-700">Preview not available for this file type.</p>
                            <a href={fileUrl} download={downloadName} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Download {downloadName}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttachmentViewerModal;
