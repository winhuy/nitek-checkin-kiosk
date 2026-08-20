import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../../lib/supabaseClient';
import { useClub, checkIsLate, getAbsenceDeadline, isAbsenceDeadlinePassed, RECURRENCE_OPTIONS } from '../../contexts/ClubContext';
import ClubSessionModal from './ClubSessionModal';
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconCheckCircle,
  IconPlus,
  IconRefresh,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconUser,
  IconPin,
  IconSchool,
  IconDot,
  IconFileText,
  IconScanner,
  IconSettings,
  IconTrash,
  IconLock,
  IconStar,
} from '../common/CustomIcons';

// ─── Beep helper ──────────────────────────────────────────────────────────
function playBeep(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
    } else if (type === 'late') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15); // A4
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
    }
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_e) { /* ignore */ }
}

// ─── Welcome Overlay ──────────────────────────────────────────────────────
function WelcomeOverlay({ member, isLate, lateMinutes, startTime, recordId, onMarkOnTime, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!member) return null;
  const firstName = member.full_name.split(' ').pop();

  const themeColor = isLate ? '#f59e0b' : '#10b981';
  const themeBg = isLate ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';
  const themeBorder = isLate ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)';

  return (
    <div
      id="club-welcome-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.3s ease', cursor: 'pointer',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          textAlign: 'center', padding: '48px 40px',
          maxWidth: 500, width: '100%',
          animation: 'welcomePop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Avatar Badge Icon */}
        <div style={{
          width: 130, height: 130, borderRadius: '50%',
          background: `linear-gradient(135deg, ${themeColor}, #fbbf24)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: `0 0 60px ${isLate ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'}`,
        }}>
          {isLate ? <IconAlertTriangle size={64} color="#fff" /> : <IconCheck size={64} color="#fff" />}
        </div>

        <div style={{ fontSize: 36, fontWeight: 900, color: themeColor, marginBottom: 6 }}>
          Chào, {firstName}!
        </div>
        <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 8, fontWeight: 600 }}>
          {member.full_name}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: themeBg, border: `1px solid ${themeBorder}`,
          borderRadius: 24, padding: '6px 18px', fontSize: 13,
          color: themeColor, fontWeight: 600, marginBottom: 20,
        }}>
          <IconPin size={13} /> {member.member_code} {member.class_name ? `• Lớp: ${member.class_name}` : ''}
        </div>

        {/* Status Badge */}
        {isLate ? (
          <div style={{
            background: 'rgba(245,158,11,0.18)',
            border: '1px solid rgba(245,158,11,0.5)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconAlertTriangle size={22} color="#f59e0b" /> ĐẾN TRỄ (+{lateMinutes} phút)
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 12 }}>
              Giờ quy định: <strong>{startTime || '08:00'}</strong> • Đã ghi nhận đến trễ
            </div>
            {recordId && onMarkOnTime && (
              <button
                type="button"
                onClick={() => onMarkOnTime(recordId)}
                style={{
                  background: 'rgba(16,185,129,0.25)',
                  border: '1px solid rgba(16,185,129,0.6)',
                  color: '#34d399',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                }}
              >
                <IconDot size={8} color="#34d399" /> Đổi thành Đến Đúng Giờ
              </button>
            )}
          </div>
        ) : (
          <div style={{
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981', letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconCheck size={22} color="#10b981" /> ĐIỂM DANH ĐÚNG GIỜ
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              Giờ quy định: <strong>{startTime || '08:00'}</strong>
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Click để đóng
        </div>
      </div>

      <style>{`
        @keyframes welcomePop {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── DuplicateAlert ───────────────────────────────────────────────────────
function DuplicateAlert({ member, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  if (!member) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div style={{
        textAlign: 'center', padding: '48px 40px',
        animation: 'welcomePop 0.4s ease',
      }}>
        <div style={{ marginBottom: 16 }}><IconAlertTriangle size={72} color="#f59e0b" /></div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginBottom: 8 }}>
          Đã điểm danh rồi!
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
          {member.full_name} đã điểm danh trong buổi này
        </div>
      </div>
    </div>
  );
}

// ─── NotFoundAlert ────────────────────────────────────────────────────────
function NotFoundAlert({ code, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div style={{ textAlign: 'center', padding: '48px 40px', animation: 'welcomePop 0.4s ease' }}>
        <div style={{ marginBottom: 16 }}><IconX size={72} color="#ef4444" /></div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>
          Không tìm thấy thành viên
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Mã: <code style={{ color: '#f87171' }}>{code}</code>
        </div>
      </div>
    </div>
  );
}

// ─── NoSessionAlert ───────────────────────────────────────────────────────
function NoSessionAlert({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div style={{ textAlign: 'center', padding: '48px 40px', animation: 'welcomePop 0.4s ease' }}>
        <div style={{ marginBottom: 16 }}><IconAlertTriangle size={72} color="#f59e0b" /></div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginBottom: 8 }}>
          Chưa chọn buổi sinh hoạt!
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', maxWidth: 380, margin: '0 auto' }}>
          Vui lòng chọn hoặc kích hoạt một buổi sinh hoạt CLB trước khi quét điểm danh.
        </div>
      </div>
    </div>
  );
}

// ─── DbErrorAlert ─────────────────────────────────────────────────────────
function DbErrorAlert({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div style={{ textAlign: 'center', padding: '48px 40px', animation: 'welcomePop 0.4s ease' }}>
        <div style={{ marginBottom: 16 }}><IconX size={72} color="#ef4444" /></div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>
          Lỗi ghi nhận điểm danh!
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', maxWidth: 420, margin: '0 auto' }}>
          {message || 'Không thể lưu bản ghi điểm danh vào cơ sở dữ liệu.'}
        </div>
      </div>
    </div>
  );
}

// ─── GuestCheckinModal ───────────────────────────────────────────────────
function GuestCheckinModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  loading,
}) {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)', padding: 28,
          maxWidth: 460, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconUser size={18} color="var(--accent-primary)" /> Ghi Nhận Khách Vãng Lai Vào Phòng
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><IconX size={15} /></button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Họ và tên khách <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
            <input
              className="form-input"
              placeholder="Nguyễn Văn A"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              required autoFocus
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Lớp / Đơn vị</label>
              <input
                className="form-input"
                placeholder="VD: Khách vãng lai, Lớp 11A2..."
                value={form.class_name}
                onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input
                className="form-input"
                placeholder="0901234567"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ghi chú / Mục đích</label>
            <input
              className="form-input"
              placeholder="VD: Tham quan CLB, Dự thính..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled={loading}>
              {loading ? <><span className="loading-spinner" /> Đang lưu…</> : <><IconCheck size={14} /> Ghi Nhận & Điểm Danh Khách</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Main ClubAttendanceScanner ───────────────────────────────────────────
export default function ClubAttendanceScanner({ isActive }) {
  const { activeSession, sessions, members, createSession, updateSession, deleteSession, openSession, createMember, recordAttendance, markOnTime, fetchAttendanceForSession } = useClub();

  const [scanning, setScanning] = useState(false);
  const [processingCode, setProcessingCode] = useState(null);
  const [overlay, setOverlay] = useState(null); // { type, member, code, isLate, lateMinutes, startTime, message }
  const [attendanceList, setAttendanceList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [sessionModalTarget, setSessionModalTarget] = useState(null); // 'new' | session object | null
  const [manualCode, setManualCode] = useState('');

  // Guest Check-in Modal State
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestForm, setGuestForm] = useState({ full_name: '', phone: '', email: '', class_name: '', notes: '' });
  const [submittingGuest, setSubmittingGuest] = useState(false);

  const qrRef = useRef(null);
  const cooldownRef = useRef(false);
  const lastScannedRef = useRef({ code: '', time: 0 });

  // ── Load attendance list for active session ───────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!activeSession) { setAttendanceList([]); return; }
    setLoadingList(true);
    const { data } = await fetchAttendanceForSession(activeSession.id);
    setAttendanceList(data || []);
    setLoadingList(false);
  }, [activeSession, fetchAttendanceForSession]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  // ── Realtime attendance updates ───────────────────────────────────────
  useEffect(() => {
    if (!supabase || !activeSession) return;
    const ch = supabase
      .channel(`club-attend-${activeSession.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'club_attendance_records', filter: `session_id=eq.${activeSession.id}` },
        () => loadAttendance()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [activeSession, loadAttendance]);

  // ── QR Scanner helpers ────────────────────────────────────────────────
  const stopQRScanner = useCallback(async () => {
    if (qrRef.current) {
      try {
        await qrRef.current.stop();
        qrRef.current.clear();
      } catch (_e) { /* ignore */ }
      qrRef.current = null;
    }
    setScanning(false);
  }, []);

  const startQRScanner = useCallback(async () => {
    if (qrRef.current) return;
    try {
      const scanner = new Html5Qrcode('club-qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        verbose: false,
      });
      qrRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 25, // Fluid 25 FPS scanning for instant code recognition
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            const boxSize = Math.max(180, Math.floor(minDim * 0.75));
            return { width: boxSize, height: boxSize };
          },
          aspectRatio: 1.0,
          disableFlip: true,
          videoConstraints: {
            facingMode: 'environment',
            focusMode: 'continuous',
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          },
        },
        async (rawCode) => {
          const code = (rawCode || '').trim().toUpperCase();
          const now = Date.now();

          // Prevent spamming the same member within 2.5s
          if (lastScannedRef.current.code === code && (now - lastScannedRef.current.time) < 2500) {
            return;
          }

          // Snappy 600ms debounce when scanning different members
          if (now - lastScannedRef.current.time < 600 || cooldownRef.current || processingCode) {
            return;
          }

          lastScannedRef.current = { code, time: now };
          cooldownRef.current = true;
          setProcessingCode(code);

          // Haptic tactile vibration feedback on supported mobile devices
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(50); } catch (_e) {}
          }

          await handleQRScan(code);

          setTimeout(() => {
            cooldownRef.current = false;
            setProcessingCode(null);
          }, 1000);
        },
        () => {} // ignore errors during scan
      );
      setScanning(true);
    } catch (err) {
      console.error('QR start failed:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processingCode, activeSession]);

  // ── QR / Code scan handler ────────────────────────────────────────────
  const handleQRScan = async (rawCode) => {
    const code = rawCode.trim().toUpperCase();

    // 0. Verify active session
    if (!activeSession) {
      playBeep('error');
      setOverlay({ type: 'no_session' });
      return;
    }

    // 1. Lookup member
    const { data: foundMembers } = await supabase
      .from('club_members')
      .select('*')
      .eq('member_code', code)
      .eq('status', 'active')
      .limit(1);

    if (!foundMembers || foundMembers.length === 0) {
      playBeep('error');
      setOverlay({ type: 'not_found', code });
      return;
    }

    const member = foundMembers[0];

    // 2. Check duplicate for current session
    const { data: existingRec } = await supabase
      .from('club_attendance_records')
      .select('id')
      .eq('member_id', member.id)
      .eq('session_id', activeSession.id)
      .limit(1);

    if (existingRec && existingRec.length > 0) {
      playBeep('error');
      setOverlay({ type: 'duplicate', member });
      return;
    }

    // 3. Check if late
    const { isLate, lateMinutes, status: checkinStatus } = checkIsLate(activeSession, new Date());

    // 4. Record attendance & verify DB insert
    const { data: recData, error: recError } = await recordAttendance({
      memberId: member.id,
      sessionId: activeSession.id,
      checkinStatus,
      lateMinutes,
    });

    if (recError) {
      console.error('Failed to record attendance:', recError);
      playBeep('error');
      setOverlay({ type: 'db_error', message: recError.message });
      return;
    }

    // 5. Show success overlay ONLY on successful DB insert
    playBeep(isLate ? 'late' : 'success');
    setOverlay({
      type: 'success',
      member,
      isLate,
      lateMinutes,
      startTime: activeSession?.start_time || '08:00',
      recordId: recData?.[0]?.id,
    });
    await loadAttendance();
  };

  const handleMarkOnTimeInOverlay = async (recordId) => {
    if (!recordId) return;
    await markOnTime({ recordId });
    setOverlay(prev => prev ? { ...prev, isLate: false, lateMinutes: 0 } : null);
    await loadAttendance();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleQRScan(manualCode);
    setManualCode('');
  };

  // ── Checkin Guest / Visitor Info ──────────────────────────────────────
  const handleCheckinGuest = async (e) => {
    e.preventDefault();
    if (!guestForm.full_name.trim()) return alert('Vui lòng nhập Họ và tên khách!');
    if (!activeSession) return alert('Vui lòng chọn hoặc mở một buổi sinh hoạt!');

    setSubmittingGuest(true);

    try {
      // 1. Generate new member code for visitor
      const newMemberCode = generateMemberCode(members);

      // 2. Create member in database
      const { data: insertedMembers, error: createErr } = await createMember({
        member_code: newMemberCode,
        full_name: guestForm.full_name.trim(),
        class_name: guestForm.class_name.trim() || 'Khách vãng lai',
        phone: guestForm.phone.trim() || null,
        email: guestForm.email.trim() || null,
        notes: guestForm.notes.trim() || 'Khách vãng lai vào phòng sinh hoạt',
      });

      if (createErr || !insertedMembers?.[0]) {
        setSubmittingGuest(false);
        return alert('Lỗi tạo thông tin khách: ' + (createErr?.message || 'Không tạo được bản ghi thành viên'));
      }

      const newMember = insertedMembers[0];

      // 3. Calculate late status
      const { isLate, lateMinutes, status: checkinStatus } = checkIsLate(activeSession, new Date());

      // 4. Record attendance for active session
      const { data: recData, error: recErr } = await recordAttendance({
        memberId: newMember.id,
        sessionId: activeSession.id,
        checkinStatus,
        lateMinutes,
        notes: 'Khách vãng lai điểm danh',
      });

      if (recErr) {
        setSubmittingGuest(false);
        return alert('Lỗi ghi nhận điểm danh vào CSDL: ' + recErr.message);
      }

      playBeep(isLate ? 'late' : 'success');

      // 5. Reset form & close modal
      setSubmittingGuest(false);
      setShowGuestModal(false);
      setGuestForm({ full_name: '', class_name: 'Khách vãng lai', phone: '', email: '', notes: 'Khách tham quan phòng sinh hoạt' });

      // 6. Show welcome overlay
      setOverlay({
        type: 'success',
        member: newMember,
        isLate,
        lateMinutes,
        startTime: activeSession?.start_time || '08:00',
        recordId: recData?.[0]?.id,
      });

      await loadAttendance();
    } catch (err) {
      setSubmittingGuest(false);
      alert('Lỗi hệ thống: ' + err.message);
    }
  };

  // ── Mount / unmount scanner ───────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !activeSession) {
      stopQRScanner();
      cooldownRef.current = false;
      return;
    }

    const t = setTimeout(() => startQRScanner(), 500);
    return () => {
      clearTimeout(t);
      stopQRScanner();
    };
  }, [isActive, activeSession, startQRScanner, stopQRScanner]);

  // ── Create & Edit session submit ─────────────────────────────────────
  const handleSaveSessionModal = async (payload, existingSession) => {
    if (existingSession) {
      return await updateSession(existingSession.id, payload);
    } else {
      return await createSession(payload);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const openOrScheduledSessions = sessions.filter(s => s.status === 'open' || s.status === 'scheduled');
  const scheduledSessions = sessions.filter(s => s.status === 'scheduled');

  // ── UI ────────────────────────────────────────────────────────────────
  if (!activeSession) {
    return (
      <div style={{ textAlign: 'center', padding: '36px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, opacity: 0.8 }}>
          <IconCalendar size={56} color="var(--accent-primary)" />
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Chưa chọn buổi sinh hoạt để điểm danh
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 520, margin: '0 auto 28px' }}>
          Chọn một buổi sinh hoạt đã lên lịch trước bên dưới để kích hoạt, hoặc tạo mới một buổi sinh hoạt mới.
        </p>

        {/* Scheduled Sessions List */}
        {scheduledSessions.length > 0 && (
          <div style={{ maxWidth: 640, margin: '0 auto 32px', textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconCalendar size={15} color="#f59e0b" /> Buổi Sinh Hoạt Đã Lên Lịch Trước ({scheduledSessions.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {scheduledSessions.map(s => {
                const deadline = getAbsenceDeadline(s);
                const isPassed = isAbsenceDeadlinePassed(s);
                const deadlineStr = deadline ? deadline.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
                return (
                  <div key={s.id} style={{
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 14, flexWrap: 'wrap',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{s.title}</span>
                        {s.is_mandatory === false ? (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconStar size={11} color="#f59e0b" /> Tự nguyện (+1 CC)
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.15)', color: '#a78bfa', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconPin size={11} color="#a78bfa" /> Bắt buộc
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconCalendar size={13} color="var(--accent-primary)" /> {new Date(s.session_date).toLocaleDateString('vi-VN')}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconClock size={13} color="var(--text-primary)" /> Giờ: <strong>{s.start_time || '08:00'}</strong> (Trễ +{s.grace_period_minutes ?? 15}m)
                        </span>
                        {s.location && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconMapPin size={13} /> {s.location}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: isPassed ? '#ef4444' : '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconClock size={11} color={isPassed ? '#ef4444' : '#10b981'} />
                        <span>Hạn báo vắng: <strong>{s.absence_cutoff_hours ?? 2}h trước</strong></span>
                        <span style={{ color: isPassed ? '#ef4444' : 'var(--text-muted)' }}>
                          ({isPassed ? `Đã ngưng nhận lúc ${deadlineStr}` : `Đến ${deadlineStr}`})
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSessionModalTarget(s)}
                        title="Cài đặt giờ sinh hoạt, hạn báo vắng, tính chất buổi..."
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderColor: 'rgba(79,156,249,0.4)', color: '#60a5fa' }}
                      >
                        <IconSettings size={14} /> Cài đặt
                      </button>
                      <button
                        id={`btn-open-scheduled-${s.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => openSession(s.id)}
                        style={{ backgroundColor: '#d97706', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <IconCheckCircle size={14} /> Kích Hoạt
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={async () => {
                          if (window.confirm(`Xóa buổi sinh hoạt "${s.title}"?`)) {
                            await deleteSession(s.id);
                          }
                        }}
                        title="Xóa buổi này"
                        style={{ padding: '6px 8px' }}
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          id="btn-open-create-session"
          className="btn btn-primary"
          style={{ fontSize: 15, padding: '12px 28px', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          onClick={() => setSessionModalTarget('new')}
        >
          <IconPlus size={16} /> Tạo Mới / Lên Lịch Trước Buổi Sinh Hoạt
        </button>

        {/* Session Create / Edit Modal */}
        <ClubSessionModal
          isOpen={sessionModalTarget !== null}
          onClose={() => setSessionModalTarget(null)}
          session={sessionModalTarget === 'new' ? null : sessionModalTarget}
          onSave={handleSaveSessionModal}
        />
      </div>
    );
  }

  const onTimeList = attendanceList.filter(r => r.checkin_status !== 'late');
  const lateList = attendanceList.filter(r => r.checkin_status === 'late');

  return (
    <div>
      {/* Session Header Selector Bar */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 18px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>CHỌN BUỔI:</span>
          <select
            id="active-session-selector"
            className="form-select"
            value={activeSession.id}
            onChange={e => openSession(e.target.value)}
            style={{ maxWidth: 320, padding: '6px 12px', fontSize: 13 }}
          >
            {openOrScheduledSessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.status === 'open' ? '[Đang mở] ' : '[Lên lịch] '} {s.title} ({new Date(s.session_date).toLocaleDateString('vi-VN')} - {s.start_time})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSessionModalTarget(activeSession)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'rgba(79,156,249,0.4)', color: '#60a5fa' }}
            title="Cài đặt & chỉnh sửa thông tin buổi sinh hoạt đang mở này (Giờ bắt đầu, Hạn báo vắng, Địa điểm...)"
          >
            <IconSettings size={14} /> Cài Đặt Buổi Này
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSessionModalTarget('new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconPlus size={14} /> Tạo Buổi Mới
          </button>
        </div>
      </div>

      {/* Session Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(79,156,249,0.08))',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px rgba(16,185,129,0.8)',
            animation: 'pulse 2s ease infinite',
          }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              {activeSession.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconCalendar size={13} /> Ngày: <strong>{new Date(activeSession.session_date).toLocaleDateString('vi-VN')}</strong></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconClock size={13} /> Giờ: <strong style={{ color: 'var(--text-primary)' }}>{activeSession.start_time || '08:00'}</strong></span>
              {activeSession.grace_period_minutes > 0 && (
                <span>(cho phép trễ {activeSession.grace_period_minutes}m)</span>
              )}
              {activeSession.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconMapPin size={13} /> {activeSession.location}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(16,185,129,0.15)', color: '#34d399',
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <IconDot size={7} color="#34d399" /> Đúng giờ: {onTimeList.length}
          </div>
          <div style={{
            background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <IconAlertTriangle size={12} color="#f59e0b" /> Đến trễ: {lateList.length}
          </div>
          <div style={{
            background: 'rgba(79,156,249,0.2)', color: 'var(--accent-primary)',
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          }}>
            Tổng: {attendanceList.length}
          </div>
        </div>
      </div>

      {/* Split Scanner Layout */}
      <div className="club-split-layout">
        {/* Left: Scanner Panel */}
        <div className="club-scanner-panel">
          {/* QR Scanner */}
          <div
            id="club-qr-reader"
            style={{
              width: '100%',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: '#000',
              minHeight: 280,
              border: '2px solid var(--border-color)',
            }}
          />

          {/* Manual Code Input Option */}
          <form onSubmit={handleManualSubmit} style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              placeholder="Hoặc nhập mã thành viên (VD: CLB-001)"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              style={{ fontSize: 13, padding: '8px 12px' }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!manualCode.trim()}>
              Điểm Danh
            </button>
          </form>

          {/* Quick Guest / Visitor Check-in Button */}
          <button
            id="btn-open-guest-checkin"
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowGuestModal(true)}
            style={{
              marginTop: 10, width: '100%',
              border: '1px dashed var(--accent-primary)',
              color: 'var(--accent-primary)',
              background: 'rgba(79,156,249,0.06)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <IconUser size={15} /> Ghi Nhận Khách Vãng Lai / Khách Mới Vào Phòng
          </button>

          {processingCode && (
            <div style={{
              marginTop: 12, padding: '10px 16px',
              background: 'rgba(79,156,249,0.12)',
              border: '1px solid rgba(79,156,249,0.3)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13, color: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="loading-spinner" />
              Đang xử lý: <strong>{processingCode}</strong>
            </div>
          )}

          {!scanning && activeSession && (
            <div style={{ marginTop: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Đang kết nối camera…
            </div>
          )}
        </div>
      </div>

      {/* Attendance List (realtime) */}
      <div style={{ marginTop: 32 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, flexWrap: 'wrap', gap: 8,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Danh Sách Điểm Danh Hôm Nay ({attendanceList.length})
          </h3>
          <span className="realtime-dot" style={{ fontSize: 12 }}>LIVE</span>
        </div>

        {loadingList ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <span className="loading-spinner" />
          </div>
        ) : attendanceList.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 24px' }}>
            <div className="empty-state-icon"><IconFileText size={40} color="var(--text-muted)" /></div>
            <div className="empty-state-title">Chưa có ai điểm danh</div>
            <div className="empty-state-desc">Đưa mã QR vào camera hoặc nhập mã để bắt đầu điểm danh</div>
          </div>
        ) : (
          <div className="attendance-photo-grid">
            {attendanceList.map((rec, i) => {
              const member = rec.club_members;
              const isLateRec = rec.checkin_status === 'late';

              return (
                <div key={rec.id} className="attendance-photo-card" style={{
                  border: isLateRec ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border-color)',
                }}>
                  {/* Avatar Initials */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '100%', aspectRatio: '1/1',
                      background: isLateRec ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 32, color: '#fff', fontWeight: 800,
                      boxShadow: isLateRec ? '0 4px 12px rgba(245,158,11,0.2)' : '0 4px 12px rgba(16,185,129,0.2)',
                    }}>
                      {(member?.full_name || '?').split(' ').pop().charAt(0)}
                    </div>
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      background: isLateRec ? '#f59e0b' : '#10b981',
                      color: '#fff', borderRadius: '50%',
                      width: 22, height: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {i + 1}
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '8px 6px 6px' }}>
                    <div style={{
                      fontWeight: 700, fontSize: 12,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {member?.full_name || '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {member?.member_code} {member?.class_name ? `• ${member.class_name}` : ''}
                    </div>
                    
                    {/* Check-in status badge */}
                    {isLateRec ? (
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: '#f59e0b',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: 4,
                        }}>
                          <IconAlertTriangle size={10} color="#f59e0b" /> Trễ {rec.late_minutes}m ({formatTime(rec.checked_in_at)})
                        </div>
                        <button
                          type="button"
                          style={{
                            background: 'rgba(16,185,129,0.15)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            color: '#10b981',
                            borderRadius: 4,
                            padding: '3px 6px',
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                            transition: 'all 0.15s ease',
                          }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await markOnTime({ recordId: rec.id });
                            await loadAttendance();
                          }}
                          title="Đổi thành đến đúng giờ"
                        >
                          <IconDot size={6} color="#10b981" /> Đổi đúng giờ
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        fontSize: 10, fontWeight: 600, color: '#10b981',
                        marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <IconDot size={6} color="#10b981" /> {formatTime(rec.checked_in_at)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overlays */}
      {overlay?.type === 'success' && (
        <WelcomeOverlay
          member={overlay.member}
          isLate={overlay.isLate}
          lateMinutes={overlay.lateMinutes}
          startTime={overlay.startTime}
          recordId={overlay.recordId}
          onMarkOnTime={handleMarkOnTimeInOverlay}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.type === 'duplicate' && (
        <DuplicateAlert member={overlay.member} onClose={() => setOverlay(null)} />
      )}
      {overlay?.type === 'not_found' && (
        <NotFoundAlert code={overlay.code} onClose={() => setOverlay(null)} />
      )}
      {overlay?.type === 'no_session' && (
        <NoSessionAlert onClose={() => setOverlay(null)} />
      )}
      {overlay?.type === 'db_error' && (
        <DbErrorAlert message={overlay.message} onClose={() => setOverlay(null)} />
      )}

      {/* Guest / Visitor Check-in Modal */}
      <GuestCheckinModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onSubmit={handleCheckinGuest}
        form={guestForm}
        setForm={setGuestForm}
        loading={submittingGuest}
      />

      {/* Session Create / Edit Modal */}
      <ClubSessionModal
        isOpen={sessionModalTarget !== null}
        onClose={() => setSessionModalTarget(null)}
        session={sessionModalTarget === 'new' ? null : sessionModalTarget}
        onSave={handleSaveSessionModal}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
