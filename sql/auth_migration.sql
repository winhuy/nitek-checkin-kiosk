-- ============================================================
-- NITEK CHECKIN — Auth Migration
-- Run this AFTER the main schema.sql in Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: app_users (simple internal auth)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_users (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  username     VARCHAR(50)   NOT NULL UNIQUE,
  password_hash VARCHAR(64)  NOT NULL, -- SHA-256 hex
  role         VARCHAR(20)   NOT NULL DEFAULT 'reception'
                             CHECK (role IN ('admin', 'reception')),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- RLS for app_users
-- ────────────────────────────────────────────────────────────
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Allow anon to SELECT (needed for login check)
-- We only return non-sensitive columns in our query
CREATE POLICY "Allow anon read app_users"
  ON app_users FOR SELECT
  TO anon
  USING (true);

-- ────────────────────────────────────────────────────────────
-- DEFAULT USERS
-- admin    / admin@nitek      → SHA-256: 154095c17b95e3e0e66fa4ef82e823e0a635114120a6089f46a0e3a9024db36d
-- reception/ reception@nitek  → SHA-256: 5ffb48daf898e740c9f93f91034a298c54a3369ae21c3e307632459b2bf672de
-- ────────────────────────────────────────────────────────────
INSERT INTO app_users (username, password_hash, role) VALUES
  ('admin',     '154095c17b95e3e0e66fa4ef82e823e0a635114120a6089f46a0e3a9024db36d', 'admin'),
  ('reception', '5ffb48daf898e740c9f93f91034a298c54a3369ae21c3e307632459b2bf672de', 'reception')
ON CONFLICT (username) DO NOTHING;
