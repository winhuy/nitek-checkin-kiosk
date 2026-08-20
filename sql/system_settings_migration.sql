-- ============================================================
-- NITEK CHECKIN — System Settings Migration (Idempotent)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key         VARCHAR(100)  PRIMARY KEY,
  value       TEXT          NOT NULL,
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 2. Insert default landing view if not exists
INSERT INTO system_settings (key, value, updated_at)
VALUES ('default_landing_view', 'auto', NOW())
ON CONFLICT (key) DO NOTHING;

-- 3. Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select system_settings" ON system_settings;
CREATE POLICY "Allow anon select system_settings" ON system_settings FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon all system_settings" ON system_settings;
CREATE POLICY "Allow anon all system_settings" ON system_settings FOR ALL TO anon USING (true);

-- 4. Enable Realtime replication for system_settings
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;
