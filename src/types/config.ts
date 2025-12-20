// ==== CONFIG TYPES ====

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
    date: string;
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

export interface NotificationPreferences {
    new_request: boolean;
    request_approved: boolean;
    request_rejected: boolean;
    telegram_chat_id?: string | null;
}
