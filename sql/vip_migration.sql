-- ============================================================
-- NITEK CHECKIN — VIP Guest Support Migration
-- Run this in Supabase SQL Editor to enable VIP Guest functionality
-- ============================================================

-- 1. Add is_vip column to attendees table if not exists
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;

-- 2. Create index on is_vip for faster filtered queries
CREATE INDEX IF NOT EXISTS idx_attendees_is_vip ON attendees(is_vip);
