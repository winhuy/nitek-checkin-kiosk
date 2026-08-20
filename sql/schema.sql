-- ============================================================
-- QR Event Check-in App — Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. EXTENSION
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 2. TABLE: events
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255)  NOT NULL,
  description  TEXT,
  event_date   TIMESTAMPTZ,
  location     VARCHAR(255),
  status       VARCHAR(20)   NOT NULL DEFAULT 'active'
                             CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. TABLE: attendees
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendees (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID          REFERENCES events(id) ON DELETE CASCADE,
  ticket_code  VARCHAR(50)   NOT NULL UNIQUE,
  full_name    VARCHAR(100)  NOT NULL,
  email        VARCHAR(100),
  phone        VARCHAR(50),
  company      VARCHAR(100),
  notes        TEXT,
  is_vip       BOOLEAN       NOT NULL DEFAULT FALSE,
  status       VARCHAR(20)   NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'checked_in')),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 4. TABLE: checkin_logs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkin_logs (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id   UUID          NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  scanned_by    VARCHAR(50)   DEFAULT 'scanner'
);

-- ────────────────────────────────────────────────────────────
-- 5. INDEXES for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendees_ticket_code ON attendees(ticket_code);
CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_attendee_id ON checkin_logs(attendee_id);

-- ────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- Allow anonymous access for event kiosk use-case.
-- ────────────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write on events
CREATE POLICY "Allow anon read events" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert events" ON events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update events" ON events FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete events" ON events FOR DELETE TO anon USING (true);

-- Allow anon read/write on attendees
CREATE POLICY "Allow anon read attendees" ON attendees FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert attendees" ON attendees FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update attendees" ON attendees FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete attendees" ON attendees FOR DELETE TO anon USING (true);

-- Allow anon read/write on checkin_logs
CREATE POLICY "Allow anon read checkin_logs" ON checkin_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert checkin_logs" ON checkin_logs FOR INSERT TO anon WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 7. REALTIME SUBSCRIPTION
-- ────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE attendees;
