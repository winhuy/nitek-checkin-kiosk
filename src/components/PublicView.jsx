import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabaseClient';
import { useEvents, isEventArchived, getEventStatusInfo, parseFlexibleDate } from '../contexts/EventContext';
import { useClub, calculateMemberDiligenceScore, isTeacherMember, getAbsenceDeadline, isAbsenceDeadlinePassed } from '../contexts/ClubContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { copyToClipboard } from '../lib/clipboard';
import { safeViewTransition, attachSpotlight } from '../lib/transitions';
import EventStoryModal from './EventStoryModal';
import DefaultViewSettingsModal from './DefaultViewSettingsModal';
import LiveWelcomeOverlay from './LiveWelcomeOverlay';
import EventCountdownClock from './common/EventCountdownClock';
import {
  IconSearch,
  IconTicket,
  IconBuilding,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconStar,
  IconPin,
  IconUsers,
  IconSchool,
  IconQrCode,
  IconDownload,
  IconCrown,
  IconCopy,
  IconCheckCircle,
  IconMail,
  IconAlertTriangle,
  IconLock,
  IconX,
  IconCamera,
  IconCheck,
  IconSparkles,
  IconTrash,
  IconDot,
  IconUser,
  IconFileText,
  IconMessageSquare,
  IconChevronDown,
  IconChevronUp,
  IconSettings,
} from './common/CustomIcons';

