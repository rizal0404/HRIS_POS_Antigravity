// ==== DISCIPLINE & WORKPLACE TYPES ====

export interface Workplace {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface DisciplineScore {
    id: string;
    profile_id: string;
    period_month: number;
    period_year: number;
    late_count: number;
    early_leave_count: number;
    wrong_location_count: number;
    correction_count: number;
    sick_leave_count: number;    // Health reminder, no penalty
    base_score: number;
    final_score: number;
    created_at?: string;
    updated_at?: string;
}

export interface DisciplineConfig {
    late_penalty: number;           // default: 2
    early_leave_penalty: number;    // default: 2
    wrong_location_penalty: number; // default: 5
    correction_penalty: number;     // default: 1
    base_score: number;             // default: 100
}

export const DEFAULT_DISCIPLINE_CONFIG: DisciplineConfig = {
    late_penalty: 2,
    early_leave_penalty: 2,
    wrong_location_penalty: 5,
    correction_penalty: 1,
    base_score: 100,
};

// Helper type for discipline calculation result
export interface DisciplineCalculationResult {
    late_count: number;
    early_leave_count: number;
    wrong_location_count: number;
    correction_count: number;
    sick_leave_count: number;
    final_score: number;
}
