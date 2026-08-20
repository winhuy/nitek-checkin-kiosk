import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEvents, isEventArchived, cleanEventDescription, getEventStatusInfo } from '../contexts/EventContext';
import { supabase } from '../lib/supabaseClient';
import EventStoryModal from './EventStoryModal';
import EventReportModal from './EventReportModal';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPlus,
  IconTrash,
  IconEdit,
  IconCopy,
  IconCheck,
  IconX,
  IconFileText,
  IconAlertTriangle,
  IconRefresh,
  IconSave,
  IconZap,
  IconDot,
  IconUsers,
  IconFolder,
  IconCamera,
  IconStop,
  IconPlay,
  IconRepeat,
  IconReport,
  IconCrown,
} from './common/CustomIcons';

export default function EventManagerModal({ isOpen, onClose, initialMode = 'list' }) {
  const { events, selectedEventId, setSelectedEventId, createEvent, updateEvent, deleteEvent, sqlMigrationNeeded, fetchEvents } = useEvents();
  const [mode, setMode] = useState(initialMode); // 'list' | 'create' | 'edit' | 'sql' | 'archived'
  const [editingEvt, setEditingEvt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    event_date: '',
    logo_url: '',
    welcome_wish: '',
    welcome_wish_vip: '',
    status: 'upcoming',
  });
  const [msg, setMsg] = useState(null);
  const [eventStats, setEventStats] = useState({});
  const [storyEvt, setStoryEvt] = useState(null);
  const [reportEvt, setReportEvt] = useState(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  // Load stats for each event
  useEffect(() => {
    if (!isOpen || !supabase) return;
    async function loadStats() {
      const { data } = await supabase.from('attendees').select('event_id, status');
      if (data) {
        const stats = {};
        data.forEach(a => {
          const eid = a.event_id || '00000000-0000-0000-0000-000000000001';
          if (!stats[eid]) stats[eid] = { total: 0, checkedIn: 0 };
          stats[eid].total += 1;
          if (a.status === 'checked_in') stats[eid].checkedIn += 1;
        });
        setEventStats(stats);
      }
    }
    loadStats();
  }, [isOpen, events]);

  if (!isOpen) return null;

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const activeEvents = events.filter(e => !isEventArchived(e));
  const archivedEvents = events.filter(e => isEventArchived(e));

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Vui lòng nhập tên sự kiện!', 'error');

    setLoading(true);
    const { error } = await createEvent(form);
    setLoading(false);

    if (error) {
      showToast('Lỗi tạo sự kiện: ' + error.message, 'error');
    } else {
      showToast('Đã tạo sự kiện mới thành công!');
      setForm({ name: '', description: '', location: '', event_date: '', logo_url: '', welcome_wish: '', welcome_wish_vip: '', status: 'upcoming' });
      setMode('list');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvt || !form.name.trim()) return;

    setLoading(true);
    const { error } = await updateEvent(editingEvt.id, form);
    setLoading(false);

    if (error) {
      showToast('Lỗi cập nhật sự kiện: ' + error.message, 'error');
    } else {
      showToast('Đã cập nhật thông tin sự kiện!');
      setEditingEvt(null);
      setMode(form.status === 'archived' ? 'archived' : 'list');
    }
  };

  const handleStartEdit = (evt) => {
    setEditingEvt(evt);
    let dateStr = '';
    if (evt.event_date) {
      const d = new Date(evt.event_date);
      if (!isNaN(d.getTime())) {
        const pad = n => String(n).padStart(2, '0');
        dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    setForm({
      name: evt.name || '',
      description: evt.description || '',
      location: evt.location || '',
      event_date: dateStr,
      logo_url: evt.logo_url || '',
      welcome_wish: evt.welcome_wish || '',
      welcome_wish_vip: evt.welcome_wish_vip || '',
      status: evt.status || 'active',
    });
    setMode('edit');
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vĩnh viễn sự kiện "${name}"? Tất cả khách mời thuộc sự kiện này cũng sẽ bị xóa!`)) return;

    const { error } = await deleteEvent(id);
    if (error) {
      showToast('Lỗi xóa sự kiện: ' + error.message, 'error');
    } else {
      showToast('Đã xóa sự kiện thành công!');
    }
  };

  const handleArchive = async (evt) => {
    if (!window.confirm(`Xác nhận đưa sự kiện "${evt.name}" vào mục LƯU TRỮ?\n(Sự kiện sẽ được ẩn khỏi màn hình hoạt động chính nhưng vẫn giữ nguyên dữ liệu & khách mời)`)) return;

    const { error } = await updateEvent(evt.id, { status: 'archived' });
    if (error) {
      showToast('Lỗi lưu trữ: ' + error.message, 'error');
    } else {
      if (selectedEventId === evt.id) {
        setSelectedEventId('all');
      }
      showToast(`Đã đưa "${evt.name}" vào tab Lưu Trữ thành công!`);
    }
  };

  const handleUnarchive = async (evt) => {
    const { error } = await updateEvent(evt.id, { status: 'completed' });
    if (error) {
      showToast('Lỗi khôi phục: ' + error.message, 'error');
    } else {
      showToast(`Đã khôi phục "${evt.name}" về danh sách sự kiện!`);
    }
  };

  const sqlMigrationCode = `-- Chạy SQL này trong Supabase Dashboard -> SQL Editor nếu cần:
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  location VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nếu bảng events đã có sẵn, cập nhật ràng buộc status:
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('upcoming', 'active', 'completed', 'archived'));

ALTER TABLE attendees ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS company VARCHAR(100);
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select events" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert events" ON events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update events" ON events FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete events" ON events FOR DELETE TO anon USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE events;`;

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <div
          id="event-modal-overlay"
          className="modal-overlay modal-large"
          onClick={onClose}
        >
        <div
          className="modal-card modal-large-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            maxWidth: 720,
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(79,156,249,0.15)', color: 'var(--accent-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconCalendar size={22} color="var(--accent-primary)" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {mode === 'create' ? 'Tạo Sự Kiện Mới' : mode === 'edit' ? 'Chỉnh Sửa Sự Kiện' : mode === 'archived' ? 'Kho Lưu Trữ Sự Kiện' : mode === 'sql' ? 'Hướng Dẫn Cấu Hình SQL' : 'Quản Lý Sự Kiện'}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  Quản lý các chương trình, xuất ảnh Story Marketing và lưu trữ sự kiện
                </p>
              </div>
            </div>
            <button
              id="btn-close-event-modal"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Modal Subtabs / Header actions */}
          <div style={{ padding: '12px 24px 0', display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)', flexWrap: 'wrap' }}>
            <button
              id="tab-event-list"
              className={`section-tab ${mode === 'list' ? 'active' : ''}`}
              onClick={() => setMode('list')}
              style={{ fontSize: 13, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IconFileText size={14} /> Danh sách sự kiện ({activeEvents.length})
            </button>
            <button
              id="tab-event-create"
              className={`section-tab ${mode === 'create' ? 'active' : ''}`}
              onClick={() => { setForm({ name: '', description: '', location: '', event_date: '', status: 'upcoming' }); setMode('create'); }}
              style={{ fontSize: 13, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IconPlus size={14} /> Tạo sự kiện mới
            </button>
            <button
              id="tab-event-archived"
              className={`section-tab ${mode === 'archived' ? 'active' : ''}`}
              onClick={() => setMode('archived')}
              style={{
                fontSize: 13, padding: '8px 14px',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                borderColor: mode === 'archived' ? '#a855f7' : void 0,
                color: mode === 'archived' ? '#c084fc' : void 0,
              }}
            >
              <IconFolder size={14} /> Lưu trữ ({archivedEvents.length})
            </button>
            {sqlMigrationNeeded && (
              <button
                id="tab-event-sql"
                className={`section-tab ${mode === 'sql' ? 'active' : ''}`}
                onClick={() => setMode('sql')}
                style={{ fontSize: 13, padding: '8px 14px', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <IconAlertTriangle size={14} color="#f59e0b" /> Hướng dẫn SQL Migration
              </button>
            )}
          </div>

        {/* Toast alert */}
        {msg && (
          <div style={{ margin: '16px 24px 0' }} className={`alert ${msg.type === 'error' ? 'alert-warning' : 'alert-info'}`}>
            {msg.text}
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* SQL Migration Mode */}
          {mode === 'sql' && (
            <div>
              <div className="alert alert-warning" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconAlertTriangle size={18} color="#f59e0b" />
                <div>
                  <strong>Bảng database "events" chưa có trong Supabase.</strong><br />
                  Vui lòng copy đoạn mã SQL bên dưới và dán vào <strong>Supabase Dashboard → SQL Editor</strong> để mở khóa tính năng nhiều sự kiện.
                </div>
              </div>
              <pre style={{
                fontSize: 12,
                background: '#0d1117',
                color: '#7ee787',
                padding: 16,
                borderRadius: 'var(--radius-md)',
                overflowX: 'auto',
                border: '1px solid var(--border-color)',
                lineHeight: 1.5,
              }}>
                {sqlMigrationCode}
              </pre>
              <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  id="btn-copy-sql"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    navigator.clipboard.writeText(sqlMigrationCode);
                    showToast('Đã copy mã SQL vào Clipboard!');
                  }}
                >
                  <IconCopy size={14} /> Copy mã SQL
                </button>
                <button
                  id="btn-retry-events"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={fetchEvents}
                >
                  <IconRefresh size={14} /> Kiểm tra lại Database
                </button>
              </div>
            </div>
          )}

          {/* List Mode */}
          {mode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: 12 }}>
                    <IconFileText size={40} color="var(--text-muted)" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Chưa có sự kiện nào đang hoạt động
                  </div>
                  <p style={{ fontSize: 13, margin: 0, color: 'var(--text-secondary)' }}>
                    Bấm "Tạo sự kiện mới" để thêm sự kiện hoặc kiểm tra trong tab "Lưu trữ".
                  </p>
                </div>
              ) : (
                activeEvents.map(evt => {
                  const isSelected = selectedEventId === evt.id;
                  const stats = eventStats[evt.id] || { total: 0, checkedIn: 0 };
                  const pct = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

                  const statusInfo = getEventStatusInfo(evt);
                  const { isCompleted, isOngoing, isUpcoming } = statusInfo;

                  return (
                    <div
                      key={evt.id}
                      style={{
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: 16,
                        background: isSelected ? 'rgba(79,156,249,0.08)' : 'var(--bg-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 260, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          {evt.logo_url && (
                            <img
                              src={evt.logo_url}
                              alt="Logo"
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: 'contain',
                                borderRadius: 10,
                                background: '#ffffff',
                                border: '1px solid var(--border-color)',
                                padding: 3,
                                flexShrink: 0,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                              }}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                {evt.name}
                              </h3>
                              {isSelected && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: 'var(--accent-primary)', color: '#fff' }}>
                                  ĐANG CHỌN
                                </span>
                              )}
                              {/* Status Pill */}
                              {isCompleted ? (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <IconDot size={8} color="#94a3b8" /> ĐÃ KẾT THÚC
                                </span>
                              ) : isOngoing ? (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                                  ĐANG DIỄN RA
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <IconDot size={8} color="#60a5fa" /> SẮP DIỄN RA
                                </span>
                              )}
                            </div>

                            {cleanEventDescription(evt.description) && (
                              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                                {cleanEventDescription(evt.description)}
                              </p>
                            )}

                            {evt.welcome_wish && (
                              <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontStyle: 'italic', marginBottom: 6 }}>
                                💌 Lời chúc: "{evt.welcome_wish}"
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                              {evt.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconMapPin size={13} /> {evt.location}</span>}
                              {evt.event_date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconCalendar size={13} /> {new Date(evt.event_date).toLocaleString('vi-VN')}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* View Detailed Report Button */}
                          <button
                            id={`btn-report-evt-${evt.id}`}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              color: 'var(--accent-primary)',
                              borderColor: 'rgba(59, 130, 246, 0.3)',
                              background: 'rgba(59, 130, 246, 0.08)',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                            onClick={() => setReportEvt(evt)}
                            title="Xem báo cáo chi tiết & xuất file Excel"
                          >
                            <IconReport size={13} color="var(--accent-primary)" /> Báo cáo
                          </button>

                          {/* Story 9:16 Marketing button */}
                          <button
                            id={`btn-story-evt-${evt.id}`}
                            type="button"
                            className="btn btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                              color: '#fff',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              boxShadow: '0 2px 10px rgba(236,72,153,0.3)',
                            }}
                            onClick={() => setStoryEvt(evt)}
                            title="Tạo ảnh tổng quan Story 9:16 Marketing"
                          >
                            <IconCamera size={13} /> Story 9:16
                          </button>

                          {/* Quick Status Action Button */}
                          {isOngoing && (
                            <button
                              id={`btn-end-evt-${evt.id}`}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: '#f87171',
                                borderColor: 'rgba(239,68,68,0.3)',
                                background: 'rgba(239,68,68,0.08)',
                                fontSize: 12,
                              }}
                              onClick={async () => {
                                await updateEvent(evt.id, { status: 'completed' });
                                showToast(`Đã đánh dấu sự kiện "${evt.name}" là ĐÃ KẾT THÚC!`);
                              }}
                              title="Đánh dấu sự kiện đã kết thúc"
                            >
                              <IconStop size={13} /> Kết thúc
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              id={`btn-reopen-evt-${evt.id}`}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: '#34d399',
                                borderColor: 'rgba(16,185,129,0.3)',
                                background: 'rgba(16,185,129,0.08)',
                                fontSize: 12,
                              }}
                              onClick={async () => {
                                await updateEvent(evt.id, { status: 'active' });
                                showToast(`Đã mở lại sự kiện "${evt.name}" (Đang diễn ra)!`);
                              }}
                              title="Mở lại sự kiện (Chuyển sang Đang diễn ra)"
                            >
                              <IconPlay size={13} /> Mở lại
                            </button>
                          )}

                          {isUpcoming && (
                            <button
                              id={`btn-activate-evt-${evt.id}`}
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: '#60a5fa',
                                borderColor: 'rgba(59,130,246,0.3)',
                                background: 'rgba(59,130,246,0.08)',
                                fontSize: 12,
                              }}
                              onClick={async () => {
                                await updateEvent(evt.id, { status: 'active' });
                                showToast(`Đã chuyển sự kiện "${evt.name}" sang ĐANG DIỄN RA!`);
                              }}
                              title="Kích hoạt sự kiện sang Đang diễn ra"
                            >
                              <IconZap size={13} /> Bắt đầu ngay
                            </button>
                          )}

                          {/* Archive Button */}
                          <button
                            id={`btn-archive-evt-${evt.id}`}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#c084fc',
                              borderColor: 'rgba(168,85,247,0.3)',
                              background: 'rgba(168,85,247,0.08)',
                              fontSize: 12,
                            }}
                            onClick={() => handleArchive(evt)}
                            title="Đưa sự kiện vào mục Lưu Trữ"
                          >
                            <IconFolder size={13} /> Lưu trữ
                          </button>

                          {!isSelected && (
                            <button
                              id={`btn-select-evt-${evt.id}`}
                              className="btn btn-primary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={() => { setSelectedEventId(evt.id); showToast(`Đã chọn "${evt.name}"`); }}
                            >
                              <IconZap size={14} /> Chọn
                            </button>
                          )}
                          <button
                            id={`btn-edit-evt-${evt.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleStartEdit(evt)}
                          >
                            <IconEdit size={14} /> Sửa
                          </button>
                          <button
                            id={`btn-delete-evt-${evt.id}`}
                            className="btn btn-danger btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px' }}
                            onClick={() => handleDelete(evt.id, evt.name)}
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Mini Stats Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10, borderTop: '1px dashed var(--border-color)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Khách mời: <strong>{stats.total}</strong></span>
                        <span style={{ color: 'var(--accent-success)' }}>Đã check-in: <strong>{stats.checkedIn}</strong></span>
                        <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Archived Mode */}
          {mode === 'archived' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {archivedEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: 12 }}>
                    <IconFolder size={40} color="var(--text-muted)" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Thư mục lưu trữ trống
                  </div>
                  <p style={{ fontSize: 13, margin: 0, color: 'var(--text-secondary)' }}>
                    Khi sự kiện kết thúc, bạn có thể bấm nút "Lưu trữ" trong danh sách sự kiện để chuyển vào đây.
                  </p>
                </div>
              ) : (
                archivedEvents.map(evt => {
                  const stats = eventStats[evt.id] || { total: 0, checkedIn: 0 };
                  const pct = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

                  return (
                    <div
                      key={evt.id}
                      style={{
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: 16,
                        background: 'rgba(168, 85, 247, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                              {evt.name}
                            </h3>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <IconFolder size={12} /> ĐÃ LƯU TRỮ
                            </span>
                          </div>

                          {cleanEventDescription(evt.description) && (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
                              {cleanEventDescription(evt.description)}
                            </p>
                          )}

                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            {evt.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconMapPin size={13} /> {evt.location}</span>}
                            {evt.event_date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconCalendar size={13} /> {new Date(evt.event_date).toLocaleString('vi-VN')}</span>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* View Report Button */}
                          <button
                            id={`btn-report-archived-${evt.id}`}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              color: 'var(--accent-primary)',
                              borderColor: 'rgba(59, 130, 246, 0.3)',
                              background: 'rgba(59, 130, 246, 0.08)',
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                            onClick={() => setReportEvt(evt)}
                            title="Xem báo cáo chi tiết & danh sách check-in"
                          >
                            <IconReport size={13} color="var(--accent-primary)" /> Xem báo cáo
                          </button>

                          {/* Story 9:16 Marketing button */}
                          <button
                            id={`btn-story-archived-${evt.id}`}
                            type="button"
                            className="btn btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                              color: '#fff',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              boxShadow: '0 2px 10px rgba(236,72,153,0.3)',
                            }}
                            onClick={() => setStoryEvt(evt)}
                            title="Tạo ảnh tổng quan Story 9:16 Marketing"
                          >
                            <IconCamera size={13} /> Story 9:16
                          </button>

                          {/* Restore / Unarchive Button */}
                          <button
                            id={`btn-restore-evt-${evt.id}`}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: '#34d399',
                              borderColor: 'rgba(16,185,129,0.3)',
                              background: 'rgba(16,185,129,0.08)',
                              fontSize: 12,
                            }}
                            onClick={() => handleUnarchive(evt)}
                            title="Khôi phục sự kiện về danh sách chính"
                          >
                            <IconRepeat size={13} /> Khôi phục
                          </button>

                          <button
                            id={`btn-edit-archived-${evt.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleStartEdit(evt)}
                          >
                            <IconEdit size={14} /> Sửa
                          </button>
                          <button
                            id={`btn-delete-archived-${evt.id}`}
                            className="btn btn-danger btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px' }}
                            onClick={() => handleDelete(evt.id, evt.name)}
                            title="Xóa vĩnh viễn sự kiện này"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Mini Stats Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10, borderTop: '1px dashed var(--border-color)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Khách mời: <strong>{stats.total}</strong></span>
                        <span style={{ color: 'var(--accent-success)' }}>Đã check-in: <strong>{stats.checkedIn}</strong></span>
                        <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Create & Edit Mode */}
          {(mode === 'create' || mode === 'edit') && (
            <form onSubmit={mode === 'create' ? handleCreateSubmit : handleEditSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="evt-name">
                    Tên sự kiện <span style={{ color: 'var(--accent-danger)' }}>*</span>
                  </label>
                  <input
                    id="evt-name"
                    className="form-input"
                    placeholder="VD: Hội Thảo NITEK Summit 2026"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="evt-date">Thời gian tổ chức</label>
                    <input
                      id="evt-date"
                      type="datetime-local"
                      className="form-input"
                      value={form.event_date}
                      onChange={e => {
                        const val = e.target.value;
                        const isFuture = val ? new Date(val) > new Date() : false;
                        setForm(f => ({
                          ...f,
                          event_date: val,
                          status: mode === 'create' ? (isFuture ? 'upcoming' : 'active') : f.status,
                        }));
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="evt-status">Trạng thái</label>
                    <select
                      id="evt-status"
                      className="form-select"
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="upcoming">Sắp diễn ra (Upcoming)</option>
                      <option value="active">Đang diễn ra (Active)</option>
                      <option value="completed">Đã kết thúc (Completed)</option>
                      <option value="archived">Đã lưu trữ (Archived)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="evt-location">Địa điểm tổ chức</label>
                  <input
                    id="evt-location"
                    className="form-input"
                    placeholder="VD: Trung tâm hội nghị NITEK, Quận 1, TP.HCM"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>

                {/* Logo Chương Trình / Sự Kiện */}
                <div className="form-group">
                  <label className="form-label">
                    Logo chương trình (Hiển thị trên Màn chiếu sân khấu & Thẻ chào mừng)
                  </label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {form.logo_url ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={form.logo_url}
                          alt="Logo Preview"
                          style={{
                            width: 64,
                            height: 64,
                            objectFit: 'contain',
                            borderRadius: 12,
                            background: '#ffffff',
                            padding: 4,
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 10,
                          }}
                          title="Xóa logo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 12,
                          border: '2px dashed var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          fontSize: 11,
                          textAlign: 'center',
                        }}
                      >
                        Chưa có
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <input
                        id="evt-logo-file"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              return showToast('Dung lượng ảnh tối đa 2MB!', 'error');
                            }
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              setForm(f => ({ ...f, logo_url: evt.target.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => document.getElementById('evt-logo-file')?.click()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}
                      >
                        <IconCamera size={14} /> Tải ảnh Logo lên
                      </button>
                      <input
                        className="form-input"
                        placeholder="Hoặc dán đường dẫn ảnh Logo (https://...)"
                        value={form.logo_url}
                        onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Lời chúc chào mừng khi check-in */}
                <div className="form-group">
                  <label className="form-label" htmlFor="evt-wish">
                    Lời chúc chào mừng (Khách thường khi check-in)
                  </label>
                  <input
                    id="evt-wish"
                    className="form-input"
                    placeholder="VD: Chúc bạn có một trải nghiệm thật tuyệt vời và nhiều kỷ niệm đáng nhớ! 🎉"
                    value={form.welcome_wish}
                    onChange={e => setForm(f => ({ ...f, welcome_wish: e.target.value }))}
                  />
                </div>

                {/* Lời chúc chào mừng Khách VIP */}
                <div className="form-group">
                  <label className="form-label" htmlFor="evt-wish-vip" style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconCrown size={14} color="#f59e0b" /> Lời chúc chào mừng dành riêng cho Khách Quý VIP
                  </label>
                  <input
                    id="evt-wish-vip"
                    className="form-input"
                    placeholder="VD: Trân trọng cảm ơn sự hiện diện quý báu của Quý Khách tại sự kiện! 🌟"
                    value={form.welcome_wish_vip}
                    onChange={e => setForm(f => ({ ...f, welcome_wish_vip: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="evt-desc">Mô tả / Ghi chú sự kiện</label>
                  <textarea
                    id="evt-desc"
                    className="form-input"
                    rows={2}
                    placeholder="Nhập mô tả tổng quan sự kiện..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button
                  id="btn-cancel-evt-form"
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMode('list')}
                >
                  Hủy
                </button>
                <button
                  id="btn-submit-evt-form"
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  disabled={loading}
                >
                  {loading ? <><span className="loading-spinner" /> Đang lưu…</> : (mode === 'create' ? <><IconPlus size={16} /> Tạo Sự Kiện</> : <><IconSave size={16} /> Lưu Cập Nhật</>)}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  )}

    {/* Story 9:16 Marketing Modal */}
    <EventStoryModal
      isOpen={Boolean(storyEvt)}
      onClose={() => setStoryEvt(null)}
      event={storyEvt}
    />

    {/* Event Detailed Report Modal */}
    <EventReportModal
      isOpen={Boolean(reportEvt)}
      onClose={() => setReportEvt(null)}
      event={reportEvt}
      onOpenStory={(evt) => setStoryEvt(evt)}
    />
  </>
  );
}
