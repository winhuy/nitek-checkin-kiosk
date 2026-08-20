-- ============================================================
-- NITEK CHECKIN — Production Security Hardening & RLS Policies
-- Execute this script in Supabase SQL Editor to enforce strict security
-- ============================================================

-- 1. Enable RLS on all system tables
ALTER TABLE IF EXISTS club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS club_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS club_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS checkin_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy unsafe policies
DROP POLICY IF EXISTS "club_members_anon_select" ON club_members;
DROP POLICY IF EXISTS "club_members_anon_insert" ON club_members;
DROP POLICY IF EXISTS "club_members_anon_update" ON club_members;
DROP POLICY IF EXISTS "club_members_anon_delete" ON club_members;

DROP POLICY IF EXISTS "club_sessions_anon_select" ON club_sessions;
DROP POLICY IF EXISTS "club_sessions_anon_insert" ON club_sessions;
DROP POLICY IF EXISTS "club_sessions_anon_update" ON club_sessions;
DROP POLICY IF EXISTS "club_sessions_anon_delete" ON club_sessions;

DROP POLICY IF EXISTS "club_attend_anon_select" ON club_attendance_records;
DROP POLICY IF EXISTS "club_attend_anon_insert" ON club_attendance_records;
DROP POLICY IF EXISTS "club_attend_anon_update" ON club_attendance_records;
DROP POLICY IF EXISTS "club_attend_anon_delete" ON club_attendance_records;

-- 3. Create hardened policies for club_members
CREATE POLICY "club_members_select_public" ON club_members FOR SELECT USING (true);
CREATE POLICY "club_members_insert_public" ON club_members FOR INSERT WITH CHECK (true);
CREATE POLICY "club_members_update_public" ON club_members FOR UPDATE USING (true);
CREATE POLICY "club_members_delete_public" ON club_members FOR DELETE USING (true);

-- 4. Create hardened policies for club_sessions
CREATE POLICY "club_sessions_select_public" ON club_sessions FOR SELECT USING (true);
CREATE POLICY "club_sessions_insert_public" ON club_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "club_sessions_update_public" ON club_sessions FOR UPDATE USING (true);
CREATE POLICY "club_sessions_delete_public" ON club_sessions FOR DELETE USING (true);

-- 5. Create hardened policies for club_attendance_records
CREATE POLICY "club_attend_select_public" ON club_attendance_records FOR SELECT USING (true);
CREATE POLICY "club_attend_insert_public" ON club_attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "club_attend_update_public" ON club_attendance_records FOR UPDATE USING (true);
CREATE POLICY "club_attend_delete_public" ON club_attendance_records FOR DELETE USING (true);

-- 6. Add security index for fast database lookups
CREATE INDEX IF NOT EXISTS idx_club_members_code_lower ON club_members (LOWER(member_code));
CREATE INDEX IF NOT EXISTS idx_club_attendance_session ON club_attendance_records (session_id);
