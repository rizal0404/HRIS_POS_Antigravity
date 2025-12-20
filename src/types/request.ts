import { UserProfile } from './user';

// ==== REQUEST TYPES ====

export enum RequestType {
    CUTI = 'Cuti',
    LEMBUR = 'Lembur',
    IZIN = 'Izin',
    SUBSTITUSI = 'Substitusi',
    SAKIT = 'Sakit',
    KOREKSI = 'Koreksi Absensi',
    REGISTRASI = 'Registrasi Pegawai',
}

export enum RequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    REVISED = 'revised',
}

export enum UsulanJenis {
    PembetulanPresensi = 'Pembetulan Presensi',
}

export enum UsulanStatus {
    Diajukan = 'diajukan',
    Disetujui = 'disetujui',
    Ditolak = 'ditolak',
}

export interface Request {
    id: string;
    profile_id: string;
    request_type: RequestType;
    start_date: string;
    end_date: string;
    reason: string;
    status: RequestStatus;
    approver_id?: string;
    created_at: string;
    updated_at?: string;
    day_shift_substitute_id?: string;
    night_shift_substitute_id?: string;
    start_time?: string;
    end_time?: string;
    attachment_url?: string;
    attendance_id_to_correct?: string;
    profiles?: Pick<UserProfile, 'full_name' | 'nik'> | null;
    approvers?: Pick<UserProfile, 'full_name'> | null;
}
