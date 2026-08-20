import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../lib/supabaseClient';
import { useEvents } from '../contexts/EventContext';
import { useClub } from '../contexts/ClubContext';
import {
  IconScanner,
  IconShield,
  IconCheckCircle,
  IconClock,
  IconSearch,
  IconKey,
  IconCrown,
  IconRefresh,
  IconStop,
  IconDot,
  IconBuilding,
  IconX,
} from './common/CustomIcons';

// ─── Web Audio API beep ───────────────────────────────────────────────
function playBeep(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';

    if (type === 'vip') {
      oscillator.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      oscillator.frequency.setValueAtTime(739.99, ctx.currentTime + 0.1); // F#5
      oscillator.frequency.setValueAtTime(880.00, ctx.currentTime + 0.2); // A5
      oscillator.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.3); // D6
    } else if (type === 'staff') {
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    } else {
      oscillator.frequency.setValueAtTime(1046.5, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.1);
    }

    gainNode.gain.setValueAtTime(0.35, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.45);
  } catch (_e) {
    console.warn('Audio not available');
  }
}

// ─── Check-in logic (Supports both ticket code AND CLB member QR code as Staff) ───
async function performCheckin(rawCode, scannedBy = 'scanner', selectedEventId = null) {
  const code = rawCode.trim().toUpperCase();

  // 1. Search in attendees table by ticket_code
  let query = supabase
    .from('attendees')
    .select('id, full_name, ticket_code, email, phone, company, status, is_vip, notes, event_id')
    .eq('ticket_code', code);
  if (selectedEventId && selectedEventId !== 'all') {
    query = query.eq('event_id', selectedEventId);
  }
  const { data: attendees, error: findError } = await query.limit(1);

  if (findError) throw findError;

  if (attendees && attendees.length > 0) {
    const attendee = attendees[0];
    if (attendee.status === 'checked_in') return { type: 'duplicate', attendee };

    const { error: updateError } = await supabase
      .from('attendees')
      .update({ status: 'checked_in' })
      .eq('id', attendee.id);

    if (updateError) throw updateError;

    await supabase.from('checkin_logs').insert({
      attendee_id: attendee.id,
      scanned_by: scannedBy,
    });

    const isStaff = (attendee.company || '').includes('Staff') || (attendee.company || '').includes('Ban Tổ Chức');
    return { type: 'success', attendee, isStaff };
  }

  // 2. If not found in attendees, search in club_members table for Staff check-in
  const { data: clubMembers } = await supabase
    .from('club_members')
    .select('id, full_name, member_code, email, phone, class_name, status')
    .or(`member_code.eq.${code},member_code.eq.${rawCode.trim()}`)
    .limit(1);

  if (clubMembers && clubMembers.length > 0) {
    const member = clubMembers[0];

    // Check if this CLB member is already in attendees for this event
    let staffCheckQuery = supabase
      .from('attendees')
      .select('id, full_name, ticket_code, email, phone, company, status, is_vip, notes, event_id')
      .eq('ticket_code', member.member_code);
    if (selectedEventId && selectedEventId !== 'all') {
      staffCheckQuery = staffCheckQuery.eq('event_id', selectedEventId);
    }
    const { data: existingStaffAttendee } = await staffCheckQuery.limit(1);

    if (existingStaffAttendee && existingStaffAttendee.length > 0) {
      const staffAtt = existingStaffAttendee[0];
      if (staffAtt.status === 'checked_in') return { type: 'duplicate', attendee: staffAtt };

      await supabase.from('attendees').update({ status: 'checked_in' }).eq('id', staffAtt.id);
      await supabase.from('checkin_logs').insert({ attendee_id: staffAtt.id, scanned_by: scannedBy });
      return { type: 'success', attendee: { ...staffAtt, status: 'checked_in' }, isStaff: true };
    }

    // Auto-create attendee as Staff CLB for this event
    const staffPayload = {
      full_name: member.full_name,
      ticket_code: member.member_code,
      company: 'Ban Tổ Chức (Staff CLB NITEK)',
      notes: `Thành viên CLB (${member.class_name || 'NITEK'}) check-in vai trò Staff Ban Tổ Chức`,
      status: 'checked_in',
      email: member.email || null,
      phone: member.phone || null,
    };
    if (selectedEventId && selectedEventId !== 'all') {
      staffPayload.event_id = selectedEventId;
    }

    const { data: insertedStaff, error: insertErr } = await supabase
      .from('attendees')
      .insert(staffPayload)
      .select();

    if (insertErr || !insertedStaff?.[0]) {
      throw insertErr || new Error('Không tạo được bản ghi Staff');
    }

    const newStaffAttendee = insertedStaff[0];
    await supabase.from('checkin_logs').insert({ attendee_id: newStaffAttendee.id, scanned_by: scannedBy });

    return { type: 'success', attendee: newStaffAttendee, isStaff: true };
  }

  return { type: 'not_found', code };
}

