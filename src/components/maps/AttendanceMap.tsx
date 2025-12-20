"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface AttendanceMapProps {
    clockInPos?: { lat: number; lng: number; address?: string };
    clockOutPos?: { lat: number; lng: number; address?: string };
    currentPos?: { lat: number; lng: number };
    className?: string;
}

const ChangeView: React.FC<{ bounds: L.LatLngBoundsExpression | null, center: L.LatLngExpression | null }> = ({ bounds, center }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (center) {
            map.flyTo(center, 13);
        }
    }, [bounds, center, map]);
    return null;
};

const AttendanceMap: React.FC<AttendanceMapProps> = ({ clockInPos, clockOutPos, currentPos, className }) => {
    // Default to Makassar/Tonasa if nothing else
    const defaultCenter: L.LatLngExpression = [-4.788360643865878, 119.61309925103656];

    let bounds: L.LatLngBoundsExpression | null = null;
    let center: L.LatLngExpression | null = currentPos ? [currentPos.lat, currentPos.lng] : defaultCenter;

    const points = [];
    if (clockInPos) points.push(L.latLng(clockInPos.lat, clockInPos.lng));
    if (clockOutPos) points.push(L.latLng(clockOutPos.lat, clockOutPos.lng));
    if (currentPos) points.push(L.latLng(currentPos.lat, currentPos.lng));

    if (points.length > 1) {
        const group = L.featureGroup(points as any);
        bounds = group.getBounds();
    } else if (points.length === 1) {
        center = points[0];
    }

    return (
        <div className={`rounded-xl overflow-hidden z-0 ${className}`}>
            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <ChangeView bounds={bounds} center={center} />
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {clockInPos && (
                    <Marker position={[clockInPos.lat, clockInPos.lng]} icon={greenIcon}>
                        <Popup>
                            <div className="font-semibold text-sm">Clock In</div>
                            <div className="text-xs">{clockInPos.address}</div>
                        </Popup>
                    </Marker>
                )}

                {clockOutPos && (
                    <Marker position={[clockOutPos.lat, clockOutPos.lng]} icon={redIcon}>
                        <Popup>
                            <div className="font-semibold text-sm">Clock Out</div>
                            <div className="text-xs">{clockOutPos.address}</div>
                        </Popup>
                    </Marker>
                )}

                {currentPos && !clockInPos && !clockOutPos && (
                    <Marker position={[currentPos.lat, currentPos.lng]} icon={blueIcon}>
                        <Popup>Lokasi Anda</Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
};

export default AttendanceMap;
