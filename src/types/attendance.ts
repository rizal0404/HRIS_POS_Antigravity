// ==== ATTENDANCE TYPES ====

export enum AttendanceStatus {
    PRESENT = 'hadir',
    LATE = 'terlambat',
    EARLY_LEAVE = 'pulang_cepat',
    ABSENT = 'absent',
    INCOMPLETE = 'incomplete',
    IN_PROGRESS = 'in_progress',
}

export interface Attendance {
    id: string;
    profile_id: string;
    clock_in: string;
    clock_out?: string;
    status: AttendanceStatus | 'hadir' | 'terlambat' | 'pulang_cepat' | 'absent' | 'incomplete' | 'in_progress';
    work_date?: string;
    lokasi_kerja?: string;
    tempat_kerja?: string;
    clock_in_coords?: { lat: number, lon: number };
    clock_out_coords?: { lat: number, lon: number };
    clock_in_address?: string;
    clock_out_address?: string;
    worked_minutes?: number | null;
    late_minutes?: number | null;
    early_leave_minutes?: number | null;
    source?: string | null;
    catatan?: string; // Notes including validation flags
}

export interface JadwalKerja {
    tanggal: string;
    shift: string;
}

export interface JadwalKerjaTim {
    profile_id: string;
    date: string;
    shift: string;
    start_time?: string;
    end_time?: string;
}
