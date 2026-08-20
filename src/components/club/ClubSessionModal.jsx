import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RECURRENCE_OPTIONS, parseSessionDate } from '../../contexts/ClubContext';
import {
  IconSettings,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPin,
  IconStar,
  IconRepeat,
  IconX,
  IconSave,
  IconRocket,
  IconInfo,
  IconAlertTriangle,
  IconCheck,
} from '../common/CustomIcons';

export const ABSENCE_CUTOFF_OPTIONS = [
  { value: 0, label: '0 tiếng (Cho phép báo vắng đến khi buổi sinh hoạt bắt đầu)' },
  { value: 1, label: 'Trước 1 tiếng (Khuyên dùng cho buổi đột xuất)' },
  { value: 2, label: 'Trước 2 tiếng (Mặc định chuẩn CLB)' },
  { value: 3, label: 'Trước 3 tiếng' },
  { value: 4, label: 'Trước 4 tiếng' },
  { value: 6, label: 'Trước 6 tiếng' },
  { value: 12, label: 'Trước 12 tiếng' },
  { value: 24, label: 'Trước 24 tiếng (1 ngày trước)' },
  { value: 48, label: 'Trước 48 tiếng (2 ngày trước)' },
  { value: 72, label: 'Trước 72 tiếng (3 ngày trước)' },
];

export const GRACE_PERIOD_OPTIONS = [
  { value: 0, label: '0 phút (Đúng giờ quy định, trễ là tính trễ)' },
  { value: 5, label: '5 phút' },
  { value: 10, label: '10 phút' },
  { value: 15, label: '15 phút (Mặc định chuẩn CLB)' },
  { value: 30, label: '30 phút' },
  { value: 45, label: '45 phút' },
  { value: 60, label: '60 phút (1 tiếng)' },
];

