import React from 'react';

export enum UserRole {
  SUPERADMIN = 'superadmin',
  USER = 'user',
}

export interface UserProfile {
  id: string;
  nik: string | null;
  full_name: string; // Corresponds to full_name in DB
  email: string;
  role: UserRole;
  position: string;
  manager_id: string | null;
  avatar_url: string; // Corresponds to avatar_url in DB
  default_shift?: string;
  salary?: {
    gaji_pokok: number;
    tunjangan_jabatan: number;
    tunjangan_lain: number;
  };
  isManager?: boolean;
  phone_number?: string | null;
  place_of_birth?: string | null;
  date_of_birth?: string | null; // Stored as YYYY-MM-DD string
  education_level?: string | null;
  education_major?: string | null;
  employment_status?: string | null;
  address?: string | null;
}

export interface NavLink {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export enum RequestType {
    CUTI = 'Cuti',
    LEMBUR = 'Lembur',
    IZIN = 'Izin',
    SAKIT = 'Sakit',
    KOREKSI = 'Koreksi Absensi',
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
    attachment_url?: string; // Changed from attachment: File
    attendance_id_to_correct?: string;
    profiles?: Pick<UserProfile, 'full_name' | 'nik'> | null; // For joined data
    approvers?: Pick<UserProfile, 'full_name'> | null; // For joined data on approver_id
}

export interface Attendance {
    id: string;
    profile_id: string;
    clock_in: string;
    clock_out?: string;
    status: 'hadir' | 'terlambat' | 'pulang_cepat';
    lokasi_kerja?: string;
    tempat_kerja?: string;
    clock_in_coords?: { lat: number, lon: number };
    clock_out_coords?: { lat: number, lon: number };
    clock_in_address?: string;
    clock_out_address?: string;
}

export interface JadwalKerja {
    tanggal: string;
    shift: string;
}

export interface JadwalKerjaTim {
    profile_id: string;
    date: string; // YYYY-MM-DD
    shift: string; // e.g., 'SG Shift 2 Si', 'OFF'
    start_time?: string; // HH:mm
    end_time?: string; // HH:mm
}

export interface Shift {
    code: string;
    name: string;
    start_time: string | null;
    end_time: string | null;
    color: string;
    work_day_type: 'non-shift' | 'shift';
}

export interface Section {
  id: number;
  name: string;
  bureau_id: number;
}

export interface Bureau {
  id: number;
  name: string;
  sections: Section[];
  department_id: number;
}

export interface Department {
  id: number;
  name: string;
  bureaus: Bureau[];
}

export interface LeaveType {
  id: number;
  name: string;
  default_quota: number;
}

export interface OvertimeQuota {
  shift: {
    monthly: number;
    yearly: number;
  };
  nonShift: {
    monthly: number;
    yearly: number;
  };
}

export interface Holiday {
  id: number;
  date: string; // YYYY-DD-MM
  name: string;
}

export interface OvertimeConfiguration {
  id: number;
  hourly_wage_divider: number;
  normal_day: {
    first_hour_multiplier: number;
    subsequent_hours_multiplier: number;
  };
  non_shift: {
    first_eight_hours_multiplier: number;
    ninth_hour_multiplier: number;
    tenth_to_twelfth_hour_multiplier: number;
  };
  shift: {
    first_seven_hours_multiplier: number;
    eighth_hour_multiplier: number;
    ninth_to_eleventh_hour_multiplier: number;
  };
  max_hours_per_day: number;
  max_hours_per_month_non_shift: number;
  max_hours_per_month_shift: number;
}
