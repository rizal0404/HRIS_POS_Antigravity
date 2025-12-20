// ==== ORGANIZATION TYPES ====

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