export default function ClubSessionModal({
  isOpen,
  onClose,
  session = null,
  onSave,
}) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    title: '',
    session_date: todayStr,
    start_time: '08:00',
    grace_period_minutes: 15,
    absence_cutoff_hours: 2,
    recurrence_rule: 'none',
    location: '',
    description: '',
    is_mandatory: true,
    status: 'scheduled',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (session) {
      let dateStr = todayStr;
      if (session.session_date) {
        const d = parseSessionDate(session.session_date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${day}`;
      }
      setForm({
        title: session.title || '',
        session_date: dateStr,
        start_time: session.start_time || '08:00',
        grace_period_minutes: session.grace_period_minutes ?? 15,
        absence_cutoff_hours: session.absence_cutoff_hours ?? 2,
        recurrence_rule: session.recurrence_rule || 'none',
        location: session.location || '',
        description: (session.description || '').replace(/\s*\[CUTOFF:\d+\]\s*/g, '').trim(),
        is_mandatory: session.is_mandatory !== false,
        status: session.status || 'scheduled',
      });
    } else {
      setForm({
        title: '',
        session_date: todayStr,
        start_time: '08:00',
        grace_period_minutes: 15,
        absence_cutoff_hours: 2,
        recurrence_rule: 'none',
        location: '',
        description: '',
        is_mandatory: true,
        status: 'scheduled',
      });
    }
    setErrorMsg(null);
  }, [session, isOpen, todayStr]);

  if (!isOpen) return null;

  // Calculate live preview of absence deadline & session start
  const calculateDeadlinePreview = () => {
    if (!form.session_date) return null;
    const baseDate = parseSessionDate(form.session_date);
    const [hh, mm] = (form.start_time || '08:00').split(':').map(Number);
    const sessionStart = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      Number.isFinite(hh) ? hh : 8,
      Number.isFinite(mm) ? mm : 0,
      0,
      0
    );

    const cutoff = Number(form.absence_cutoff_hours ?? 2);
    const deadline = new Date(sessionStart.getTime() - cutoff * 3600 * 1000);
    const isPassed = new Date() > deadline;

    return {
      sessionStartStr: sessionStart.toLocaleString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      deadlineStr: deadline.toLocaleString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      cutoff,
      isPassed,
    };
  };

  const preview = calculateDeadlinePreview();

  const handleSubmit = async (e, targetStatus) => {
    if (e) e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg('Vui lòng nhập tên buổi sinh hoạt!');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    let fullDate;
    if (form.session_date) {
      const [y, m, d] = form.session_date.split('-').map(Number);
      const [hh, mm] = (form.start_time || '08:00').split(':').map(Number);
      fullDate = new Date(y, m - 1, d, hh || 8, mm || 0, 0).toISOString();
    } else {
      fullDate = new Date().toISOString();
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      session_date: fullDate,
      start_time: form.start_time || '08:00',
      grace_period_minutes: Number(form.grace_period_minutes ?? 15),
      absence_cutoff_hours: Number(form.absence_cutoff_hours ?? 2),
      status: targetStatus || form.status || 'scheduled',
    };

    const res = await onSave(payload, session);
    setSaving(false);

    if (res?.error) {
      setErrorMsg(res.error.message || 'Lỗi khi lưu buổi sinh hoạt');
    } else {
      onClose();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-overlay modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 16,
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 580,
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
          borderRadius: 'var(--radius-xl, 20px)',
          padding: 24,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {session ? <IconSettings size={20} /> : <IconCalendar size={20} />}
              <span>{session ? 'Cài Đặt & Chỉnh Sửa Buổi Sinh Hoạt' : 'Lên Lịch Buổi Sinh Hoạt Mới'}</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Thiết lập giờ sinh hoạt bắt đầu và hạn chót nhận đơn báo vắng của thành viên
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '6px 10px' }}
          >
            <IconX size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="alert alert-warning" style={{ marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconAlertTriangle size={16} color="#f59e0b" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={e => handleSubmit(e, session ? session.status : 'scheduled')} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tên buổi sinh hoạt */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>
              Tên buổi sinh hoạt <span style={{ color: 'var(--accent-danger)' }}>*</span>
            </label>
            <input
              className="form-input"
              placeholder="VD: Sinh hoạt định kỳ Tuần 1 tháng 8, Training Ban Chuyên môn..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              autoFocus
            />
          </div>

          {/* Tính chất: Bắt buộc vs Tự nguyện */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Tính chất buổi sinh hoạt</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                border: `1px solid ${form.is_mandatory ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: form.is_mandatory ? 'rgba(79,156,249,0.12)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
              }}>
                <input
                  type="radio"
                  name="session_is_mandatory"
                  checked={form.is_mandatory === true}
                  onChange={() => setForm(f => ({ ...f, is_mandatory: true }))}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconPin size={15} color="var(--accent-primary)" /> Bắt Buộc
                </span>
              </label>

              <label style={{
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                border: `1px solid ${!form.is_mandatory ? '#f59e0b' : 'var(--border-color)'}`,
                background: !form.is_mandatory ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
              }}>
                <input
                  type="radio"
                  name="session_is_mandatory"
                  checked={form.is_mandatory === false}
                  onChange={() => setForm(f => ({ ...f, is_mandatory: false }))}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconStar size={15} color="#f59e0b" /> Tự Nguyện (+1 CC)
                </span>
              </label>
            </div>
          </div>

          {/* Ngày & Giờ bắt đầu */}
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconCalendar size={14} color="var(--accent-primary)" /> Ngày sinh hoạt <span style={{ color: 'var(--accent-danger)' }}>*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={form.session_date}
                onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconClock size={14} color="var(--accent-primary)" /> Giờ bắt đầu sinh hoạt <span style={{ color: 'var(--accent-danger)' }}>*</span>
              </label>
              <input
                type="time"
                className="form-input"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Hạn chót ngưng nhận đơn báo vắng & Thời gian cho phép trễ */}
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconClock size={14} color="#f59e0b" /> Hạn chót ngưng nhận đơn báo vắng
              </label>
              <select
                className="form-select"
                value={form.absence_cutoff_hours}
                onChange={e => setForm(f => ({ ...f, absence_cutoff_hours: Number(e.target.value) }))}
              >
                {ABSENCE_CUTOFF_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconClock size={14} color="var(--text-secondary)" /> Cho phép trễ
              </label>
              <select
                className="form-select"
                value={form.grace_period_minutes}
                onChange={e => setForm(f => ({ ...f, grace_period_minutes: Number(e.target.value) }))}
              >
                {GRACE_PERIOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Deadline Preview Callout Banner */}
          {preview && (
            <div style={{
              background: preview.isPassed ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${preview.isPassed ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              borderRadius: 'var(--radius-md, 12px)',
              padding: '12px 16px',
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: preview.isPassed ? '#f87171' : '#34d399', marginBottom: 4 }}>
                {preview.isPassed ? <IconAlertTriangle size={15} color="#ef4444" /> : <IconCheck size={15} color="#10b981" />}
                <span>Xem trước mốc thời gian áp dụng:</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, color: 'var(--text-primary)' }}>
                <div>
                  • Bắt đầu sinh hoạt: <strong>{preview.sessionStartStr}</strong>
                </div>
                <div>
                  • Hạn chót nhận đơn báo vắng: <strong style={{ color: preview.isPassed ? '#f87171' : '#60a5fa' }}>{preview.deadlineStr}</strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                    ({preview.cutoff === 0 ? 'Đến đúng giờ sinh hoạt' : `Trước giờ sinh hoạt ${preview.cutoff} tiếng`})
                  </span>
                </div>
                {preview.isPassed && (
                  <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>
                    ⚠️ Lưu ý: Mốc hạn chót này đã ở trong quá khứ so với thời điểm hiện tại. Thành viên gửi đơn sẽ bị thông báo đã quá hạn.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lặp lại tự động */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconRepeat size={14} /> Cài đặt lặp lại tự động
            </label>
            <select
              className="form-select"
              value={form.recurrence_rule}
              onChange={e => setForm(f => ({ ...f, recurrence_rule: e.target.value }))}
            >
              {RECURRENCE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Địa điểm sinh hoạt */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconMapPin size={14} /> Địa điểm sinh hoạt
            </label>
            <input
              className="form-input"
              placeholder="VD: Phòng sinh hoạt CLB, Hội trường A, Sân vận động..."
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
          </div>

          {/* Ghi chú */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Ghi chú / Nội dung sinh hoạt</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Nội dung thảo luận, trang phục yêu cầu, phân công..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>

            {!session ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={e => handleSubmit(e, 'scheduled')}
                  disabled={saving}
                >
                  {saving ? <span className="loading-spinner" /> : <IconCalendar size={15} />}
                  <span>Lên Lịch Trước</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1.2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={e => handleSubmit(e, 'open')}
                  disabled={saving}
                >
                  {saving ? <span className="loading-spinner" /> : <IconRocket size={15} />}
                  <span>Mở & Điểm Danh Ngay</span>
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                disabled={saving}
              >
                {saving ? (
                  <><span className="loading-spinner" /> Đang lưu…</>
                ) : (
                  <><IconSave size={15} /> Cập Nhật Cài Đặt</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
