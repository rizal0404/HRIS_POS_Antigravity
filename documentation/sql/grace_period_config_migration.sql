-- Migration: Create grace_period_config table
-- Purpose: Store configurable grace period for clock-in (late) and clock-out (early leave)
-- Date: 2024-12-25

-- Create the grace_period_config table
CREATE TABLE IF NOT EXISTS grace_period_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,  -- 'default', 'shift1', 'shift2', 'shift3'
    grace_minutes_in INT NOT NULL DEFAULT 10,  -- Toleransi clock-in (menit) - terlambat setelah ini
    grace_minutes_out INT NOT NULL DEFAULT 10, -- Toleransi clock-out (menit) - pulang cepat sebelum ini
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_grace_period_config_key ON grace_period_config(config_key);

-- Enable RLS
ALTER TABLE grace_period_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read config
CREATE POLICY "Anyone can read grace period config" ON grace_period_config
    FOR SELECT TO authenticated
    USING (true);

-- RLS Policy: Only admin/superadmin can update/insert
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

-- Insert default configuration values
INSERT INTO grace_period_config (config_key, grace_minutes_in, grace_minutes_out, description)
VALUES 
    ('default', 10, 10, 'Konfigurasi default untuk semua shift'),
    ('shift1', 10, 10, 'Shift 1 (pagi) - 07:00-16:00'),
    ('shift2', 10, 10, 'Shift 2 (siang) - 14:00-22:00'),
    ('shift3', 15, 15, 'Shift 3 (malam) - 22:00-07:00, lebih longgar')
ON CONFLICT (config_key) DO NOTHING;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_grace_period_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grace_period_config_updated_at
    BEFORE UPDATE ON grace_period_config
    FOR EACH ROW
    EXECUTE FUNCTION update_grace_period_config_timestamp();

-- Comment on table
COMMENT ON TABLE grace_period_config IS 'Konfigurasi toleransi waktu (grace period) untuk absensi. Dapat diubah tanpa deploy ulang.';
COMMENT ON COLUMN grace_period_config.grace_minutes_in IS 'Toleransi keterlambatan clock-in dalam menit. Status terlambat jika clock-in > (shift_start + grace_minutes_in)';
COMMENT ON COLUMN grace_period_config.grace_minutes_out IS 'Toleransi pulang cepat clock-out dalam menit. Status pulang_cepat jika clock_out < (shift_end - grace_minutes_out)';
