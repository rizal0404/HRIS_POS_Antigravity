import React from 'react';
import { Workplace } from './discipline';

// ==== USER TYPES ====

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
    workplace_id?: string | null;
    workplace?: Workplace | null;
    salary?: {
        gaji_pokok: number;
        tunjangan_jabatan: number;
        tunjangan_lain: number;
    };
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

export interface NavLink {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}
