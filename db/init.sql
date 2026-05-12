-- ============================================================
-- HRIS-POS Database Initialization Script
-- Migrated from Supabase to standalone PostgreSQL
-- ============================================================
-- This script creates all enums, tables, functions, and triggers
-- needed for the HRIS-POS application running on a VPS.
-- No RLS is needed — authentication is handled by the Express API.
-- ============================================================

-- ===================== EXTENSIONS =====================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ===================== ENUMS =====================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('superadmin', 'user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('hadir', 'terlambat', 'pulang_cepat', 'absent', 'incomplete', 'in_progress');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'revised', 'revision');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE request_type AS ENUM ('Cuti', 'Lembur', 'Izin', 'Sakit', 'Koreksi Absensi', 'Registrasi Pegawai', 'Substitusi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE work_day_type AS ENUM ('non-shift', 'shift');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ===================== TABLES =====================

-- Workplaces (referenced by profiles)
CREATE TABLE IF NOT EXISTS workplaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 350,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Departments → Bureaus → Sections hierarchy
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS bureaus (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    department_id INTEGER NOT NULL REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    bureau_id INTEGER NOT NULL REFERENCES bureaus(id)
);

-- Profiles (users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    position TEXT,
    role user_role NOT NULL DEFAULT 'user',
    manager_id UUID REFERENCES profiles(id),
    avatar_url TEXT,
    default_shift TEXT,
    salary JSONB,
    phone_number TEXT,
    nik TEXT UNIQUE,
    workplace_id UUID REFERENCES workplaces(id),
    place_of_birth TEXT,
    date_of_birth DATE,
    education_level TEXT,
    education_major TEXT,
    employment_status TEXT,
    address TEXT,
    approved BOOLEAN NOT NULL DEFAULT false,
    telegram_chat_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE profiles IS 'Stores public user profile information.';
COMMENT ON COLUMN profiles.manager_id IS 'Self-referencing key for manager-subordinate relationship.';

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
    code VARCHAR PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TIME,
    end_time TIME,
    color TEXT,
    work_day_type work_day_type NOT NULL
);
COMMENT ON TABLE shifts IS 'Master data for all available work shifts.';

-- Work Schedules
CREATE TABLE IF NOT EXISTS work_schedules (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    date DATE NOT NULL,
    shift_code VARCHAR NOT NULL REFERENCES shifts(code)
);
COMMENT ON TABLE work_schedules IS 'Assigns a specific shift to an employee for a given day.';

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    status attendance_status NOT NULL,
    work_date DATE NOT NULL,
    lokasi_kerja TEXT,
    tempat_kerja TEXT,
    clock_in_coords JSONB,
    clock_out_coords JSONB,
    clock_in_address TEXT,
    clock_out_address TEXT,
    clock_in_selfie_url TEXT,
    clock_out_selfie_url TEXT,
    worked_minutes INTEGER,
    late_minutes INTEGER,
    early_leave_minutes INTEGER,
    source TEXT,
    catatan TEXT,
    attendance_flags TEXT[],
    updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE attendance IS 'Records employee clock-in and clock-out events.';

-- Requests
CREATE TABLE IF NOT EXISTS requests (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    request_type request_type NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    start_time TIME,
    end_time TIME,
    approver_id UUID REFERENCES profiles(id),
    approver_notes TEXT,
    day_shift_substitute_id UUID REFERENCES profiles(id),
    night_shift_substitute_id UUID REFERENCES profiles(id),
    attachment_url TEXT,
    attendance_id_to_correct BIGINT REFERENCES attendance(id),
    is_manager_assigned BOOLEAN NOT NULL DEFAULT false,
    assigned_by_id UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE requests IS 'Central table for all employee-submitted requests.';
COMMENT ON COLUMN requests.attachment_url IS 'Link to supporting documents in cloud storage.';
COMMENT ON COLUMN requests.is_manager_assigned IS 'True if this request was created by a manager on behalf of a subordinate';
COMMENT ON COLUMN requests.assigned_by_id IS 'ID of the manager who created this request on behalf of the subordinate';

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    default_quota INTEGER NOT NULL CHECK (default_quota >= 0)
);
COMMENT ON TABLE leave_types IS 'Master data for leave types (Annual, Sick, etc.).';

-- Holidays
CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL
);
COMMENT ON TABLE holidays IS 'Stores dates of national holidays.';

