-- Migration: Create grace_period_config table (UPDATED)
-- Purpose: Store configurable grace period for clock-in (late) and clock-out (early leave)
-- Connected to shifts table via shift_code
-- Date: 2024-12-25

-- Drop existing table if schema changed
DROP TABLE IF EXISTS grace_period_config CASCADE;

-- Create the grace_period_config table with shift_code connection
CREATE TABLE grace_period_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_code TEXT REFERENCES shifts(code) ON DELETE CASCADE,  -- Foreign key to shifts.code (nullable for default)
    grace_minutes_in INT NOT NULL DEFAULT 10,  -- Toleransi clock-in (menit) - terlambat setelah ini
    grace_minutes_out INT NOT NULL DEFAULT 10, -- Toleransi clock-out (menit) - pulang cepat sebelum ini
    is_default BOOLEAN DEFAULT FALSE,  -- Mark as default config for shifts without specific config
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_shift_or_default UNIQUE (shift_code, is_default)
);

-- Create indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_grace_period_config_shift_code ON grace_period_config(shift_code);
CREATE INDEX IF NOT EXISTS idx_grace_period_config_default ON grace_period_config(is_default) WHERE is_default = TRUE;

-- Enable RLS
ALTER TABLE grace_period_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read config
CREATE POLICY "Anyone can read grace period config" ON grace_period_config
    FOR SELECT TO authenticated
    USING (true);

-- RLS Policy: Only admin/superadmin can manage
CREATE POLICY "Admin can manage grace period config" ON grace_period_config
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Grant permissions
GRANT SELECT ON grace_period_config TO authenticated;

-- Insert default configuration (for shifts without specific config)
INSERT INTO grace_period_config (shift_code, grace_minutes_in, grace_minutes_out, is_default, description)
VALUES (NULL, 10, 10, TRUE, 'Konfigurasi default untuk semua shift tanpa config spesifik')
ON CONFLICT DO NOTHING;

-- Insert config for each existing shift (optional - can be customized per shift)
-- This will create a config entry for each shift code in the shifts table
INSERT INTO grace_period_config (shift_code, grace_minutes_in, grace_minutes_out, is_default, description)
SELECT 
    s.code,
    CASE 
        WHEN s.start_time >= '22:00:00' OR s.start_time < '06:00:00' THEN 15  -- Night shift gets more tolerance
        ELSE 10 
    END as grace_minutes_in,
    CASE 
        WHEN s.start_time >= '22:00:00' OR s.start_time < '06:00:00' THEN 15
        ELSE 10 
    END as grace_minutes_out,
    FALSE,
    'Config untuk shift: ' || COALESCE(s.name, s.code)
FROM shifts s
ON CONFLICT DO NOTHING;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_grace_period_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS grace_period_config_updated_at ON grace_period_config;
CREATE TRIGGER grace_period_config_updated_at
    BEFORE UPDATE ON grace_period_config
    FOR EACH ROW
    EXECUTE FUNCTION update_grace_period_config_timestamp();

-- Helper function to get grace config for a shift
CREATE OR REPLACE FUNCTION get_grace_config(p_shift_code TEXT)
RETURNS TABLE (
    grace_minutes_in INT,
    grace_minutes_out INT
) AS $$
BEGIN
    -- First try to find specific config for this shift
    RETURN QUERY
    SELECT gpc.grace_minutes_in, gpc.grace_minutes_out
    FROM grace_period_config gpc
    WHERE gpc.shift_code = p_shift_code
    LIMIT 1;
    
    -- If no rows returned, get default config
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT gpc.grace_minutes_in, gpc.grace_minutes_out
        FROM grace_period_config gpc
        WHERE gpc.is_default = TRUE
        LIMIT 1;
    END IF;
    
    -- If still no rows, return hardcoded defaults
    IF NOT FOUND THEN
        RETURN QUERY SELECT 10, 10;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE grace_period_config IS 'Konfigurasi toleransi waktu (grace period) per shift. Digunakan untuk menentukan status terlambat/pulang_cepat.';
COMMENT ON COLUMN grace_period_config.shift_code IS 'Kode shift dari tabel shifts. NULL untuk konfigurasi default.';
COMMENT ON COLUMN grace_period_config.grace_minutes_in IS 'Toleransi keterlambatan clock-in dalam menit.';
COMMENT ON COLUMN grace_period_config.grace_minutes_out IS 'Toleransi pulang cepat clock-out dalam menit.';
COMMENT ON COLUMN grace_period_config.is_default IS 'True jika ini adalah konfigurasi default untuk shift tanpa config spesifik.';
