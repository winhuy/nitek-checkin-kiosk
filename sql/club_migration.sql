-- ============================================================
-- NITEK CHECKIN — Club Member Attendance Module (Idempotent Migration)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLE: club_members
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_members (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code  VARCHAR(50)   NOT NULL UNIQUE,
  full_name    VARCHAR(100)  NOT NULL,
  class_name   VARCHAR(100), -- Lớp / Đơn vị
  email        VARCHAR(100),
  phone        VARCHAR(50),
  notes        TEXT,
  status       VARCHAR(20)   NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'inactive')),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Add class_name, face_descriptor, avatar_url columns if table already exists
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS class_name VARCHAR(100);
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS face_descriptor JSONB;
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ────────────────────────────────────────────────────────────
-- 2. TABLE: club_sessions (buổi sinh hoạt)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_sessions (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(255)  NOT NULL,
  description          TEXT,
  session_date         TIMESTAMPTZ,
  start_time           VARCHAR(10)   DEFAULT '08:00',   -- Giờ bắt đầu sinh hoạt (VD: '08:00', '14:30')
  grace_period_minutes INTEGER       DEFAULT 15,         -- Số phút cho phép trễ
  recurrence_rule      VARCHAR(50)   DEFAULT 'none'
                                     CHECK (recurrence_rule IN ('none', 'every_sunday', 'every_saturday', 'every_weekend', 'weekly')),
  location             VARCHAR(255),
  status               VARCHAR(20)   NOT NULL DEFAULT 'open'
                                     CHECK (status IN ('open', 'closed', 'scheduled')),
  created_by           VARCHAR(50)   DEFAULT 'admin',
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Add columns if table already exists
ALTER TABLE club_sessions ADD COLUMN IF NOT EXISTS start_time VARCHAR(10) DEFAULT '08:00';
ALTER TABLE club_sessions ADD COLUMN IF NOT EXISTS grace_period_minutes INTEGER DEFAULT 15;
ALTER TABLE club_sessions ADD COLUMN IF NOT EXISTS recurrence_rule VARCHAR(50) DEFAULT 'none';
ALTER TABLE club_sessions ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE club_sessions ADD COLUMN IF NOT EXISTS absence_cutoff_hours INTEGER DEFAULT 2;

-- Update status constraint to allow 'scheduled'
ALTER TABLE club_sessions DROP CONSTRAINT IF EXISTS club_sessions_status_check;
ALTER TABLE club_sessions ADD CONSTRAINT club_sessions_status_check CHECK (status IN ('open', 'closed', 'scheduled'));

-- ────────────────────────────────────────────────────────────
-- 3. TABLE: club_attendance_records (bản ghi điểm danh)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_attendance_records (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID          NOT NULL REFERENCES club_members(id) ON DELETE CASCADE,
  session_id      UUID          NOT NULL REFERENCES club_sessions(id) ON DELETE CASCADE,
  checked_in_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  face_photo_data TEXT,           -- base64 encoded JPEG image
  checkin_status  VARCHAR(20)   NOT NULL DEFAULT 'on_time'
                                CHECK (checkin_status IN ('on_time', 'late', 'excused', 'unexcused')),
  late_minutes    INTEGER       NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, session_id)  -- chỉ được điểm danh 1 lần / buổi
);

-- Add columns if table already exists
ALTER TABLE club_attendance_records ADD COLUMN IF NOT EXISTS checkin_status VARCHAR(20) DEFAULT 'on_time';
ALTER TABLE club_attendance_records ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;

-- B5 FIX: Drop old constraint and re-add with excused/unexcused/pending_excuse support
ALTER TABLE club_attendance_records DROP CONSTRAINT IF EXISTS club_attendance_records_checkin_status_check;
ALTER TABLE club_attendance_records ADD CONSTRAINT club_attendance_records_checkin_status_check
  CHECK (checkin_status IN ('on_time', 'late', 'excused', 'unexcused', 'pending_excuse'));

-- ────────────────────────────────────────────────────────────
-- 4. INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_club_members_code ON club_members(member_code);
CREATE INDEX IF NOT EXISTS idx_club_members_status ON club_members(status);
CREATE INDEX IF NOT EXISTS idx_club_attendance_session ON club_attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_club_attendance_member ON club_attendance_records(member_id);

-- ────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS) & POLICIES (Drop if exists first)
-- ────────────────────────────────────────────────────────────
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_attendance_records ENABLE ROW LEVEL SECURITY;

-- club_members policies
DROP POLICY IF EXISTS "club_members_anon_select" ON club_members;
DROP POLICY IF EXISTS "club_members_anon_insert" ON club_members;
DROP POLICY IF EXISTS "club_members_anon_update" ON club_members;
DROP POLICY IF EXISTS "club_members_anon_delete" ON club_members;

CREATE POLICY "club_members_anon_select" ON club_members FOR SELECT TO anon USING (true);
CREATE POLICY "club_members_anon_insert" ON club_members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "club_members_anon_update" ON club_members FOR UPDATE TO anon USING (true);
CREATE POLICY "club_members_anon_delete" ON club_members FOR DELETE TO anon USING (true);

-- club_sessions policies
DROP POLICY IF EXISTS "club_sessions_anon_select" ON club_sessions;
DROP POLICY IF EXISTS "club_sessions_anon_insert" ON club_sessions;
DROP POLICY IF EXISTS "club_sessions_anon_update" ON club_sessions;
DROP POLICY IF EXISTS "club_sessions_anon_delete" ON club_sessions;

CREATE POLICY "club_sessions_anon_select" ON club_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "club_sessions_anon_insert" ON club_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "club_sessions_anon_update" ON club_sessions FOR UPDATE TO anon USING (true);
CREATE POLICY "club_sessions_anon_delete" ON club_sessions FOR DELETE TO anon USING (true);

-- club_attendance_records policies
DROP POLICY IF EXISTS "club_attend_anon_select" ON club_attendance_records;
DROP POLICY IF EXISTS "club_attend_anon_insert" ON club_attendance_records;
DROP POLICY IF EXISTS "club_attend_anon_update" ON club_attendance_records;
DROP POLICY IF EXISTS "club_attend_anon_delete" ON club_attendance_records;

CREATE POLICY "club_attend_anon_select" ON club_attendance_records FOR SELECT TO anon USING (true);
CREATE POLICY "club_attend_anon_insert" ON club_attendance_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "club_attend_anon_update" ON club_attendance_records FOR UPDATE TO anon USING (true);
CREATE POLICY "club_attend_anon_delete" ON club_attendance_records FOR DELETE TO anon USING (true);

-- ────────────────────────────────────────────────────────────
-- 6. REALTIME SUBSCRIPTION (Safely add to publication)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE club_members;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE club_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE club_attendance_records;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
