-- ============================================================
-- NITEK CHECKIN — Events & Guest Info Migration
-- Run this in Supabase SQL Editor to enable Event Management & Extended Guest Info
-- ============================================================

-- 1. Create events table
CREATE TABLE IF NOT EXISTS events (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255)  NOT NULL,
  description      TEXT,
  event_date       TIMESTAMPTZ,
  location         VARCHAR(255),
  logo_url         TEXT,
  welcome_wish     TEXT,
  welcome_wish_vip TEXT,
  status           VARCHAR(20)   NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if events table was already created
ALTER TABLE events ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS welcome_wish TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS welcome_wish_vip TEXT;

-- 2. Add extra columns to attendees table
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS company VARCHAR(100);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select events" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert events" ON events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update events" ON events FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete events" ON events FOR DELETE TO anon USING (true);

-- 4. Enable Realtime subscription for events
ALTER PUBLICATION supabase_realtime ADD TABLE events;
