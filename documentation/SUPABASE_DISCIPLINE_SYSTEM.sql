-- ============================================================
-- DISCIPLINE SYSTEM MIGRATION
-- Run this script in Supabase SQL Editor
-- ============================================================

-- 1. Tabel lokasi kerja/kantor
CREATE TABLE IF NOT EXISTS workplaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 350,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data dari lokasi existing
INSERT INTO workplaces (name, latitude, longitude, radius_meters) VALUES
    ('Tonasa 23', -4.783714780572759, 119.61610006600712, 350),
    ('Tonasa 4', -4.78831873823137, 119.61654058396095, 350),
    ('Tonasa 5', -4.790931202719051, 119.61694886888938, 350),
    ('Crusher', -4.7893251806455295, 119.62039780223822, 350),
    ('Kantor Staf', -4.788360643865878, 119.61309925103656, 350),
    ('Palmer', -4.799717216, 119.60308636409, 350)
ON CONFLICT (name) DO NOTHING;

-- 2. Tambah kolom workplace_id ke profiles (jika belum ada)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'workplace_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN workplace_id UUID REFERENCES workplaces(id);
    END IF;
END $$;

-- 3. Tabel riwayat skor disiplin
CREATE TABLE IF NOT EXISTS discipline_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2020),
    
    -- Metrics
    late_count INTEGER DEFAULT 0,
    early_leave_count INTEGER DEFAULT 0,
    wrong_location_count INTEGER DEFAULT 0,
    correction_count INTEGER DEFAULT 0,
    sick_leave_count INTEGER DEFAULT 0,  -- Health reminder, no penalty
    
    -- Calculated score
    base_score INTEGER DEFAULT 100,
    final_score INTEGER DEFAULT 100,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(profile_id, period_month, period_year)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_discipline_scores_profile_period 
ON discipline_scores(profile_id, period_year, period_month);

-- 4. Enable RLS for workplaces
ALTER TABLE workplaces ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read workplaces
CREATE POLICY "Enable read access for all users" ON workplaces
    FOR SELECT USING (true);

-- Policy: Only superadmin/admin can insert/update/delete workplaces
CREATE POLICY "Enable insert for admins" ON workplaces
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin')
        )
    );

CREATE POLICY "Enable update for admins" ON workplaces
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin')
        )
    );

CREATE POLICY "Enable delete for admins" ON workplaces
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin')
        )
    );

-- 5. Enable RLS for discipline_scores
ALTER TABLE discipline_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own scores
CREATE POLICY "Enable read access for users (own)" ON discipline_scores
    FOR SELECT USING (profile_id = auth.uid());

-- Policy: Managers can view subordinates' scores
CREATE POLICY "Enable read access for managers (subordinates)" ON discipline_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = discipline_scores.profile_id 
            AND profiles.manager_id = auth.uid()
        )
    );

-- Policy: Admins can view all scores
CREATE POLICY "Enable read access for admins" ON discipline_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin')
        )
    );

-- Policy: Admins can manage (insert/update/delete) all scores
CREATE POLICY "Enable full access for admins" ON discipline_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('superadmin', 'admin')
        )
    );

-- 6. Function untuk menghitung skor disiplin bulanan
CREATE OR REPLACE FUNCTION calculate_discipline_score(
    p_profile_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS TABLE (
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
BEGIN
    -- Get user's assigned workplace
    SELECT w.* INTO v_user_workplace
    FROM profiles p
    LEFT JOIN workplaces w ON w.id = p.workplace_id
    WHERE p.id = p_profile_id;
    
    -- Count late arrivals
    SELECT COUNT(*)::INTEGER INTO v_late_count
    FROM attendances
    WHERE attendances.profile_id = p_profile_id
      AND EXTRACT(MONTH FROM attendances.clock_in::timestamp) = p_month
      AND EXTRACT(YEAR FROM attendances.clock_in::timestamp) = p_year
      AND (attendances.status = 'terlambat' OR COALESCE(attendances.late_minutes, 0) > 0);
    
    -- Count early leaves
    SELECT COUNT(*)::INTEGER INTO v_early_leave_count
    FROM attendances
    WHERE attendances.profile_id = p_profile_id
      AND EXTRACT(MONTH FROM attendances.clock_in::timestamp) = p_month
      AND EXTRACT(YEAR FROM attendances.clock_in::timestamp) = p_year
      AND (attendances.status = 'pulang_cepat' OR COALESCE(attendances.early_leave_minutes, 0) > 0);
    
    -- Count wrong location (attendance from different workplace)
    -- Check if user has assigned workplace and calculate distance
    IF v_user_workplace.id IS NOT NULL THEN
        FOR v_attendance IN
            SELECT * FROM attendances
            WHERE attendances.profile_id = p_profile_id
              AND EXTRACT(MONTH FROM attendances.clock_in::timestamp) = p_month
              AND EXTRACT(YEAR FROM attendances.clock_in::timestamp) = p_year
              AND attendances.clock_in_coords IS NOT NULL
        LOOP
            -- Calculate distance using Haversine formula (approximation)
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
    
    -- Calculate final score
    -- Base: 100, -2 per late, -2 per early leave, -5 per wrong location, -1 per correction
    v_final_score := GREATEST(0, 100 
        - (v_late_count * 2) 
        - (v_early_leave_count * 2) 
        - (v_wrong_location_count * 5) 
        - (v_correction_count * 1));
    
    RETURN QUERY SELECT 
        v_late_count,
        v_early_leave_count,
        v_wrong_location_count,
        v_correction_count,
        v_sick_leave_count,
        v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Helper function untuk menghitung jarak dalam meter
CREATE OR REPLACE FUNCTION calculate_distance_meters(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION, 
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    R DOUBLE PRECISION := 6371000; -- Earth radius in meters
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Function to upsert discipline score (for periodic updates)
CREATE OR REPLACE FUNCTION upsert_discipline_score(
    p_profile_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS discipline_scores AS $$
DECLARE
    v_result RECORD;
    v_score discipline_scores;
BEGIN
    -- Calculate the score
    SELECT * INTO v_result FROM calculate_discipline_score(p_profile_id, p_month, p_year);
    
    -- Upsert the score
    INSERT INTO discipline_scores (
        profile_id, period_month, period_year,
        late_count, early_leave_count, wrong_location_count, 
        correction_count, sick_leave_count, final_score,
        updated_at
    ) VALUES (
        p_profile_id, p_month, p_year,
        v_result.late_count, v_result.early_leave_count, v_result.wrong_location_count,
        v_result.correction_count, v_result.sick_leave_count, v_result.final_score,
        NOW()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SUMMARY:
-- Tables created: workplaces, discipline_scores
-- Columns added: profiles.workplace_id
-- Functions: calculate_discipline_score, calculate_distance_meters, upsert_discipline_score
-- RLS enabled with appropriate policies
-- ============================================================
