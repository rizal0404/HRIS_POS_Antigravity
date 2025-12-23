-- =====================================================
-- SQL Migration: Discipline Configuration Table
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create discipline_configuration table
CREATE TABLE IF NOT EXISTS discipline_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    late_penalty INTEGER NOT NULL DEFAULT 2,
    early_leave_penalty INTEGER NOT NULL DEFAULT 2,
    wrong_location_penalty INTEGER NOT NULL DEFAULT 5,
    correction_penalty INTEGER NOT NULL DEFAULT 1,
    base_score INTEGER NOT NULL DEFAULT 100,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- 2. Insert default configuration
INSERT INTO discipline_configuration (late_penalty, early_leave_penalty, wrong_location_penalty, correction_penalty, base_score)
VALUES (2, 2, 5, 1, 100)
ON CONFLICT DO NOTHING;

-- 3. Enable RLS
ALTER TABLE discipline_configuration ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
-- Allow anyone to view the configuration
CREATE POLICY "Anyone can view discipline_configuration" ON discipline_configuration
    FOR SELECT USING (true);

-- Only superadmin can update
CREATE POLICY "Only superadmin can update discipline_configuration" ON discipline_configuration
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- Only superadmin can insert (in case the table is empty)
CREATE POLICY "Only superadmin can insert discipline_configuration" ON discipline_configuration
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
    );

-- =====================================================
-- SQL: Update calculate_discipline_score function
-- Run this after creating the table
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_discipline_score(
    p_profile_id UUID,
    p_month INTEGER,
    p_year INTEGER
)
RETURNS TABLE (
    late_count INTEGER,
    early_leave_count INTEGER,
    wrong_location_count INTEGER,
    correction_count INTEGER,
    sick_leave_count INTEGER,
    final_score INTEGER
) AS $$
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
    -- Get discipline configuration
    SELECT * INTO v_config FROM discipline_configuration LIMIT 1;
    IF v_config IS NULL THEN
        -- Use default values if no config exists
        v_config := ROW(
            gen_random_uuid(), -- id
            2,   -- late_penalty
            2,   -- early_leave_penalty
            5,   -- wrong_location_penalty
            1,   -- correction_penalty
            100, -- base_score
            NOW(), -- updated_at
            NULL   -- updated_by
        )::discipline_configuration;
    END IF;

    -- Get user's assigned workplace
    SELECT w.* INTO v_user_workplace
    FROM profiles p
    LEFT JOIN workplaces w ON w.id = p.workplace_id
    WHERE p.id = p_profile_id;
    
    -- Count late arrivals
    SELECT COUNT(*)::INTEGER INTO v_late_count
    FROM attendance
    WHERE attendance.profile_id = p_profile_id
      AND EXTRACT(MONTH FROM attendance.clock_in::timestamp) = p_month
      AND EXTRACT(YEAR FROM attendance.clock_in::timestamp) = p_year
      AND (attendance.status = 'terlambat' OR COALESCE(attendance.late_minutes, 0) > 0);
    
    -- Count early leaves
    SELECT COUNT(*)::INTEGER INTO v_early_leave_count
    FROM attendance
    WHERE attendance.profile_id = p_profile_id
      AND EXTRACT(MONTH FROM attendance.clock_in::timestamp) = p_month
      AND EXTRACT(YEAR FROM attendance.clock_in::timestamp) = p_year
      AND (attendance.status = 'pulang_cepat' OR COALESCE(attendance.early_leave_minutes, 0) > 0);
    
    -- Count wrong location (attendance from different workplace)
    IF v_user_workplace.id IS NOT NULL THEN
        FOR v_attendance IN
            SELECT * FROM attendance
            WHERE attendance.profile_id = p_profile_id
              AND EXTRACT(MONTH FROM attendance.clock_in::timestamp) = p_month
              AND EXTRACT(YEAR FROM attendance.clock_in::timestamp) = p_year
              AND attendance.clock_in_coords IS NOT NULL
        LOOP
            IF calculate_distance_meters(
                v_user_workplace.latitude, 
                v_user_workplace.longitude,
                (v_attendance.clock_in_coords->>'lat')::DOUBLE PRECISION,
                (v_attendance.clock_in_coords->>'lon')::DOUBLE PRECISION
            ) > v_user_workplace.radius_meters THEN
                v_wrong_location_count := v_wrong_location_count + 1;
            END IF;
        END LOOP;
    END IF;
    
    -- Count attendance corrections
    SELECT COUNT(*)::INTEGER INTO v_correction_count
    FROM requests
    WHERE requests.profile_id = p_profile_id
      AND requests.request_type = 'Koreksi Absensi'
      AND EXTRACT(MONTH FROM requests.created_at) = p_month
      AND EXTRACT(YEAR FROM requests.created_at) = p_year;
    
    -- Count sick leaves (for health reminder, no penalty)
    SELECT COUNT(*)::INTEGER INTO v_sick_leave_count
    FROM requests
    WHERE requests.profile_id = p_profile_id
      AND requests.request_type = 'Sakit'
      AND EXTRACT(MONTH FROM requests.created_at) = p_month
      AND EXTRACT(YEAR FROM requests.created_at) = p_year;
    
    -- Calculate final score using configuration values
    v_final_score := GREATEST(0, v_config.base_score 
        - (v_late_count * v_config.late_penalty) 
        - (v_early_leave_count * v_config.early_leave_penalty) 
        - (v_wrong_location_count * v_config.wrong_location_penalty) 
        - (v_correction_count * v_config.correction_penalty));
    
    RETURN QUERY SELECT 
        v_late_count,
        v_early_leave_count,
        v_wrong_location_count,
        v_correction_count,
        v_sick_leave_count,
        v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
