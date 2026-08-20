import { useState } from 'react';
import { useClub } from '../../contexts/ClubContext';
import ClubAttendanceScanner from './ClubAttendanceScanner';
import ClubMembersAdmin from './ClubMembersAdmin';
import ClubSessionManager from './ClubSessionManager';
import {
  IconUsers,
  IconScanner,
  IconCalendar,
  IconClock,
  IconAlertTriangle,
  IconCopy,
  IconRefresh,
} from '../common/CustomIcons';

export default function ClubDashboard({ isActive }) {
  const { activeSession, dbAvailable } = useClub();
  const [tab, setTab] = useState('scanner');



  // ── DB Not Available Banner ───────────────────────────────────────────
  if (!dbAvailable) {
    const sql = `-- Run this in Supabase Dashboard → SQL Editor (Idempotent):
CREATE TABLE IF NOT EXISTS club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  class_name VARCHAR(100),
  email VARCHAR(100), phone VARCHAR(50), notes TEXT,
  face_descriptor JSONB,
  avatar_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS class_name VARCHAR(100);
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS face_descriptor JSONB;
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;
CREATE TABLE IF NOT EXISTS club_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT, session_date TIMESTAMPTZ,
  start_time VARCHAR(10) DEFAULT '08:00',
  grace_period_minutes INTEGER DEFAULT 15,
  recurrence_rule VARCHAR(50) DEFAULT 'none' CHECK (recurrence_rule IN ('none','every_sunday','every_saturday','every_weekend','weekly')),
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  location VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('open','closed','scheduled')),
  created_by VARCHAR(50) DEFAULT 'admin',
  absence_cutoff_hours INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE club_sessions ADD COLUMN IF NOT EXISTS absence_cutoff_hours INTEGER DEFAULT 2;
CREATE TABLE IF NOT EXISTS club_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES club_members(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES club_sessions(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  face_photo_data TEXT,
  checkin_status VARCHAR(20) NOT NULL DEFAULT 'on_time' CHECK (checkin_status IN ('on_time','late','excused','unexcused')),
  late_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, session_id)
);
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_members_anon_select" ON club_members;
DROP POLICY IF EXISTS "club_members_anon_insert" ON club_members;
DROP POLICY IF EXISTS "club_members_anon_update" ON club_members;
DROP POLICY IF EXISTS "club_members_anon_delete" ON club_members;
CREATE POLICY "club_members_anon_select" ON club_members FOR SELECT TO anon USING (true);
CREATE POLICY "club_members_anon_insert" ON club_members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "club_members_anon_update" ON club_members FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "club_members_anon_delete" ON club_members FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "club_sessions_anon_select" ON club_sessions;
DROP POLICY IF EXISTS "club_sessions_anon_insert" ON club_sessions;
DROP POLICY IF EXISTS "club_sessions_anon_update" ON club_sessions;
DROP POLICY IF EXISTS "club_sessions_anon_delete" ON club_sessions;
CREATE POLICY "club_sessions_anon_select" ON club_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "club_sessions_anon_insert" ON club_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "club_sessions_anon_update" ON club_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "club_sessions_anon_delete" ON club_sessions FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "club_attend_anon_select" ON club_attendance_records;
DO $$ BEGIN CREATE POLICY "Public full access club_members" ON club_members FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public full access club_sessions" ON club_sessions FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public full access club_attendance_records" ON club_attendance_records FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE club_members; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE club_sessions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE club_attendance_records; EXCEPTION WHEN OTHERS THEN NULL; END $$;`;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <IconAlertTriangle size={36} color="#f59e0b" />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Cần thiết lập Database cho Module CLB</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
              Các bảng CLB chưa tồn tại trong Supabase. Vui lòng chạy đoạn SQL bên dưới.
            </p>
          </div>
        </div>

        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          File SQL đầy đủ đã có tại: <strong>sql/club_migration.sql</strong> trong thư mục dự án.
        </div>

        <pre style={{
          fontSize: 11, background: '#0d1117', color: '#7ee787',
          padding: 16, borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)', overflowX: 'auto',
          lineHeight: 1.6, marginBottom: 16,
        }}>
          {sql}
        </pre>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            id="btn-copy-club-sql"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              navigator.clipboard.writeText(sql);
              alert('Đã copy SQL vào Clipboard! Dán vào Supabase Dashboard → SQL Editor và chạy.');
            }}
          >
            <IconCopy size={14} /> Copy SQL
          </button>
          <button
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => window.location.reload()}
          >
            <IconRefresh size={14} /> Reload sau khi chạy SQL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconUsers size={22} color="var(--accent-primary)" /> CLB — Hệ Thống Điểm Danh Thành Viên
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Quét mã QR + chụp ảnh gương mặt để ghi lại điểm danh mỗi buổi sinh hoạt
          </p>
        </div>

        {/* Active session status */}
        {activeSession ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            fontSize: 13,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px rgba(16,185,129,0.8)',
              animation: 'live-pulse 1.5s ease infinite',
              flexShrink: 0,
            }} />
            <span style={{ color: '#34d399', fontWeight: 700 }}>Đang mở:</span>
            <span style={{ color: 'var(--text-primary)' }}>{activeSession.title}</span>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            <IconClock size={16} color="var(--text-muted)" />
            <span>Chưa có buổi nào đang mở</span>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="section-tabs" style={{ marginBottom: 0 }}>
        <button
          id="club-tab-scanner"
          className={`section-tab ${tab === 'scanner' ? 'active' : ''}`}
          onClick={() => setTab('scanner')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconScanner size={15} /> Điểm Danh
        </button>
        <button
          id="club-tab-members"
          className={`section-tab ${tab === 'members' ? 'active' : ''}`}
          onClick={() => setTab('members')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconUsers size={15} /> Thành Viên
        </button>
        <button
          id="club-tab-sessions"
          className={`section-tab ${tab === 'sessions' ? 'active' : ''}`}
          onClick={() => setTab('sessions')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconCalendar size={15} /> Lịch Sử Buổi
        </button>
      </div>

      <div className="card" style={{ marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {tab === 'scanner' && (
          <ClubAttendanceScanner isActive={isActive && tab === 'scanner'} />
        )}
        {tab === 'members' && <ClubMembersAdmin />}
        {tab === 'sessions' && <ClubSessionManager />}
      </div>

      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(16,185,129,0.8); }
          50% { opacity: 0.5; box-shadow: 0 0 16px rgba(16,185,129,0.4); }
        }
      `}</style>
    </div>
  );
}
