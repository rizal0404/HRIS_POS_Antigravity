import { ApiError } from './apiClient';

/**
 * Generic API error handler (replaces handleSupabaseError)
 * Kept for backward compatibility with existing service method signatures.
 */
export const handleApiError = (error: any, context: string) => {
    if (error) {
        console.error(`API error in ${context}:`, error);
        throw new Error(error.message || error.error || `An unknown error occurred in ${context}.`);
    }
};

/**
 * @deprecated Use api client directly. Kept for migration compatibility.
 */
export const handleSupabaseError = ({ error, data }: { error: any, data: any }, context: string) => {
    if (error) {
        console.error(`Error in ${context}:`, error);
        throw new Error(error.message || `An unknown database error occurred in ${context}.`);
    }
    return data;
};

// Helper for reverse geocoding using Nominatim
export async function getAddressFromCoords(lat: number, lon: number): Promise<string> {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        if (!response.ok) {
            console.warn(`Reverse geocoding request failed with status ${response.status}`);
            return `Koordinat: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        }
        const data = await response.json();
        return data.display_name || `Koordinat: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return 'Nama lokasi gagal dimuat. Periksa koneksi internet Anda.';
    }
}