-- Overtime Configuration (singleton)
CREATE TABLE IF NOT EXISTS overtime_configuration (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    hourly_wage_divider INTEGER NOT NULL,
    max_hours_per_day INTEGER NOT NULL,
    max_hours_per_month_shift INTEGER NOT NULL,
    max_hours_per_month_non_shift INTEGER NOT NULL,
    normal_day_first_hour_multiplier NUMERIC NOT NULL,
    normal_day_subsequent_hours_multiplier NUMERIC NOT NULL,
    non_shift_first_eight_hours_multiplier NUMERIC NOT NULL,
    non_shift_ninth_hour_multiplier NUMERIC NOT NULL,
    non_shift_tenth_to_twelfth_hour_multiplier NUMERIC NOT NULL,
    shift_first_seven_hours_multiplier NUMERIC NOT NULL,
    shift_eighth_hour_multiplier NUMERIC NOT NULL,
    shift_ninth_to_eleventh_hour_multiplier NUMERIC NOT NULL
);
COMMENT ON TABLE overtime_configuration IS 'Stores global parameters for overtime pay calculation.';

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id),
    telegram_chat_id TEXT,
    new_request BOOLEAN NOT NULL DEFAULT true,
    request_approved BOOLEAN NOT NULL DEFAULT true,
    request_rejected BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification Jobs (queue)
CREATE TABLE IF NOT EXISTS notification_jobs (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    request_id BIGINT NOT NULL REFERENCES requests(id),
    event TEXT NOT NULL CHECK (event = ANY (ARRAY['created', 'approved', 'rejected'])),
    processed_at TIMESTAMPTZ,
    last_error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
    id BIGSERIAL PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    request_id BIGINT REFERENCES requests(id),
    event TEXT NOT NULL CHECK (event = ANY (ARRAY['created', 'approved', 'rejected'])),
    status TEXT NOT NULL CHECK (status = ANY (ARRAY['queued', 'sent', 'failed'])),
    error_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Discipline Configuration (singleton-ish)
CREATE TABLE IF NOT EXISTS discipline_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    late_penalty INTEGER NOT NULL DEFAULT 2,
    early_leave_penalty INTEGER NOT NULL DEFAULT 2,
    wrong_location_penalty INTEGER NOT NULL DEFAULT 5,
    correction_penalty INTEGER NOT NULL DEFAULT 1,
    base_score INTEGER NOT NULL DEFAULT 100,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES profiles(id)
);

-- Discipline Scores
CREATE TABLE IF NOT EXISTS discipline_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2020),
    late_count INTEGER DEFAULT 0,
    early_leave_count INTEGER DEFAULT 0,
    wrong_location_count INTEGER DEFAULT 0,
    correction_count INTEGER DEFAULT 0,
    sick_leave_count INTEGER DEFAULT 0,
    base_score INTEGER DEFAULT 100,
    final_score INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (profile_id, period_month, period_year)
);

-- Attendance Logs (for debugging)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id BIGINT REFERENCES attendance(id),
    profile_id UUID REFERENCES profiles(id),
    log_type TEXT NOT NULL,
    log_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE attendance_logs IS 'Stores logs for abnormal attendance cases only - used for debugging calculation issues';
COMMENT ON COLUMN attendance_logs.log_type IS 'Type of anomaly: missing_schedule, calculation_mismatch, incomplete_data, schedule_stale';
COMMENT ON COLUMN attendance_logs.log_data IS 'JSONB containing: schedule_used, clock_in, clock_out, calculated_values, expected_values';

-- Grace Period Config
CREATE TABLE IF NOT EXISTS grace_period_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_code TEXT REFERENCES shifts(code),
    description TEXT,
    grace_minutes_in INTEGER NOT NULL DEFAULT 10,
    grace_minutes_out INTEGER NOT NULL DEFAULT 10,
    is_default BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE grace_period_config IS 'Konfigurasi toleransi waktu (grace period) per shift. Digunakan untuk menentukan status terlambat/pulang_cepat.';