function formatTime(ts) {
  if (!ts) return '';
  const d = parseFlexibleDate(ts);
  if (!d) return String(ts);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── QR Popup for Public Member View ──────────────────────────────────────
function PublicMemberQRPopup({ member, onClose }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      return attachSpotlight(cardRef.current);
    }
  }, [member]);

  if (!member) return null;

  const downloadQR = () => {
    const svg = document.getElementById(`qr-public-popup-${member.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 370;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 320, 370);
      ctx.drawImage(img, 35, 20, 250, 250);
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 16px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(member.full_name, 160, 298);
      ctx.font = '13px Inter,sans-serif';
      ctx.fillStyle = '#4f9cf9';
      ctx.fillText(member.class_name ? `Lớp / Đơn vị: ${member.class_name}` : 'Thành viên CLB', 160, 322);
      ctx.font = '11px Inter,sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText('Mã QR Điểm Danh Cá Nhân', 160, 344);
      const a = document.createElement('a');
      a.download = `QR_DiemDanh_${member.full_name}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="spotlight-card liquid-glass"
        onClick={e => e.stopPropagation()}
        style={{
          borderRadius: 'var(--radius-xl)', padding: 32, textAlign: 'center',
          maxWidth: 360, width: '100%',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Mã QR Điểm Danh Cá Nhân
        </div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
          <QRCodeSVG
            id={`qr-public-popup-${member.id}`}
            value={member.member_code}
            size={200}
            level="H"
            includeMargin
          />
        </div>

        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
          {member.full_name}
        </div>
        
        {member.class_name && (
          <div style={{ marginBottom: 20 }}>
            <span style={{
              background: 'rgba(79,156,249,0.15)', color: 'var(--accent-primary)',
              padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              border: '1px solid rgba(79,156,249,0.3)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <IconSchool size={13} /> Lớp / Đơn vị: {member.class_name}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            id="btn-download-public-qr"
            className="btn btn-primary"
            onClick={downloadQR}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconDownload size={15} /> Tải Mã QR Về Máy
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── Absence Request Modal for Public View ────────────────────────────────
function AbsenceRequestModal({ isOpen, onClose, members, sessions, onSubmit }) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!isOpen) return null;

  // Filter ONLY sessions that are open, scheduled, or upcoming (not closed / not past)
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activeOrUpcomingSessions = (sessions || []).filter(s => {
    if (s.status === 'closed') return false;
    if (s.session_date) {
      const d = new Date(s.session_date);
      d.setHours(23, 59, 59, 999);
      if (d < now) return false;
    }
    return true;
  });

  const selectedSession = activeOrUpcomingSessions.find(s => s.id === selectedSessionId);
  const selectedDeadline = selectedSession ? getAbsenceDeadline(selectedSession) : null;
  const isSelectedExpired = selectedSession ? isAbsenceDeadlinePassed(selectedSession) : false;
  const deadlineStr = selectedDeadline
    ? selectedDeadline.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setMsg({ type: 'error', text: 'Vui lòng chọn thành viên xin vắng' });
      return;
    }
    if (!selectedSessionId) {
      setMsg({ type: 'error', text: 'Vui lòng chọn buổi sinh hoạt cần xin vắng' });
      return;
    }
    if (isSelectedExpired) {
      setMsg({
        type: 'error',
        text: `Buổi sinh hoạt này đã ngưng nhận đơn báo vắng (Hạn chót: ${deadlineStr}). Vui lòng liên hệ Admin.`
      });
      return;
    }

    setLoading(true);
    setMsg(null);
    const { error } = await onSubmit({
      memberId: selectedMemberId,
      sessionId: selectedSessionId,
      reason,
    });
    setLoading(false);

    if (error) {
      setMsg({ type: 'error', text: 'Lỗi gửi đơn: ' + error.message });
    } else {
      setMsg({ type: 'success', text: 'Đã gửi đơn báo vắng thành công! Đơn của bạn đang chờ Admin duyệt.' });
      setTimeout(() => {
        onClose();
        setMsg(null);
        setSelectedMemberId('');
        setSelectedSessionId('');
        setReason('');
      }, 2000);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-backdrop modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          maxWidth: 480,
          width: '100%',
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          borderRadius: 'var(--radius-lg, 16px)',
          padding: 24,
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconMail size={20} color="var(--accent-primary)" />
            Gửi Đơn Báo Vắng Sinh Hoạt
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '6px 10px' }}><IconX size={16} /></button>
        </div>

        {msg && (
          <div className={`alert ${msg.type === 'error' ? 'alert-warning' : 'alert-info'}`} style={{ marginBottom: 16, fontSize: 13 }}>
            {msg.text}
          </div>
        )}

        {activeOrUpcomingSessions.length === 0 && (
          <div className="alert alert-warning" style={{ marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconAlertTriangle size={16} color="#f59e0b" />
            Hiện tại chưa có buổi sinh hoạt nào đang hoặc sắp diễn ra để báo vắng (Các buổi cũ đã kết thúc không thể báo vắng).
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Chọn thành viên xin vắng *</label>
            <select
              className="form-select"
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              required
            >
              <option value="">-- Chọn thành viên (Tên / Mã TV) --</option>
              {members.filter(m => !isTeacherMember(m)).map(m => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.member_code}) {m.class_name ? `- Lớp ${m.class_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Chọn buổi sinh hoạt vắng *</label>
            <select
              className="form-select"
              value={selectedSessionId}
              onChange={e => setSelectedSessionId(e.target.value)}
              required
              disabled={activeOrUpcomingSessions.length === 0}
            >
              {activeOrUpcomingSessions.length === 0 ? (
                <option value="">-- Không có buổi sinh hoạt đang/sắp diễn ra --</option>
              ) : (
                <>
                  <option value="">-- Chọn buổi sinh hoạt (Đang / Sắp diễn ra) --</option>
                  {activeOrUpcomingSessions.map(s => {
                    const sDeadline = getAbsenceDeadline(s);
                    const sExpired = isAbsenceDeadlinePassed(s);
                    const dText = sDeadline
                      ? sDeadline.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
                      : '';
                    const dateStr = s.session_date ? new Date(s.session_date).toLocaleDateString('vi-VN') : 'Sắp tới';
                    const timeStr = s.start_time || '08:00';
                    return (
                      <option key={s.id} value={s.id}>
                        {s.title} ({dateStr} lúc {timeStr}) {s.is_mandatory === false ? '[Tự nguyện]' : '[Bắt buộc]'} {sExpired ? `[HẠN BÁO VẮNG ĐÃ QUA - ${dText}]` : `(Hạn: ${dText})`}
                      </option>
                    );
                  })}
                </>
              )}
            </select>
          </div>

          {selectedSession && (
            <div className={`alert ${isSelectedExpired ? 'alert-warning' : 'alert-info'}`} style={{ fontSize: 12, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                {isSelectedExpired ? <IconLock size={15} color="#ef4444" /> : <IconClock size={15} color="var(--accent-primary)" />}
                {isSelectedExpired ? 'Đã Quá Thời Hạn Gửi Đơn Báo Vắng' : 'Thời Hạn Nộp Đơn Báo Vắng'}
              </div>
              <div style={{ lineHeight: 1.5 }}>
                <div>• Giờ sinh hoạt: <strong>{selectedSession.start_time || '08:00'}</strong> ({selectedSession.session_date ? new Date(selectedSession.session_date).toLocaleDateString('vi-VN') : '—'})</div>
                <div>
                  • Hạn chót báo vắng: <strong style={{ color: isSelectedExpired ? '#ef4444' : 'var(--accent-primary)' }}>{deadlineStr}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                    ({(selectedSession.absence_cutoff_hours ?? 2) === 0 ? 'Báo vắng đến khi buổi sinh hoạt bắt đầu' : `Trước giờ sinh hoạt ${selectedSession.absence_cutoff_hours ?? 2} tiếng`})
                  </span>
                </div>
                {isSelectedExpired && (
                  <div style={{ color: '#ef4444', marginTop: 3 }}>
                    Buổi sinh hoạt này đã ngưng nhận đơn xin báo vắng. Vui lòng liên hệ Admin để được hỗ trợ trực tiếp.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>Lý do xin vắng</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Nhập lý do chi tiết (VD: Bị ốm, Trùng lịch học/thi, Có việc gia đình...)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={isSelectedExpired}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              disabled={loading || activeOrUpcomingSessions.length === 0 || isSelectedExpired}
            >
              {loading ? <><span className="loading-spinner" /> Đang gửi…</> : isSelectedExpired ? <><IconLock size={15} /> Đã Quá Hạn Báo Vắng</> : <><IconMail size={15} /> Gửi Đơn Xin Vắng</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function PublicView({ isGuest = false, isClub = false }) {
  const { isGuest: authIsGuest, isAdmin, isReception } = useAuth();
  const effectiveIsGuest = isGuest || authIsGuest;
  const { selectedEventId, selectedEvent, events = [] } = useEvents();
  const { defaultLandingView } = useSettings();
  const { members: clubMembers = [], sessions: clubSessions = [], allAttendanceRecords = [], activeSession, submitAbsenceRequest, reviewAbsenceRequest, revokeAbsence } = useClub();

  const safeEvents = (Array.isArray(events) ? events : []).filter(e => !isEventArchived(e));
  const safeClubMembers = Array.isArray(clubMembers) ? clubMembers : [];
  const safeClubSessions = Array.isArray(clubSessions) ? clubSessions : [];

  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (isClub) return 'club';
    if (defaultLandingView === 'club') return 'club';
    if (defaultLandingView === 'event') {
      const nonArchived = (Array.isArray(events) ? events : []).filter(e => !isEventArchived(e));
      return nonArchived.length === 0 ? 'club' : 'event';
    }
    const nonArchived = (Array.isArray(events) ? events : []).filter(e => !isEventArchived(e));
    return nonArchived.length === 0 ? 'club' : 'event';
  });

  // Automatically adjust if default landing view changes or safeEvents changes
  useEffect(() => {
    if (defaultLandingView === 'club') {
      setActiveSubTab('club');
    } else if (defaultLandingView === 'event') {
      if (safeEvents.length > 0) {
        setActiveSubTab('event');
      } else {
        setActiveSubTab('club');
      }
    } else {
      // 'auto'
      if (safeEvents.length === 0) {
        setActiveSubTab('club');
      }
    }
  }, [defaultLandingView, safeEvents.length]);

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(true);
  const [eventSearch, setEventSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all'); // 'all' | 'checked_in' | 'pending'
  const [vipCategoryFilter, setVipCategoryFilter] = useState('regular'); // 'regular' | 'vip' | 'all'
  
  const [memberSearch, setMemberSearch] = useState('');
  const [qrMember, setQrMember] = useState(null);
  const [storyEvt, setStoryEvt] = useState(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [absenceFilterTab, setAbsenceFilterTab] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [isAbsenceSectionOpen, setIsAbsenceSectionOpen] = useState(false);
  const [welcomingGuests, setWelcomingGuests] = useState([]);
  const [isStageMode, setIsStageMode] = useState(false);
  const channelRef = useRef(null);

  // ── Find Next / Active Event ─────────────
  const nextEvent = selectedEvent || 
    safeEvents.find(e => getEventStatusInfo(e).isOngoing) || 
    safeEvents.find(e => getEventStatusInfo(e).isUpcoming) || 
    safeEvents.find(e => !getEventStatusInfo(e).isCompleted && !getEventStatusInfo(e).isArchived) || 
    safeEvents[0];

  // ── Find Next / Active Club Session ──────
  const nextSession = activeSession || safeClubSessions.find(s => s.status === 'open') || safeClubSessions.find(s => s.status === 'scheduled') || safeClubSessions[0];

  const getSessionDisplayStatus = (session) => {
    if (!session) {
      return {
        label: 'CHƯA CÓ BUỔI SINH HOẠT',
        subLabel: 'Chưa có buổi sinh hoạt',
        isOpen: false,
        isClosed: false,
        isScheduled: false,
        color: '#9ca3af',
        bg: 'rgba(156, 163, 175, 0.15)',
        border: 'rgba(156, 163, 175, 0.3)',
      };
    }
    const now = new Date();
    const sDate = session.session_date ? new Date(session.session_date) : null;
    const isFuture = sDate && !isNaN(sDate.getTime()) && sDate > now;

    if (session.status === 'open') {
      return {
        label: 'ĐANG MỞ ĐIỂM DANH',
        subLabel: 'Đang mở điểm danh trực tiếp',
        isOpen: true,
        isClosed: false,
        isScheduled: false,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)',
      };
    }

    if (isFuture) {
      return {
        label: 'BUỔI SINH HOẠT TIẾP THEO',
        subLabel: 'Chưa bắt đầu • Sắp diễn ra',
        isOpen: false,
        isClosed: false,
        isScheduled: true,
        color: '#60a5fa',
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.3)',
      };
    }

    if (session.status === 'closed') {
      return {
        label: 'ĐÃ KẾT THÚC',
        subLabel: 'Buổi đã kết thúc',
        isOpen: false,
        isClosed: true,
        isScheduled: false,
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.15)',
        border: 'rgba(148, 163, 184, 0.3)',
      };
    }

    return {
      label: 'BUỔI SINH HOẠT TIẾP THEO',
      subLabel: 'Chưa bắt đầu • Sắp diễn ra',
      isOpen: false,
      isClosed: false,
      isScheduled: true,
      color: '#60a5fa',
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.3)',
    };
  };

  // ── Fetch Event Attendees ───────────────
  const fetchAttendees = async () => {
    if (safeEvents.length === 0) {
      setAttendees([]);
      setLoadingAttendees(false);
      return;
    }

    let query = supabase
      .from('attendees')
      .select('*, checkin_logs(checked_in_at)')
      .order('created_at', { ascending: true });

    const targetEventId = nextEvent?.id || (selectedEventId !== 'all' ? selectedEventId : null);
    if (targetEventId) {
      query = query.eq('event_id', targetEventId);
    } else {
      const activeIds = safeEvents.map(e => e.id);
      if (activeIds.length === 0) {
        setAttendees([]);
        setLoadingAttendees(false);
        return;
      }
      query = query.in('event_id', activeIds);
    }

    const { data } = await query;
    if (data) setAttendees(data);
    setLoadingAttendees(false);
  };

  useEffect(() => {
    fetchAttendees();

    if (!supabase) return;

    channelRef.current = supabase
      .channel('public-view-realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendees' }, (payload) => {
        fetchAttendees();

        // Check if an attendee was checked in
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const isNowCheckedIn = payload.new?.status === 'checked_in';
          const wasNotCheckedIn = payload.eventType === 'INSERT' || payload.old?.status !== 'checked_in';

          if (isNowCheckedIn && wasNotCheckedIn && payload.new) {
            const matchingEvt = safeEvents.find(e => e.id === payload.new.event_id) || nextEvent;
            const guestItem = {
              id: payload.new.id,
              name: payload.new.full_name || 'Khách Mời',
              eventName: matchingEvt?.name || (nextEvent?.name || 'Sự Kiện'),
              company: payload.new.company || '',
              is_vip: !!payload.new.is_vip,
              ticket_code: payload.new.ticket_code || '',
              logoUrl: matchingEvt?.logo_url || '',
              wish: matchingEvt?.welcome_wish || '',
              wishVip: matchingEvt?.welcome_wish_vip || '',
              timestamp: Date.now(),
              expiresAt: Date.now() + 60000, // 60 seconds (1 minute)
            };

            setWelcomingGuests(prev => {
              const now = Date.now();
              const filtered = prev.filter(g => g.id !== guestItem.id && g.expiresAt > now);
              return [guestItem, ...filtered].slice(0, 4);
            });
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchAttendees)
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [nextEvent?.id, selectedEventId, safeEvents.length]);

  // Event stats
  const checkedInCount = attendees.filter(a => a.status === 'checked_in').length;
  const totalAttendees = attendees.length;
  const regularAttendeesCount = attendees.filter(a => !a.is_vip).length;
  const vipAttendeesCount = attendees.filter(a => a.is_vip).length;
  const pct = totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 100) : 0;

  // Filtered Attendees
  const filteredAttendees = attendees.filter(a => {
    if (vipCategoryFilter === 'regular' && a.is_vip) return false;
    if (vipCategoryFilter === 'vip' && !a.is_vip) return false;
    if (eventFilter === 'checked_in' && a.status !== 'checked_in') return false;
    if (eventFilter === 'pending' && a.status === 'checked_in') return false;
    const q = eventSearch.toLowerCase();
    return !q || a.full_name.toLowerCase().includes(q) || a.ticket_code.toLowerCase().includes(q) || (a.company || '').toLowerCase().includes(q);
  });

  // Filtered Club Members
  const filteredMembers = (clubMembers || []).filter(m => {
    const q = memberSearch.toLowerCase();
    return !q 
      || m.full_name.toLowerCase().includes(q) 
      || (m.class_name || '').toLowerCase().includes(q);
  });

  const evtStatus = getEventStatusInfo(nextEvent);

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* ── Sub Navigation Tabs (Only shown if there are active events) ── */}
      {safeEvents.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap'
        }}>
          <div className="section-tabs" style={{
            display: 'flex', gap: 8,
            padding: 4, borderRadius: 'var(--radius-lg)', maxWidth: 480, width: '100%',
          }}>
            <button
              id="btn-public-tab-event"
              className={`btn ${activeSubTab === 'event' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, borderRadius: 'var(--radius-md)', padding: '8px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => setActiveSubTab('event')}
            >
              <IconTicket size={15} /> <span className="desktop-only">Sự Kiện & Khách Mời</span><span className="mobile-only">Sự Kiện</span> ({totalAttendees})
              {defaultLandingView === 'event' && (
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: activeSubTab === 'event' ? 'rgba(255,255,255,0.25)' : 'var(--border-color)', marginLeft: 4, fontWeight: 700 }}>
                  Mặc định
                </span>
              )}
            </button>
            <button
              id="btn-public-tab-club"
              className={`btn ${activeSubTab === 'club' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, borderRadius: 'var(--radius-md)', padding: '8px 10px', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => setActiveSubTab('club')}
            >
              <IconUsers size={15} /> <span className="desktop-only">CLB & Sinh Hoạt</span><span className="mobile-only">CLB</span> ({safeClubMembers.length})
              {defaultLandingView === 'club' && (
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: activeSubTab === 'club' ? 'rgba(255,255,255,0.25)' : 'var(--border-color)', marginLeft: 4, fontWeight: 700 }}>
                  Mặc định
                </span>
              )}
            </button>
          </div>

          {(isAdmin || isReception) && (
            <button
              id="btn-open-default-view-settings"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSettingsModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                fontSize: 12,
                borderRadius: 'var(--radius-md)',
              }}
              title="Cài đặt giao diện mở mặc định khi vào web"
            >
              <IconSettings size={14} color="var(--accent-primary)" />
              <span>Cài đặt mặc định: <strong style={{ color: 'var(--text-primary)' }}>{defaultLandingView === 'event' ? 'Sự Kiện' : defaultLandingView === 'club' ? 'CLB & Sinh Hoạt' : 'Tự động'}</strong></span>
            </button>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: SỰ KIỆN & KHÁCH MỜI (Chỉ hiển thị khi có sự kiện hoạt động)*/}
      {/* ════════════════════════════════════════════════════════════════ */}
      {safeEvents.length > 0 && activeSubTab === 'event' && (
        <div>
          {/* Card Buổi/Event tiếp theo */}
          <div className="hero-session-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: 11,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: evtStatus.bg,
                      color: evtStatus.color,
                      border: `1px solid ${evtStatus.border}`,
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: evtStatus.color,
                        display: 'inline-block',
                        ...(evtStatus.isOngoing ? { animation: 'pulse 1.5s infinite', boxShadow: `0 0 8px ${evtStatus.color}` } : {})
                      }}
                    />
                    {evtStatus.badgeLabel}
                  </span>
                  {evtStatus.isOngoing && <span className="realtime-dot" style={{ fontSize: 11 }}>LIVE REALTIME</span>}
                  {evtStatus.isCompleted && (
                    <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.25)', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                      Sự kiện đã kết thúc
                    </span>
                  )}
                  {evtStatus.isUpcoming && (
                    <span style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                      Chưa bắt đầu • Sắp diễn ra
                    </span>
                  )}
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  {nextEvent ? nextEvent.name : 'Chưa có sự kiện nào'}
                </h2>

                {nextEvent && (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                    {nextEvent.event_date && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconCalendar size={14} color="var(--accent-primary)" /> <strong>Thời gian:</strong> {formatTime(nextEvent.event_date)}
                      </span>
                    )}
                    {nextEvent.location && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconMapPin size={14} color="var(--accent-primary)" /> <strong>Địa điểm:</strong> {nextEvent.location}
                      </span>
                    )}
                    {nextEvent.event_date && (
                      <EventCountdownClock targetDate={nextEvent.event_date} />
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar info */}
              <div style={{ textAlign: 'right', minWidth: 200 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Tiến độ Check-in</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-success)' }}>
                  {checkedInCount} <span style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 400 }}>/ {totalAttendees} đã đến ({pct}%)</span>
                </div>
                <div className="progress-bar-track" style={{ marginTop: 8, height: 8 }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                {nextEvent && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      id="btn-public-story-image"
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 20,
                        boxShadow: '0 4px 12px rgba(236,72,153,0.3)',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                      onClick={() => setStoryEvt(nextEvent)}
                      title="Xuất ảnh Story 9:16 tổng kết sự kiện để đăng Facebook/Instagram/TikTok"
                    >
                      <IconCamera size={13} /> Xuất Ảnh Story 9:16
                    </button>

                    <button
                      id="btn-public-live-stage"
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 20,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                      onClick={() => setIsStageMode(true)}
                      title="Mở màn hình chào mừng toàn màn hình để chiếu lên TV/Máy chiếu/Màn hình LED"
                    >
                      <IconSparkles size={13} /> Màn Chiếu Chào Mừng
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sub-tabs for Khách thường vs Khách VIP */}
          <div className="section-tabs" style={{ marginBottom: 16 }}>
            <button
              id="public-cat-regular"
              type="button"
              className={`section-tab ${vipCategoryFilter === 'regular' ? 'active' : ''}`}
              onClick={() => setVipCategoryFilter('regular')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IconUsers size={14} /> Khách thường ({regularAttendeesCount})
            </button>
            <button
              id="public-cat-vip"
              type="button"
              className={`section-tab ${vipCategoryFilter === 'vip' ? 'active' : ''}`}
              onClick={() => setVipCategoryFilter('vip')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderColor: vipCategoryFilter === 'vip' ? '#f59e0b' : 'transparent',
                color: vipCategoryFilter === 'vip' ? '#fbbf24' : 'var(--text-secondary)',
              }}
            >
              <IconCrown size={14} color="#fbbf24" /> Khách VIP ({vipAttendeesCount})
            </button>
            <button
              id="public-cat-all"
              type="button"
              className={`section-tab ${vipCategoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setVipCategoryFilter('all')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IconTicket size={14} /> Tất cả ({totalAttendees})
            </button>
          </div>

          {/* Search + Filter toolbar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <input
                id="search-public-guests"
                className="form-input"
                placeholder={isGuest ? "Tìm theo tên khách mời, đơn vị..." : "Tìm theo tên khách mời, mã vé, đơn vị..."}
                value={eventSearch}
                onChange={e => setEventSearch(e.target.value)}
              />
            </div>
            <select
              id="filter-public-guest-status"
              className="form-select"
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">Tất cả trạng thái ({totalAttendees})</option>
              <option value="checked_in">Đã Check-in ({checkedInCount})</option>
              <option value="pending">Chờ Check-in ({totalAttendees - checkedInCount})</option>
            </select>
          </div>

          {/* Guest list */}
          {loadingAttendees ? (
            <div style={{ textAlign: 'center', padding: 48 }}><span className="loading-spinner" /></div>
          ) : filteredAttendees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ opacity: 0.5 }}><IconTicket size={40} color="var(--accent-primary)" /></div>
              <div className="empty-state-title">Chưa có dữ liệu khách mời</div>
              <div className="empty-state-desc">Thử chọn danh mục Khách Thường / Khách VIP khác</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Khách mời</th>
                    <th>Đơn vị / Công ty</th>
                    <th>Trạng thái Check-in</th>
                    <th>Thời gian check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.map((a, i) => {
                    const isCheckedIn = a.status === 'checked_in';
                    const checkinTime = a.checkin_logs?.[0]?.checked_in_at;

                    return (
                      <tr key={a.id} className={a.is_vip ? 'row-vip' : ''}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: a.is_vip ? 700 : 600, fontSize: 14, color: a.is_vip ? 'var(--vip-text)' : 'var(--text-primary)' }}>
                              {a.full_name}
                            </span>
                            {a.is_vip && (
                              <span className="badge badge-vip" style={{ fontSize: 10, padding: '2px 8px' }}>
                                <IconCrown size={12} color="currentColor" /> VIP
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {a.company ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <IconBuilding size={14} color="var(--text-muted)" /> {a.company}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {isCheckedIn ? (
                            <span className="badge badge-checked-in"><span className="badge-dot" />Đã Check-in</span>
                          ) : (
                            <span className="badge badge-pending"><span className="badge-dot" />Chờ Check-in</span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {isCheckedIn && checkinTime ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IconClock size={12} /> {formatTime(checkinTime)}
                              </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: THÀNH VIÊN CLB & BUỔI SINH HOẠT TẾP THEO                 */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {(activeSubTab === 'club' || safeEvents.length === 0) && (
        <div>
          {/* Card Buổi Sinh Hoạt CLB Tiếp Theo */}
          <div className="hero-session-card">
            {(() => {
              const sessionStatus = getSessionDisplayStatus(nextSession);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: 11,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: sessionStatus.bg,
                      color: sessionStatus.color,
                      border: `1px solid ${sessionStatus.border}`,
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        backgroundColor: sessionStatus.color,
                        display: 'inline-block',
                        ...(sessionStatus.isOpen ? { animation: 'pulse 1.5s infinite', boxShadow: `0 0 8px ${sessionStatus.color}` } : {})
                      }}
                    />
                    {sessionStatus.label}
                  </span>
                  {sessionStatus.isOpen && <span className="realtime-dot" style={{ fontSize: 11 }}>LIVE REALTIME</span>}
                  {sessionStatus.isClosed && (
                    <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.25)', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                      Buổi đã kết thúc
                    </span>
                  )}
                  {sessionStatus.isScheduled && (
                    <span style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                      Chưa bắt đầu • Sắp diễn ra
                    </span>
                  )}
                  {nextSession && (
                    nextSession.is_mandatory === false ? (
                      <span style={{
                        background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.3)',
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <IconStar size={12} color="#f59e0b" /> Buổi Tự Nguyện (Không tính vắng)
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                        border: '1px solid rgba(59,130,246,0.3)',
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <IconPin size={12} color="#60a5fa" /> Buổi Bắt Buộc
                      </span>
                    )
                  )}
                </div>
              );
            })()}

            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              {nextSession ? nextSession.title : 'Chưa có lịch sinh hoạt được lên trước'}
            </h2>

            {nextSession && (
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                {nextSession.session_date && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <IconCalendar size={14} color="var(--accent-primary)" /> <strong>Ngày sinh hoạt:</strong> {new Date(nextSession.session_date).toLocaleDateString('vi-VN')}
                  </span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <IconClock size={14} color="var(--accent-primary)" /> <strong>Giờ sinh hoạt quy định:</strong> <strong style={{ color: 'var(--accent-primary)' }}>{nextSession.start_time || '08:00'}</strong> (Thời gian trễ cho phép: {nextSession.grace_period_minutes ?? 15} phút)
                </span>
                {nextSession.location && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <IconMapPin size={14} color="var(--accent-primary)" /> <strong>Địa điểm:</strong> {nextSession.location}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Absence Requests Status List Section (Collapsible Accordion for Next Session Only) */}
          {(() => {
            const targetSession = nextSession;
            const allAbsenceRequests = [];

            if (targetSession) {
              const records = targetSession.club_attendance_records || [];
              records.forEach(r => {
                const isPending = r.checkin_status === 'pending_excuse';
                const isAbsenceNote = (r.notes || '').includes('[ĐƠN XIN BÁO VẮNG]');

                if (isPending || isAbsenceNote) {
                  const member = safeClubMembers.find(m => m.id === r.member_id) || r.club_members;
                  const cleanReason = (r.notes || '')
                    .replace(/\[ĐƠN XIN BÁO VẮNG\]:?\s*/gi, '')
                    .trim() || 'Gửi đơn xin vắng sinh hoạt';

                  let statusKey = 'pending';
                  if (r.checkin_status === 'excused') statusKey = 'approved';
                  else if (r.checkin_status === 'unexcused') statusKey = 'rejected';

                  allAbsenceRequests.push({
                    id: r.id,
                    member,
                    session: targetSession,
                    statusKey,
                    rawStatus: r.checkin_status,
                    reason: cleanReason,
                    rawNotes: r.notes,
                    createdAt: r.created_at || r.checked_in_at,
                  });
                }
              });
            }

            const pendingCount = allAbsenceRequests.filter(r => r.statusKey === 'pending').length;
            const approvedCount = allAbsenceRequests.filter(r => r.statusKey === 'approved').length;
            const rejectedCount = allAbsenceRequests.filter(r => r.statusKey === 'rejected').length;

            const filteredAbsenceRequests = allAbsenceRequests.filter(r => {
              if (absenceFilterTab === 'pending') return r.statusKey === 'pending';
              if (absenceFilterTab === 'approved') return r.statusKey === 'approved';
              if (absenceFilterTab === 'rejected') return r.statusKey === 'rejected';
              return true;
            });

            return (
              <div className="hero-session-card" style={{
                padding: '14px 20px',
                marginBottom: 24,
              }}>
                {/* Clickable Header Bar */}
                <div
                  onClick={() => setIsAbsenceSectionOpen(!isAbsenceSectionOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconFileText size={16} /> Trạng Thái Các Đơn Xin Báo Vắng Sinh Hoạt ({allAbsenceRequests.length})
                    </h3>

                    {targetSession && (
                      targetSession.status === 'closed' || targetSession.status === 'completed' ? (
                        <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(148,163,184,0.15)', border: '1px solid rgba(148,163,184,0.3)', padding: '2px 8px', borderRadius: 8, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconDot size={8} color="#94a3b8" /> Buổi đã kết thúc: {targetSession.title}
                        </span>
                      ) : targetSession.status === 'open' ? (
                        <span style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px', borderRadius: 8, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                          Buổi đang diễn ra: {targetSession.title}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--accent-primary)', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)', padding: '2px 8px', borderRadius: 8, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconPin size={12} /> Buổi tiếp theo: {targetSession.title}
                        </span>
                      )
                    )}

                    <div style={{ display: 'flex', gap: 8, fontSize: 12, marginLeft: 4, alignItems: 'center' }}>
                      {pendingCount > 0 && <span style={{ color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconDot size={8} color="#fbbf24" /> {pendingCount} chờ duyệt</span>}
                      {approvedCount > 0 && <span style={{ color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconDot size={8} color="#34d399" /> {approvedCount} đã duyệt</span>}
                      {rejectedCount > 0 && <span style={{ color: '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconDot size={8} color="#f87171" /> {rejectedCount} không chấp nhận</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, pointerEvents: 'none', fontSize: 12, padding: '4px 12px', fontWeight: 700 }}
                  >
                    {isAbsenceSectionOpen ? <>Thu gọn <IconChevronUp size={14} /></> : <>Xem chi tiết <IconChevronDown size={14} /></>}
                  </button>
                </div>

                {/* Collapsible Body */}
                {isAbsenceSectionOpen && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      <button
                        className={`btn btn-sm ${absenceFilterTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={(e) => { e.stopPropagation(); setAbsenceFilterTab('all'); }}
                      >
                        Tất cả ({allAbsenceRequests.length})
                      </button>
                      <button
                        className={`btn btn-sm ${absenceFilterTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={(e) => { e.stopPropagation(); setAbsenceFilterTab('pending'); }}
                        style={{
                          borderColor: absenceFilterTab === 'pending' ? '#f59e0b' : undefined,
                          color: absenceFilterTab === 'pending' ? '#fbbf24' : undefined,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <IconDot size={8} color="#fbbf24" /> Chờ duyệt ({pendingCount})
                      </button>
                      <button
                        className={`btn btn-sm ${absenceFilterTab === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={(e) => { e.stopPropagation(); setAbsenceFilterTab('approved'); }}
                        style={{
                          borderColor: absenceFilterTab === 'approved' ? '#10b981' : undefined,
                          color: absenceFilterTab === 'approved' ? '#34d399' : undefined,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <IconDot size={8} color="#10b981" /> Đã duyệt ({approvedCount})
                      </button>
                      <button
                        className={`btn btn-sm ${absenceFilterTab === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={(e) => { e.stopPropagation(); setAbsenceFilterTab('rejected'); }}
                        style={{
                          borderColor: absenceFilterTab === 'rejected' ? '#ef4444' : undefined,
                          color: absenceFilterTab === 'rejected' ? '#f87171' : undefined,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <IconDot size={8} color="#ef4444" /> Không chấp nhận ({rejectedCount})
                      </button>
                    </div>

                    {/* Requests List */}
                    {filteredAbsenceRequests.length === 0 ? (
                      <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        Chưa có đơn báo vắng nào cho buổi tiếp theo ở danh mục đã chọn
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filteredAbsenceRequests.map(req => (
                          <div key={req.id} style={{
                            background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)', padding: '12px 14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: 10,
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <IconUser size={13} color="var(--accent-primary)" /> {req.member?.full_name || 'Thành viên'} ({req.member?.member_code || '—'}) {req.member?.class_name ? `• Lớp ${req.member.class_name}` : ''}
                                
                                {req.statusKey === 'pending' && (
                                  <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <IconDot size={7} color="#fbbf24" /> Chờ duyệt
                                  </span>
                                )}
                                {req.statusKey === 'approved' && (
                                  <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <IconDot size={7} color="#34d399" /> Đã duyệt (Vắng có phép)
                                  </span>
                                )}
                                {req.statusKey === 'rejected' && (
                                  <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <IconDot size={7} color="#f87171" /> Không chấp nhận (Vắng không phép)
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <IconPin size={12} /> Buổi: <strong>{req.session?.title}</strong> ({req.session?.session_date ? new Date(req.session.session_date).toLocaleDateString('vi-VN') : '—'})
                              </div>
                              <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <IconMessageSquare size={12} /> Lý do: {req.reason}
                              </div>
                            </div>

                            {/* Action buttons (Admin only) */}
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              {!effectiveIsGuest && (
                                <>
                                  {req.statusKey === 'pending' && (
                                    <>
                                      <button
                                        className="btn btn-sm"
                                        style={{ background: '#10b981', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await reviewAbsenceRequest({ recordId: req.id, statusKey: 'excused' });
                                        }}
                                      >
                                        <IconCheck size={12} /> Duyệt
                                      </button>
                                      <button
                                        className="btn btn-sm"
                                        style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await reviewAbsenceRequest({ recordId: req.id, statusKey: 'unexcused' });
                                        }}
                                      >
                                        <IconX size={12} /> Từ Chối
                                      </button>
                                    </>
                                  )}

                                  <button
                                    className="btn btn-sm"
                                    style={{
                                      background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                                      border: '1px solid rgba(239,68,68,0.3)', padding: '5px 10px',
                                      fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                                      display: 'inline-flex', alignItems: 'center', gap: 4,
                                    }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Xác nhận GỠ PHÉP / XÓA đơn xin vắng của "${req.member?.full_name || 'thành viên'}"?`)) {
                                        await revokeAbsence({ recordId: req.id });
                                      }
                                    }}
                                    title="Admin gỡ phép / Hủy đơn báo vắng này"
                                  >
                                    <IconTrash size={12} /> Gỡ Phép
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Search Toolbar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              id="search-public-club-members"
              className="form-input"
              placeholder="Tìm thành viên theo tên, lớp..."
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              style={{ maxWidth: 340 }}
            />
            <button
              id="btn-public-absence-request"
              className="btn btn-sm"
              onClick={() => setShowAbsenceModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none', boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                color: '#fff', fontWeight: 700, padding: '8px 16px', borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <IconFileText size={15} /> Báo Vắng Sinh Hoạt
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Tổng số thành viên CLB: <strong>{safeClubMembers.length}</strong>
            </span>
          </div>

          {/* Club members list */}
          {filteredMembers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ opacity: 0.5 }}><IconUsers size={40} color="var(--accent-primary)" /></div>
              <div className="empty-state-title">Chưa có dữ liệu thành viên CLB</div>
              <div className="empty-state-desc">Danh sách thành viên sẽ hiển thị khi quản trị viên cập nhật</div>
            </div>
          ) : (
            <div className="public-member-list">
              {filteredMembers.map((m, i) => {
                const isTeacher = isTeacherMember(m);
                const score = isTeacher ? null : calculateMemberDiligenceScore(m, safeClubSessions, allAttendanceRecords);
                const scoreBg = score < 0 ? 'rgba(239,68,68,0.15)' : score < 5 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';
                const scoreColor = score < 0 ? '#ef4444' : score < 5 ? '#f59e0b' : '#10b981';
                const scoreBorder = score < 0 ? 'rgba(239,68,68,0.4)' : score < 5 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)';

                return (
                  <div key={m.id} className="public-member-row">
                    <div className="public-member-avatar">
                      {m.full_name.split(' ').pop().charAt(0)}
                    </div>
                    <div className="public-member-info">
                      <div className="public-member-name">{m.full_name}</div>
                      {m.class_name && (
                        <span className="public-member-class">
                          <IconSchool size={11} color="var(--accent-primary)" /> {m.class_name}
                        </span>
                      )}
                    </div>

                    {isTeacher ? (
                      <span style={{
                        background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                        border: '1px solid rgba(59,130,246,0.3)',
                        padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto', marginRight: 10,
                      }}>
                        <IconSchool size={14} /> Giáo Viên
                      </span>
                    ) : (
                      <span style={{
                        background: scoreBg, color: scoreColor,
                        border: `1px solid ${scoreBorder}`,
                        padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 800,
                        display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto', marginRight: 10,
                      }}>
                        <IconStar size={13} /> {score > 0 ? `+${score}` : score}đ
                      </span>
                    )}

                    <button
                      id={`btn-public-get-qr-${m.id}`}
                      className="btn btn-primary btn-sm public-member-qr-btn"
                      onClick={() => setQrMember(m)}
                      title="Bấm để lấy mã QR điểm danh cá nhân"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <IconQrCode size={14} /> Lấy Mã QR
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* QR Code Modal for Public View */}
      {qrMember && (
        <PublicMemberQRPopup member={qrMember} onClose={() => setQrMember(null)} />
      )}

      {/* Story 9:16 Marketing Modal */}
      <EventStoryModal
        isOpen={!!storyEvt}
        onClose={() => setStoryEvt(null)}
        event={storyEvt}
      />

      {/* Absence Request Modal */}
      <AbsenceRequestModal
        isOpen={showAbsenceModal}
        onClose={() => setShowAbsenceModal(false)}
        members={safeClubMembers}
        sessions={safeClubSessions}
        onSubmit={submitAbsenceRequest}
      />

      {/* Default View Settings Modal (Admin / Reception) */}
      <DefaultViewSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Live Check-in Welcome Announcement & Split-Screen Stage Display */}
      <LiveWelcomeOverlay
        welcomingGuests={welcomingGuests}
        onDismissGuest={(guestId) => setWelcomingGuests(prev => prev.filter(g => g.id !== guestId))}
        isStageMode={isStageMode}
        onCloseStageMode={() => setIsStageMode(false)}
        currentEvent={nextEvent}
        totalCheckedIn={checkedInCount}
        totalAttendees={totalAttendees}
        isAdmin={isAdmin}
        onOpenEventSettings={() => setShowEventModal(true)}
      />
    </div>
  );
}
