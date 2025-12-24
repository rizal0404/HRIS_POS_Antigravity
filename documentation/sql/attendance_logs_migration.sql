-- Migration: Create attendance_logs table for abnormal attendance logging
-- Purpose: Store logs only for abnormal attendance cases (missing schedule, calculation anomalies, etc.)
-- Date: 2024-12-24

-- Create the attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id BIGINT REFERENCES attendance(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    log_type TEXT NOT NULL, -- 'missing_schedule', 'calculation_mismatch', 'incomplete_data', 'schedule_stale'
    log_data JSONB NOT NULL, -- detailed debug info
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_attendance_logs_profile_id ON attendance_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_attendance_id ON attendance_logs(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_log_type ON attendance_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_created_at ON attendance_logs(created_at);

-- Enable Row Level Security
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can insert their own logs
CREATE POLICY "Users can insert own attendance logs" ON attendance_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = profile_id);

-- RLS Policy: Users can read their own logs
CREATE POLICY "Users can read own attendance logs" ON attendance_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = profile_id);

-- RLS Policy: Managers can read logs of their subordinates
CREATE POLICY "Managers can read subordinate attendance logs" ON attendance_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = attendance_logs.profile_id
            AND p.manager_id = auth.uid()
        )
    );

-- RLS Policy: Admin/Superadmin can read all logs (using role field from profiles)
CREATE POLICY "Admin can read all attendance logs" ON attendance_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Grant permissions
GRANT INSERT, SELECT ON attendance_logs TO authenticated;

-- Comment on table
COMMENT ON TABLE attendance_logs IS 'Stores logs for abnormal attendance cases only - used for debugging calculation issues';
COMMENT ON COLUMN attendance_logs.log_type IS 'Type of anomaly: missing_schedule, calculation_mismatch, incomplete_data, schedule_stale';
COMMENT ON COLUMN attendance_logs.log_data IS 'JSONB containing: schedule_used, clock_in, clock_out, calculated_values, expected_values';
