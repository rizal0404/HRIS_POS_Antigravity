// Type definitions shared with web app
// These mirror the types from the web app's src/types folder

export enum UserRole {
    SUPERADMIN = 'superadmin',
    ADMIN = 'admin',
    PENDING = 'pending',
    USER = 'user',
}

export interface UserProfile {
    id: string;
    nik: string | null;
    full_name: string;
    email: string;
    role: UserRole;
    approved?: boolean;
    position: string;
    manager_id: string | null;
    avatar_url: string;
    default_shift?: string;
    isManager?: boolean;
    phone_number?: string | null;
    place_of_birth?: string | null;
    date_of_birth?: string | null;
    education_level?: string | null;
    education_major?: string | null;
    employment_status?: string | null;
    address?: string | null;
    telegram_chat_id?: string | null;
}

// Attendance status - using string literals for compatibility
export type AttendanceStatus = 'hadir' | 'terlambat' | 'pulang_cepat' | 'absent' | 'incomplete' | 'in_progress';

export interface Attendance {
    id: string;
    profile_id: string;
    clock_in: string;
    clock_out?: string;
    status: AttendanceStatus | string;
    work_date?: string;
    lokasi_kerja?: string;
    tempat_kerja?: string;
    clock_in_address?: string;
    clock_out_address?: string;
    clock_in_coords?: { lat: number; lon: number };
    clock_out_coords?: { lat: number; lon: number };
    clock_in_selfie_url?: string;
    clock_out_selfie_url?: string;
    worked_minutes?: number;
    late_minutes?: number;
    early_leave_minutes?: number;
    source?: string;
}

// Schedule types
export interface JadwalKerjaTim {
    profile_id: string;
    date: string;
    shift: string;
    start_time?: string;
    end_time?: string;
}

export interface Shift {
    id: string;
    name: string;
    code: string;
    start_time: string;
    end_time: string;
}

export enum RequestType {
    CUTI = 'Cuti',
    LEMBUR = 'Lembur',
    IZIN = 'Izin',
    SUBSTITUSI = 'Substitusi',
    SAKIT = 'Sakit',
    KOREKSI = 'Koreksi Absensi',
}

export enum RequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    REVISED = 'revised',
}

export interface Request {
    id: string;
    profile_id: string;
    request_type: RequestType | string;
    start_date: string;
    end_date: string;
    start_time?: string;
    reason: string;
    status: RequestStatus | string;
    approver_id?: string;
    created_at: string;
    attachment_url?: string;
    attendance_id_to_correct?: string;
}

// Correction types
export type CorrectionType = 'missed_in' | 'missed_out' | 'missed_both' | 'wrong_time';
