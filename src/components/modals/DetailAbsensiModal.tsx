"use client";

import React, { useEffect, useMemo } from 'react';
import { Attendance, UserProfile, JadwalKerjaTim } from '../../types';
import { XIcon } from '../icons';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

interface DetailAbsensiModalProps {
    isOpen: boolean;
    onClose: () => void;
    attendance: Attendance | null;
    user: UserProfile;
    schedule?: JadwalKerjaTim;
}

const MapController: React.FC<{ coords: L.LatLngExpression[] }> = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
        if (coords.length > 0) {
            const bounds = L.latLngBounds(coords);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [coords, map]);
    return null;
};


const DetailAbsensiModal: React.FC<DetailAbsensiModalProps> = ({ isOpen, onClose, attendance, user, schedule }) => {
    if (!isOpen || !attendance) return null;

    // FIX: Changed attendance.clockIn to attendance.clock_in
    const clockInDate = new Date(attendance.clock_in);
    // FIX: Changed attendance.clockOut to attendance.clock_out
    const clockOutDate = attendance.clock_out ? new Date(attendance.clock_out) : null;

    const mapCoords = useMemo(() => {
        const coords: L.LatLngExpression[] = [];
        // FIX: Changed attendance.clockInCoords to attendance.clock_in_coords
        if (attendance.clock_in_coords) {
            // FIX: Changed attendance.clockInCoords to attendance.clock_in_coords
            coords.push([attendance.clock_in_coords.lat, attendance.clock_in_coords.lon]);
        }
        // FIX: Changed attendance.clockOutCoords to attendance.clock_out_coords
        if (attendance.clock_out_coords) {
            // FIX: Changed attendance.clockOutCoords to attendance.clock_out_coords
            coords.push([attendance.clock_out_coords.lat, attendance.clock_out_coords.lon]);
        }
        return coords;
    }, [attendance]);

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTimeWithWITA = (date: Date): string => {
        return `pukul ${date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Makassar'
        })} WITA`;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2 z-10">
                    <XIcon className="h-6 w-6" />
                </button>
                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-gray-500">Karyawan</p>
                        <p className="font-semibold text-gray-800 mt-1">{user.id.toUpperCase()}</p>
                        {/* FIX: Changed user.fullName to user.full_name */}
                        <p className="font-bold text-xl text-gray-900">{user.full_name.toUpperCase()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Hari, Tanggal</p>
                        <div className="flex items-center space-x-2">
                            <p className="font-bold text-lg">{formatDate(clockInDate)}</p>
                            {schedule?.shift && (
                                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">{schedule.shift}</span>
                            )}
                        </div>
                    </div>

                    <div className="h-64 w-full rounded-lg overflow-hidden bg-gray-200">
                        <MapContainer center={[-4.7877, 119.6157]} zoom={16} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {/* FIX: Changed attendance.clockInCoords to attendance.clock_in_coords */}
                            {attendance.clock_in_coords && (
                                <Marker position={[attendance.clock_in_coords.lat, attendance.clock_in_coords.lon]} icon={greenIcon} />
                            )}
                            {/* FIX: Changed attendance.clockOutCoords to attendance.clock_out_coords */}
                            {attendance.clock_out_coords && (
                                <Marker position={[attendance.clock_out_coords.lat, attendance.clock_out_coords.lon]} icon={redIcon} />
                            )}
                            {mapCoords.length > 0 && <MapController coords={mapCoords} />}
                        </MapContainer>
                    </div>

                    <div className="bg-gray-100 p-4 rounded-lg space-y-4">
                        <div>
                            <p className="font-bold text-red-600">In</p>
                            <p className="font-semibold">{clockInDate.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })} {formatTimeWithWITA(clockInDate)}</p>
                            {/* FIX: Changed attendance.clockInAddress to attendance.clock_in_address */}
                            <p className="text-sm text-gray-600 whitespace-pre-line">{attendance.clock_in_address}</p>
                        </div>
                        {clockOutDate && (
                            <div>
                                <p className="font-bold text-red-600">Out</p>
                                <p className="font-semibold">{clockOutDate.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })} {formatTimeWithWITA(clockOutDate)}</p>
                                {/* FIX: Changed attendance.clockOutAddress to attendance.clock_out_address */}
                                <p className="text-sm text-gray-600 whitespace-pre-line">{attendance.clock_out_address}</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-gray-700 focus:outline-none">
                        Kembali
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DetailAbsensiModal;