-- ===================== INDEXES =====================
CREATE INDEX IF NOT EXISTS idx_attendance_profile_id ON attendance(profile_id);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance(clock_in);
CREATE INDEX IF NOT EXISTS idx_requests_profile_id ON requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_approver_id ON requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_profile_date ON work_schedules(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_unprocessed ON notification_jobs(processed_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_discipline_scores_profile_period ON discipline_scores(profile_id, period_month, period_year);


-- ===================== FUNCTIONS =====================

-- Calculate distance in meters (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
    lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    R DOUBLE PRECISION := 6371000;
    phi1 DOUBLE PRECISION;
    phi2 DOUBLE PRECISION;
    delta_phi DOUBLE PRECISION;
    delta_lambda DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    phi1 := lat1 * PI() / 180;
    phi2 := lat2 * PI() / 180;
    delta_phi := (lat2 - lat1) * PI() / 180;
    delta_lambda := (lon2 - lon1) * PI() / 180;
    a := SIN(delta_phi / 2) * SIN(delta_phi / 2) +
         COS(phi1) * COS(phi2) * SIN(delta_lambda / 2) * SIN(delta_lambda / 2);
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    RETURN R * c;
END;
$$;

-- Calculate discipline score
CREATE OR REPLACE FUNCTION calculate_discipline_score(
    p_profile_id UUID, p_month INTEGER, p_year INTEGER
) RETURNS TABLE(
    late_count INTEGER, early_leave_count INTEGER, wrong_location_count INTEGER,
    correction_count INTEGER, sick_leave_count INTEGER, final_score INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_late_count INTEGER;
    v_early_leave_count INTEGER;
    v_wrong_location_count INTEGER := 0;
    v_correction_count INTEGER;
    v_sick_leave_count INTEGER;
    v_user_workplace RECORD;
    v_final_score INTEGER;
    v_attendance RECORD;
    v_config RECORD;
BEGIN
    SELECT * INTO v_config FROM discipline_configuration LIMIT 1;
    IF v_config IS NULL THEN
        v_config := ROW(
            gen_random_uuid(), 2, 2, 5, 1, 100, NOW(), NULL
        )::discipline_configuration;
    END IF;

    SELECT w.* INTO v_user_workplace
    FROM profiles p
    LEFT JOIN workplaces w ON w.id = p.workplace_id
    WHERE p.id = p_profile_id;

    SELECT COUNT(*)::INTEGER INTO v_late_count
    FROM attendance
    WHERE attendance.profile_id = p_profile_id
      AND EXTRACT(MONTH FROM attendance.clock_in::timestamp) = p_month
      AND EXTRACT(YEAR FROM attendance.clock_in::timestamp) = p_year
      AND (attendance.status = 'terlambat' OR COALESCE(attendance.late_minutes, 0) > 0);

    SELECT COUNT(*)::INTEGER INTO v_early_leave_count
    FROM attendance
    WHERE attendance.profile_id = p_profile_id
      AND EXTRACT(MONTH FROM attendance.clock_in::timestamp) = p_month
      AND EXTRACT(YEAR FROM attendance.clock_in::timestamp) = p_year
      AND (attendance.status = 'pulang_cepat' OR COALESCE(attendance.early_leave_minutes, 0) > 0);

    IF v_user_workplace.id IS NOT NULL THEN
        FOR v_attendance IN
            SELECT * FROM attendance
            WHERE attendance.profile_id = p_profile_id
              AND EXTRACT(MONTH FROM attendance.clock_in::timestamp) = p_month
              AND EXTRACT(YEAR FROM attendance.clock_in::timestamp) = p_year
              AND attendance.clock_in_coords IS NOT NULL
        LOOP
            IF calculate_distance_meters(
                v_user_workplace.latitude, v_user_workplace.longitude,
                (v_attendance.clock_in_coords->>'lat')::DOUBLE PRECISION,
                (v_attendance.clock_in_coords->>'lon')::DOUBLE PRECISION
            ) > v_user_workplace.radius_meters THEN
                v_wrong_location_count := v_wrong_location_count + 1;
            END IF;
        END LOOP;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_correction_count
    FROM requests
    WHERE requests.profile_id = p_profile_id
      AND requests.request_type = 'Koreksi Absensi'
      AND EXTRACT(MONTH FROM requests.created_at) = p_month
      AND EXTRACT(YEAR FROM requests.created_at) = p_year;

    SELECT COUNT(*)::INTEGER INTO v_sick_leave_count
    FROM requests
    WHERE requests.profile_id = p_profile_id
      AND requests.request_type = 'Sakit'
      AND EXTRACT(MONTH FROM requests.created_at) = p_month
      AND EXTRACT(YEAR FROM requests.created_at) = p_year;

    v_final_score := GREATEST(0, v_config.base_score
        - (v_late_count * v_config.late_penalty)
        - (v_early_leave_count * v_config.early_leave_penalty)
        - (v_wrong_location_count * v_config.wrong_location_penalty)
        - (v_correction_count * v_config.correction_penalty));

    RETURN QUERY SELECT v_late_count, v_early_leave_count, v_wrong_location_count,
        v_correction_count, v_sick_leave_count, v_final_score;
END;
$$;

-- Upsert discipline score
CREATE OR REPLACE FUNCTION upsert_discipline_score(
    p_profile_id UUID, p_month INTEGER, p_year INTEGER
) RETURNS discipline_scores
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_result RECORD;
    v_score discipline_scores;
BEGIN
    SELECT * INTO v_result FROM calculate_discipline_score(p_profile_id, p_month, p_year);
    INSERT INTO discipline_scores (
        profile_id, period_month, period_year,
        late_count, early_leave_count, wrong_location_count,
        correction_count, sick_leave_count, final_score, updated_at
    ) VALUES (
        p_profile_id, p_month, p_year,
        v_result.late_count, v_result.early_leave_count, v_result.wrong_location_count,
        v_result.correction_count, v_result.sick_leave_count, v_result.final_score, NOW()
    )
    ON CONFLICT (profile_id, period_month, period_year)
    DO UPDATE SET
        late_count = v_result.late_count,
        early_leave_count = v_result.early_leave_count,
        wrong_location_count = v_result.wrong_location_count,
        correction_count = v_result.correction_count,
        sick_leave_count = v_result.sick_leave_count,
        final_score = v_result.final_score,
        updated_at = NOW()
    RETURNING * INTO v_score;
    RETURN v_score;
END;
$$;

-- Get grace period config for a shift
CREATE OR REPLACE FUNCTION get_grace_config(p_shift_code TEXT)
RETURNS TABLE(grace_minutes_in INTEGER, grace_minutes_out INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT gpc.grace_minutes_in, gpc.grace_minutes_out
    FROM grace_period_config gpc
    WHERE gpc.shift_code = p_shift_code
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT gpc.grace_minutes_in, gpc.grace_minutes_out
        FROM grace_period_config gpc
        WHERE gpc.is_default = TRUE
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 10, 10;
    END IF;
END;
$$;

-- Delete shift and reassign schedules to 'OFF'
CREATE OR REPLACE FUNCTION delete_shift_and_reassign(p_shift_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    off_shift_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM shifts WHERE code = 'OFF') INTO off_shift_exists;
    IF NOT off_shift_exists THEN
        RAISE EXCEPTION 'Cannot delete shift. The fallback "OFF" shift does not exist.';
    END IF;
    UPDATE work_schedules SET shift_code = 'OFF' WHERE shift_code = p_shift_code;
    DELETE FROM shifts WHERE code = p_shift_code;
END;
$$;


-- ===================== TRIGGER FUNCTIONS =====================

-- Auto-enqueue notification jobs on request changes
CREATE OR REPLACE FUNCTION enqueue_notification_from_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF tg_op = 'INSERT' THEN
        INSERT INTO notification_jobs (profile_id, request_id, event)
        VALUES (NEW.profile_id, NEW.id, 'created');
        IF NEW.approver_id IS NOT NULL THEN
            INSERT INTO notification_jobs (profile_id, request_id, event)
            VALUES (NEW.approver_id, NEW.id, 'created');
        END IF;
    ELSIF tg_op = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'approved' THEN
            INSERT INTO notification_jobs (profile_id, request_id, event)
            VALUES (NEW.profile_id, NEW.id, 'approved');
        ELSIF NEW.status = 'rejected' THEN
            INSERT INTO notification_jobs (profile_id, request_id, event)
            VALUES (NEW.profile_id, NEW.id, 'rejected');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Updated_at trigger for notification_preferences
CREATE OR REPLACE FUNCTION notification_preferences_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Updated_at trigger for grace_period_config
CREATE OR REPLACE FUNCTION update_grace_period_config_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ===================== TRIGGERS =====================

-- Only create triggers if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_request_notification') THEN
        CREATE TRIGGER trg_request_notification
            AFTER INSERT OR UPDATE ON requests
            FOR EACH ROW
            EXECUTE FUNCTION enqueue_notification_from_request();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notification_preferences_updated_at') THEN
        CREATE TRIGGER trg_notification_preferences_updated_at
            BEFORE UPDATE ON notification_preferences
            FOR EACH ROW
            EXECUTE FUNCTION notification_preferences_set_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_grace_period_config_updated_at') THEN
        CREATE TRIGGER trg_grace_period_config_updated_at
            BEFORE UPDATE ON grace_period_config
            FOR EACH ROW
            EXECUTE FUNCTION update_grace_period_config_timestamp();
    END IF;
END $$;


-- ===================== BETTER AUTH TABLES =====================
-- Better Auth will create its own tables (user, session, account, verification)
-- automatically on first run. We just need profiles to exist.


-- ===================== COMPLETION =====================
DO $$ BEGIN
    RAISE NOTICE '✅ HRIS-POS database initialization complete!';
END $$;