// ─── Welcome Modal ────────────────────────────────────────────────────
function WelcomeModal({ attendee, isStaff, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!attendee) return null;

  const isVip = Boolean(attendee.is_vip);
  const isStaffRole = isStaff || (attendee.company || '').includes('Staff') || (attendee.company || '').includes('Ban Tổ Chức');
  
  const themeColor = isVip ? '#fbbf24' : isStaffRole ? '#a855f7' : '#10b981';
  const themeGradient = isVip
    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
    : isStaffRole 
      ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' 
      : 'linear-gradient(135deg, #10b981, #34d399)';

  const iconComp = isVip 
    ? <IconCrown size={56} color="#ffffff" />
    : isStaffRole
      ? <IconShield size={56} color="#ffffff" />
      : <IconCheckCircle size={56} color="#ffffff" />;

  const subTitle = isVip
    ? 'XIN CHÀO KHÁCH VIP'
    : isStaffRole 
      ? 'CHECK-IN THÀNH CÔNG — VAI TRÒ STAFF' 
      : 'CHÀO MỪNG KHÁCH MỜI';

  return (
    <div
      id="welcome-modal-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
        cursor: 'pointer',
      }}
      onClick={onClose}
    >
      <div
        style={{
          textAlign: 'center', padding: '56px 44px',
          maxWidth: 520, width: '100%',
          animation: 'welcomePop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Big icon */}
        <div style={{
          width: 120, height: 120,
          borderRadius: '50%',
          background: themeGradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: `0 0 60px ${isVip ? 'rgba(245,158,11,0.7)' : isStaffRole ? 'rgba(168,85,247,0.6)' : 'rgba(16,185,129,0.5)'}`,
          animation: 'checkPulse 1.5s ease infinite',
        }}>
          {iconComp}
        </div>

        {/* Welcome text */}
        <div style={{
          fontSize: 14, color: themeColor, fontWeight: 700,
          letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {isVip && <IconCrown size={18} color="#fbbf24" />}
          {subTitle}
          {isVip && <IconCrown size={18} color="#fbbf24" />}
        </div>

        <div style={{
          fontSize: 42, fontWeight: 900,
          color: 'white', letterSpacing: -1, lineHeight: 1.1,
          marginBottom: 14,
          textShadow: `0 0 40px ${isVip ? 'rgba(245,158,11,0.6)' : isStaffRole ? 'rgba(168,85,247,0.5)' : 'rgba(16,185,129,0.4)'}`,
        }}>
          {attendee.full_name}
        </div>

        {isVip && (
          <div style={{ marginBottom: 16 }}>
            <span className="badge badge-vip" style={{ padding: '6px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconCrown size={16} color="#fbbf24" /> KHÁCH MỜI DANH DỰ (VIP)
            </span>
          </div>
        )}

        {isStaffRole && !isVip && (
          <div style={{ marginBottom: 16 }}>
            <span style={{
              background: 'rgba(168,85,247,0.2)', color: '#d8b4fe',
              border: '1px solid rgba(168,85,247,0.5)',
              padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 800,
              letterSpacing: 1, textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <IconShield size={16} color="#d8b4fe" /> Ban Tổ Chức • Staff CLB NITEK
            </span>
          </div>
        )}

        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
          {attendee.company && !isStaffRole && (
            <div style={{ marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconBuilding size={14} color="var(--accent-primary)" /> {attendee.company}
            </div>
          )}
          <span style={{
            fontFamily: 'monospace', fontSize: 15,
            background: isStaffRole ? 'rgba(168,85,247,0.15)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${isStaffRole ? 'rgba(168,85,247,0.3)' : 'rgba(16,185,129,0.3)'}`,
            padding: '4px 14px', borderRadius: 6,
            color: isStaffRole ? '#c084fc' : '#34d399', letterSpacing: 2,
          }}>
            Mã: {attendee.ticket_code}
          </span>
        </div>

        <div style={{ marginTop: 28, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Tự động đóng sau 4 giây • Nhấn để đóng
        </div>

        {/* Progress bar auto-close */}
        <div style={{ marginTop: 14, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: themeGradient,
            animation: 'welcomeTimer 4.5s linear forwards',
            borderRadius: 2,
          }} />
        </div>
      </div>

      <style>{`
        @keyframes welcomePop {
          from { transform: scale(0.8) translateY(20px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes checkPulse {
          0%, 100% { box-shadow: 0 0 60px rgba(16,185,129,0.5); }
          50%       { box-shadow: 0 0 80px rgba(16,185,129,0.8); }
        }
        @keyframes welcomeTimer {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// ─── Modal Manual Staff Checkin from CLB Members ───────────────────────
function StaffCheckinModal({ isOpen, onClose, onCheckinStaff }) {
  const { members } = useClub();
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState(null);

  if (!isOpen) return null;

  const filteredMembers = (members || []).filter(m => {
    const q = search.toLowerCase();
    return !q || m.full_name.toLowerCase().includes(q) || m.member_code.toLowerCase().includes(q) || (m.class_name || '').toLowerCase().includes(q);
  });

  const handleSelect = async (member) => {
    setLoadingId(member.id);
    await onCheckinStaff(member.member_code);
    setLoadingId(null);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)', padding: 28, maxWidth: 540, width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#c084fc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconShield size={20} color="#c084fc" /> Điểm Danh Thành Viên CLB Vai Trò Staff
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', padding: 0 }}><IconX size={16} /></button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Chọn thành viên CLB bên dưới để ghi nhận tham gia Sự kiện dưới vai trò <strong>Ban Tổ Chức / Staff</strong>:
        </p>

        <input
          id="search-club-members-scanner"
          className="form-input"
          placeholder="Tìm thành viên theo tên, mã thành viên, lớp..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 16 }}
          autoFocus
        />

        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
          {filteredMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
              Không tìm thấy thành viên phù hợp
            </div>
          ) : (
            filteredMembers.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {m.member_code} {m.class_name ? `• ${m.class_name}` : ''}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => handleSelect(m)}
                  disabled={loadingId === m.id}
                >
                  {loadingId === m.id ? 'Đang lưu…' : <><IconShield size={14} /> Check-in Staff</>}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}



// ─── Result Display Card ──────────────────────────────────────────────
function ResultDisplay({ result }) {
  if (!result) return null;

  if (result.type === 'success') {
    const isVip = Boolean(result.attendee?.is_vip);
    const isStaff = result.isStaff || (result.attendee?.company || '').includes('Staff') || (result.attendee?.company || '').includes('Ban Tổ Chức');
    
    let bgStyle = undefined;
    let iconComp = <IconCheckCircle size={32} color="var(--accent-success)" />;
    let statusText = 'CHECK-IN THÀNH CÔNG';
    let statusColor = undefined;

    if (isVip) {
      bgStyle = { background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.3) 100%)', border: '1px solid rgba(245,158,11,0.5)', boxShadow: '0 0 20px rgba(245,158,11,0.25)' };
      iconComp = <IconCrown size={34} color="#fbbf24" />;
      statusText = 'XIN CHÀO KHÁCH VIP';
      statusColor = '#fbbf24';
    } else if (isStaff) {
      bgStyle = { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)' };
      iconComp = <IconShield size={32} color="#c084fc" />;
      statusText = 'STAFF / BAN TỔ CHỨC CHECK-IN';
      statusColor = '#c084fc';
    }

    return (
      <div className="result-display success" style={bgStyle}>
        <div className="result-icon">{iconComp}</div>
        <div className="result-status success" style={{ color: statusColor }}>
          {statusText}
        </div>
        <div className="result-name" style={{ color: isVip ? '#fbbf24' : undefined, fontWeight: isVip ? 800 : 700 }}>
          {result.attendee.full_name}
        </div>
        <div className="result-detail">
          Mã: <span className="ticket-code">{result.attendee.ticket_code}</span>
          {result.attendee.company && <span> • {result.attendee.company}</span>}
        </div>
      </div>
    );
  }

  if (result.type === 'duplicate') {
    return (
      <div className="result-display warning">
        <div className="result-icon"><IconClock size={32} color="var(--accent-warning)" /></div>
        <div className="result-status warning">CẢNH BÁO: MÃ ĐÃ ĐƯỢC SỬ DỤNG!</div>
        <div className="result-name">{result.attendee.full_name}</div>
        <div className="result-detail">
          <span className="ticket-code">{result.attendee.ticket_code}</span> đã check-in trước đó
        </div>
      </div>
    );
  }

  if (result.type === 'not_found') {
    return (
      <div className="result-display error">
        <div className="result-icon"><IconX size={44} color="#ef4444" /></div>
        <div className="result-status error">MÃ KHÔNG HỢP LỆ</div>
        <div className="result-detail">
          Không tìm thấy mã vé hoặc thành viên CLB: <span className="ticket-code">{result.code}</span>
        </div>
      </div>
    );
  }

  if (result.type === 'error') {
    return (
      <div className="result-display error">
        <div className="result-icon"><IconX size={44} color="#ef4444" /></div>
        <div className="result-status error">LỖI HỆ THỐNG</div>
        <div className="result-detail">{result.message}</div>
      </div>
    );
  }

  return null;
}

// ─── Main Scanner Component ───────────────────────────────────────────
export default function ScannerView({ isActive }) {
  const { selectedEventId } = useEvents();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [cooldown, setCooldown] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [processing, setProcessing] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [welcomeAttendee, setWelcomeAttendee] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const qrRef = useRef(null);
  const cooldownRef = useRef(false);
  const lastScannedRef = useRef({ code: '', time: 0 });

  // ─── Start scanner ──────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    if (qrRef.current) return;

    // Initialize with hardware-accelerated QR code format and BarcodeDetector
    const html5Qr = new Html5Qrcode('qr-reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      verbose: false,
    });
    qrRef.current = html5Qr;

    try {
      await html5Qr.start(
        { facingMode: cameraFacing },
        {
          fps: 25, // Fluid 25 FPS scanning for instant code recognition
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            const boxSize = Math.max(180, Math.floor(minDim * 0.75));
            return { width: boxSize, height: boxSize };
          },
          aspectRatio: 1.0,
          disableFlip: cameraFacing === 'environment',
          videoConstraints: {
            facingMode: cameraFacing,
            focusMode: 'continuous',
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          },
        },
        async (decodedText) => {
          const raw = (decodedText || '').trim().toUpperCase();
          const now = Date.now();

          // If identical code was scanned in the last 2500ms, ignore to avoid spam
          if (lastScannedRef.current.code === raw && (now - lastScannedRef.current.time) < 2500) {
            return;
          }

          // If scanning different codes, allow snappy 600ms debounce
          if (now - lastScannedRef.current.time < 600 || cooldownRef.current) {
            return;
          }

          lastScannedRef.current = { code: raw, time: now };
          cooldownRef.current = true;
          setCooldown(true);

          // Haptic tactile vibration feedback on supported mobile devices
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(50); } catch (_e) {}
          }

          await handleCheckin(decodedText);

          setTimeout(() => {
            cooldownRef.current = false;
            setCooldown(false);
          }, 1000);
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      console.error('Camera error:', err);
      setResult({
        type: 'error',
        message: 'Không thể truy cập camera. Kiểm tra quyền truy cập.',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraFacing, selectedEventId]);

  // ─── Stop scanner ───────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (qrRef.current) {
      try {
        await qrRef.current.stop();
        qrRef.current.clear();
      } catch (_e) { /* ignore */ }
      qrRef.current = null;
      setScanning(false);
    }
  }, []);

  const toggleScanner = () => {
    if (scanning) stopScanner();
    else startScanner();
  };

  const switchCamera = async () => {
    await stopScanner();
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    if (scanning) startScanner();
  }, [cameraFacing, startScanner, scanning]);

  useEffect(() => {
    if (!isActive) stopScanner();
  }, [isActive, stopScanner]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  // ─── Perform check-in ───────────────────────────────────────────────
  const handleCheckin = async (code) => {
    setProcessing(true);
    setResult(null);

    try {
      const res = await performCheckin(code, 'scanner', selectedEventId);
      setResult(res);

      if (res.type === 'success') {
        playBeep(res.attendee?.is_vip ? 'vip' : res.isStaff ? 'staff' : 'success');
        setWelcomeAttendee(res.attendee);
        setScanHistory(prev => [
          { ...res.attendee, scanned_at: new Date().toISOString() },
          ...prev.slice(0, 9),
        ]);
      } else if (res.type === 'duplicate' || res.type === 'not_found') {
        playBeep('error');
      }
    } catch (err) {
      setResult({ type: 'error', message: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleCheckin(manualCode.trim());
    setManualCode('');
  };

  return (
    <div>
      {/* Welcome Modal */}
      {welcomeAttendee && (
        <WelcomeModal
          attendee={welcomeAttendee}
          isStaff={(welcomeAttendee.company || '').includes('Staff') || (welcomeAttendee.company || '').includes('Ban Tổ Chức')}
          onClose={() => setWelcomeAttendee(null)}
        />
      )}

      {/* Staff Checkin Modal */}
      <StaffCheckinModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        onCheckinStaff={handleCheckin}
      />

      {/* Header */}
      <div className="card-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconScanner size={22} color="var(--accent-primary)" /> Soát Vé Sự Kiện & Check-in Staff CLB
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Quét mã QR vé Khách mời hoặc Mã QR Thành viên CLB để Check-in Staff
          </p>
        </div>

        {/* Staff Checkin Button */}
        <button
          id="btn-open-staff-checkin"
          className="btn btn-primary btn-sm"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowStaffModal(true)}
        >
          <IconShield size={14} /> Check-in Staff CLB
        </button>
      </div>

      <div className="scanner-layout">
        {/* Left: Camera */}
        <div className="scanner-card">
          <div className="scanner-header">
            <span className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconScanner size={16} /> Camera Scanner
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {scanning && (
                <span style={{ fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#ef4444', display: 'inline-block',
                    animation: 'pulse 1s infinite',
                    boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                  }} />
                  Đang quét…
                </span>
              )}
              {scanning && (
                <button
                  id="btn-switch-camera"
                  className="btn btn-secondary btn-sm"
                  onClick={switchCamera}
                  title="Đổi camera"
                  style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <IconRefresh size={12} /> Đổi cam
                </button>
              )}
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: 460, margin: '0 auto', minHeight: 280, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div id="qr-reader" style={{ width: '100%' }} />

            {!scanning && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-md)',
                gap: 12, padding: 24, textAlign: 'center',
              }}>
                <div style={{ opacity: 0.6 }}><IconScanner size={48} color="var(--accent-primary)" /></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                  Camera chưa hoạt động
                </div>
                <button
                  id="btn-start-scanner"
                  className="btn btn-primary btn-lg"
                  onClick={toggleScanner}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <IconScanner size={18} /> Bật Camera Quét QR
                </button>
              </div>
            )}
          </div>

          {scanning && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button
                id="btn-stop-scanner"
                className="btn btn-secondary btn-sm"
                onClick={toggleScanner}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <IconStop size={13} /> Tắt Camera
              </button>
            </div>
          )}
        </div>

        {/* Right: Manual Input + Result + Scan History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Manual Input Form */}
          <div className="card" style={{ padding: 20 }}>
            <div className="card-title" style={{ marginBottom: 12, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconKey size={16} /> Nhập Mã Thủ Công (Vé hoặc Mã CLB)
            </div>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                id="manual-ticket-input"
                className="form-input"
                placeholder="EVT-001 hoặc CLB-001..."
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                disabled={processing}
                style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
              />
              <button
                id="btn-submit-manual-code"
                type="submit"
                className="btn btn-primary"
                disabled={processing || !manualCode.trim()}
              >
                {processing ? <span className="loading-spinner" /> : 'Xác nhận'}
              </button>
            </form>
          </div>

          {/* Result Display */}
          <ResultDisplay result={result} />

          {/* Recent History */}
          {scanHistory.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconClock size={14} /> Lịch sử quét vừa qua ({scanHistory.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scanHistory.map((h, i) => {
                  const isStaff = (h.company || '').includes('Staff') || (h.company || '').includes('Ban Tổ Chức');
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                      fontSize: 13,
                    }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{h.full_name}</span>
                        {isStaff && (
                          <span style={{ fontSize: 10, background: 'rgba(168,85,247,0.2)', color: '#d8b4fe', padding: '1px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 700 }}>
                            STAFF
                          </span>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {h.ticket_code} {h.company && !isStaff ? `• ${h.company}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconDot size={7} color="#10b981" /> {new Date(h.scanned_at).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
