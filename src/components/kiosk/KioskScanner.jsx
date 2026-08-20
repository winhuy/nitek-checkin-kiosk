import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { supabase } from '../../lib/supabaseClient';
import { useClub, checkIsLate } from '../../contexts/ClubContext';
import {
  IconScanner,
  IconCheckCircle,
  IconAlertTriangle,
  IconClock,
  IconCalendar,
  IconMapPin,
  IconLock,
  IconRefresh,
  IconCheck,
  IconX,
  IconUser,
  IconPin,
  IconUsers,
} from '../common/CustomIcons';

// ─── Audio Chime Helper via Web Audio API ─────────────────────────────────
function playKioskChime(type = 'success') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24); // C6
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === 'late') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(440.00, ctx.currentTime + 0.15); // A4
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // error
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220.00, ctx.currentTime); // A3
      osc.frequency.setValueAtTime(180.00, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (_) {
    // ignore audio block
  }
}

// ─── Welcome Overlay for Kiosk ───────────────────────────────────────────
function KioskWelcomeOverlay({ overlay, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!overlay) return null;
  const { member, isLate, lateMinutes, startTime } = overlay;
  const firstName = member?.full_name ? member.full_name.split(' ').pop() : 'Bạn';
  const themeColor = isLate ? '#f59e0b' : '#10b981';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(7, 11, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        cursor: 'pointer',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #131d35 0%, #0d1424 100%)',
          border: `2px solid ${themeColor}`,
          boxShadow: `0 0 80px ${isLate ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.35)'}`,
          borderRadius: 32,
          padding: '40px 48px',
          maxWidth: 680,
          width: '100%',
          textAlign: 'center',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: isLate
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: `0 0 40px ${themeColor}`,
          }}
        >
          {isLate ? <IconAlertTriangle size={52} color="#ffffff" /> : <IconCheck size={52} color="#ffffff" />}
        </div>

        <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: themeColor, marginBottom: 8 }}>
          {isLate ? 'ĐIỂM DANH ĐẾN TRỄ' : 'ĐIỂM DANH THÀNH CÔNG'}
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 900, margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
          Chào mừng, {firstName}!
        </h1>

        <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>
          {member?.full_name}
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', padding: '8px 20px', borderRadius: 20, fontSize: 16, fontWeight: 600, marginBottom: 24 }}>
          <IconPin size={16} color={themeColor} />
          <span>Mã: <strong>{member?.member_code}</strong></span>
          {member?.class_name && <span>• Lớp: {member.class_name}</span>}
        </div>

        {isLate ? (
          <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 16, padding: '14px 20px', fontSize: 15, color: '#fcd34d', fontWeight: 600 }}>
            ⚠️ Trễ {lateMinutes} phút so với giờ bắt đầu ({startTime || '08:00'})
          </div>
        ) : (
          <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 16, padding: '14px 20px', fontSize: 15, color: '#6ee7b7', fontWeight: 600 }}>
            ✓ Đã ghi nhận đúng giờ! Chúc bạn buổi sinh hoạt hiệu quả!
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin PIN Unlock Modal ───────────────────────────────────────────────
function AdminPinModal({ isOpen, onClose, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setError(false);
      if (next.length === 4) {
        if (next === '1234' || next === '0000' || next === '9999') {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => setPin(''), 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(5, 8, 16, 0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d1424',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 28,
          padding: '32px 28px',
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(79,156,249,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <IconLock size={28} color="var(--accent-primary, #4f9cf9)" />
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px 0' }}>Mở Khóa Quản Trị</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px 0' }}>
          Nhập mã PIN 4 số (Mặc định: 1234)
        </p>

        {/* PIN Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: `2px solid ${error ? '#ef4444' : pin.length > idx ? '#4f9cf9' : 'rgba(255,255,255,0.3)'}`,
                background: error ? '#ef4444' : pin.length > idx ? '#4f9cf9' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            Sai mã PIN! Vui lòng thử lại.
          </div>
        )}

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 280, margin: '0 auto 20px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => handleDigit(String(n))}
              style={{
                height: 58,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 22,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            style={{
              height: 58,
              borderRadius: 16,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Xóa
          </button>
          <button
            key={0}
            type="button"
            onClick={() => handleDigit('0')}
            style={{
              height: 58,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 22,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            style={{
              height: 58,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ⌫
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 16px',
          }}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

export default function KioskScanner({ onExitKiosk }) {
  const {
    activeSession,
    sessions,
    members,
    openSession,
    recordAttendance,
    fetchAttendanceForSession,
  } = useClub();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [recentAttendees, setRecentAttendees] = useState([]);
  const [overlay, setOverlay] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraList, setCameraList] = useState([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const cooldownRef = useRef(false);
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // ── Digital Clock Interval ──────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Load Session Attendance Count ───────────────────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!activeSession) return;
    const { data } = await fetchAttendanceForSession(activeSession.id);
    if (data) {
      setAttendanceCount(data.length);
      const recent = data
        .slice(0, 4)
        .map(rec => {
          const m = members.find(mem => mem.id === rec.member_id);
          return {
            id: rec.id,
            name: m?.full_name || 'Thành viên',
            code: m?.member_code || '',
            time: new Date(rec.checked_in_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            status: rec.checkin_status,
          };
        });
      setRecentAttendees(recent);
    }
  }, [activeSession, fetchAttendanceForSession, members]);

  useEffect(() => {
    loadAttendance();
    const interval = setInterval(loadAttendance, 10000);
    return () => clearInterval(interval);
  }, [loadAttendance]);

  // ── Process Scan Code ───────────────────────────────────────────────────
  const handleProcessCode = useCallback(async (scannedCode) => {
    if (!scannedCode || cooldownRef.current) return;
    const cleanCode = scannedCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (!activeSession) {
      playKioskChime('error');
      setAlertMsg({ type: 'error', text: 'Chưa có buổi sinh hoạt nào đang mở!' });
      setTimeout(() => setAlertMsg(null), 3500);
      return;
    }

    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 2500);

    // 1. Find member by code or id
    const member = members.find(m =>
      m.member_code?.toUpperCase() === cleanCode ||
      m.id === cleanCode ||
      m.phone === cleanCode
    );

    if (!member) {
      playKioskChime('error');
      setAlertMsg({ type: 'error', text: `Không tìm thấy thành viên có mã "${cleanCode}"` });
      setTimeout(() => setAlertMsg(null), 3500);
      return;
    }

    // 2. Check duplicate attendance
    const { data: existingRec } = await supabase
      .from('club_attendance_records')
      .select('id')
      .eq('member_id', member.id)
      .eq('session_id', activeSession.id)
      .limit(1);

    if (existingRec && existingRec.length > 0) {
      playKioskChime('error');
      setAlertMsg({ type: 'warning', text: `${member.full_name} (${member.member_code}) đã điểm danh rồi!` });
      setTimeout(() => setAlertMsg(null), 3500);
      return;
    }

    // 3. Determine on_time vs late
    const { isLate, lateMinutes, status: checkinStatus } = checkIsLate(activeSession, new Date());

    // 4. Save record
    const { error: recError } = await recordAttendance({
      memberId: member.id,
      sessionId: activeSession.id,
      checkinStatus,
      lateMinutes,
      notes: 'Điểm danh Kiosk reTerminal DM',
    });

    if (recError) {
      playKioskChime('error');
      setAlertMsg({ type: 'error', text: `Lỗi ghi nhận: ${recError.message}` });
      setTimeout(() => setAlertMsg(null), 3500);
      return;
    }

    // 5. Trigger Success Overlay and Chime
    playKioskChime(isLate ? 'late' : 'success');
    setOverlay({
      member,
      isLate,
      lateMinutes,
      startTime: activeSession.start_time,
    });
    setManualCode('');
    await loadAttendance();
  }, [activeSession, members, recordAttendance, loadAttendance]);

  const handleProcessCodeRef = useRef(null);
  handleProcessCodeRef.current = handleProcessCode;

  // ── Hardware Barcode / USB Scanner Global Key Listener ───────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore when user is actively focused on an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Barcode scanners type very rapidly (< 60ms between keys)
      if (timeDiff > 100) {
        barcodeBufferRef.current = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 2) {
          const code = barcodeBufferRef.current;
          barcodeBufferRef.current = '';
          if (handleProcessCodeRef.current) {
            handleProcessCodeRef.current(code);
          }
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Continuous QR Scan Loop via Canvas and jsQR ──────────────────────────
  const stopScanner = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && video.readyState >= 2 && canvas) {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          try {
            const imageData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data && handleProcessCodeRef.current) {
              handleProcessCodeRef.current(code.data);
            }
          } catch (_) { /* ignore frame dropped */ }
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, []);

  // ── Start Native Camera Stream ──────────────────────────────────────────
  const startScanner = useCallback(async () => {
    try {
      setCameraError(null);
      stopScanner();

      // 1. Enumerate and probe readable video devices
      const allDevs = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const videoDevs = allDevs.filter(d => d.kind === 'videoinput');

      let targetDevId = null;
      let workingDevs = [];

      // Test reverse order (loopback / USB cams first)
      for (const dev of [...videoDevs].reverse()) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: dev.deviceId ? { deviceId: { exact: dev.deviceId } } : true,
          });
          testStream.getTracks().forEach(t => t.stop());
          workingDevs.push(dev);
          if (!targetDevId) targetDevId = dev.deviceId;
        } catch (probeErr) {
          console.warn('Skipping unreadable node:', dev.label || dev.deviceId, probeErr.name);
        }
      }

      const available = workingDevs.length > 0 ? workingDevs : videoDevs;
      setCameraList(available);

      const activeDevId = targetDevId || (available[cameraIndex % available.length]?.deviceId);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: activeDevId
          ? { deviceId: { exact: activeDevId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') throw e;
        });
        setCameraActive(true);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Kiosk camera start failed:', err);
      setCameraError(err.name ? `${err.name}: ${err.message}` : (err.message || 'Không thể mở camera. Vui lòng thử lại.'));
      setCameraActive(false);
    }
  }, [cameraIndex, scanLoop, stopScanner]);

  const handleNextCamera = () => {
    if (cameraList.length > 1) {
      setCameraIndex(i => (i + 1) % cameraList.length);
    } else {
      startScanner();
    }
  };

  useEffect(() => {
    let mounted = true;
    const t = setTimeout(() => {
      if (mounted) startScanner();
    }, 300);
    return () => {
      mounted = false;
      clearTimeout(t);
      stopScanner();
    };
  }, [cameraIndex, startScanner, stopScanner]);

  // ── Touch Numpad Handlers ───────────────────────────────────────────────
  const handleNumpadPress = (val) => {
    if (val === 'CLEAR') {
      setManualCode('');
    } else if (val === 'BACK') {
      setManualCode(c => c.slice(0, -1));
    } else if (val === 'SUBMIT') {
      if (manualCode.trim()) {
        handleProcessCode(manualCode.trim());
      }
    } else {
      if (manualCode.length < 15) {
        setManualCode(c => c + val);
      }
    }
  };

  const totalMembersCount = members.filter(m => m.status !== 'inactive').length;
  const attendanceRate = totalMembersCount > 0 ? Math.round((attendanceCount / totalMembersCount) * 100) : 0;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#070b14',
        color: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ── TOP HEADER BAR (Height ~64px) ─────────────────────────── */}
      <header
        style={{
          height: 64,
          background: '#0d1424',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        {/* Brand & Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo.jpg"
            alt="Logo"
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }}
          />
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: -0.5, color: '#ffffff' }}>
              NITEK CHECKIN
            </div>
            <div style={{ fontSize: 11, color: '#4f9cf9', fontWeight: 600 }}>
              Kiosk reTerminal DM
            </div>
          </div>
        </div>

        {/* Active Session Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeSession ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              color: '#10b981',
            }}>
              <IconCalendar size={14} color="#10b981" />
              <span>{activeSession.title}</span>
              {activeSession.start_time && (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                  ({activeSession.start_time})
                </span>
              )}
            </div>
          ) : (
            <div style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              color: '#f59e0b',
            }}>
              Chưa kích hoạt buổi sinh hoạt
            </div>
          )}
        </div>

        {/* Live Clock & Exit Lock Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Clock */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', letterSpacing: 0.5, fontVariantNumeric: 'tabular-nums' }}>
              {currentTime.toLocaleTimeString('vi-VN')}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
              {currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
            </div>
          </div>

          {/* Admin Exit Pin Button */}
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            title="Thoát chế độ Kiosk (Yêu cầu mã PIN)"
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <IconLock size={18} />
          </button>
        </div>
      </header>

      {/* ── MAIN 2-COLUMN VIEWPORT (1280x736 remaining) ──────────── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          gap: 16,
          padding: 16,
          overflow: 'hidden',
        }}
      >
        {/* ── LEFT COLUMN: CAMERA QR SCANNER (55% width) ─────────── */}
        <div
          style={{
            background: '#0d1424',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Viewfinder Box */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              background: '#000000',
              borderRadius: 18,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(79,156,249,0.3)',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: cameraActive ? 'block' : 'none',
              }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Target Reticle Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 240,
                  height: 240,
                  border: '2px dashed rgba(79,156,249,0.6)',
                  borderRadius: 20,
                  boxShadow: '0 0 20px rgba(79,156,249,0.2)',
                  position: 'relative',
                }}
              >
                {/* Laser Sweep Line */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, #4f9cf9, transparent)',
                    boxShadow: '0 0 8px #4f9cf9',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                />
              </div>
            </div>

            {/* Error or Retry Overlay */}
            {!cameraActive && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(7,11,20,0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                  textAlign: 'center',
                  zIndex: 4,
                }}
              >
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <IconAlertTriangle size={32} color="#ef4444" />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                  {cameraError ? 'Không thể mở Camera' : 'Đang kết nối camera...'}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', maxWidth: 300, marginBottom: 16 }}>
                  {cameraError || 'Đang tìm kiếm thiết bị camera tích hợp / USB...'}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => startScanner()}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <IconRefresh size={15} /> Thử Lại
                  </button>
                  {cameraList.length > 1 && (
                    <button
                      type="button"
                      onClick={handleNextCamera}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      Đổi Camera ({cameraIndex + 1}/{cameraList.length})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Camera Switch / Cycle Button */}
            {cameraActive && (
              <button
                type="button"
                onClick={handleNextCamera}
                title={cameraList.length > 1 ? `Đổi camera (${cameraIndex + 1}/${cameraList.length})` : 'Khởi động lại camera'}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(0,0,0,0.7)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  zIndex: 5,
                }}
              >
                <IconRefresh size={14} />
                {cameraList.length > 1 ? `Cam ${cameraIndex + 1}/${cameraList.length}` : 'Lật cam'}
              </button>
            )}
          </div>

          {/* Scanner Instructions & Alert Banner */}
          <div style={{ marginTop: 12 }}>
            {alertMsg ? (
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: 14,
                  background: alertMsg.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  border: `1px solid ${alertMsg.type === 'error' ? '#ef4444' : '#f59e0b'}`,
                  color: alertMsg.type === 'error' ? '#fca5a5' : '#fcd34d',
                  fontSize: 14,
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              >
                {alertMsg.text}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#4f9cf9',
                  background: 'rgba(79,156,249,0.08)',
                  padding: '10px 16px',
                  borderRadius: 14,
                  border: '1px solid rgba(79,156,249,0.2)',
                }}
              >
                <IconScanner size={18} color="#4f9cf9" />
                <span>Hướng mã QR vào camera để điểm danh tự động</span>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: TOUCH NUMPAD & RECENT FEED (45% width) ─ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflow: 'hidden',
          }}
        >
          {/* Quick Stats Pill */}
          <div
            style={{
              background: '#0d1424',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconCheckCircle size={18} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ĐÃ ĐIỂM DANH</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>
                  {attendanceCount} / {totalMembersCount} ({attendanceRate}%)
                </div>
              </div>
            </div>

            {/* Quick Session Picker */}
            {sessions.length > 1 && (
              <select
                value={activeSession?.id || ''}
                onChange={e => openSession(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  maxWidth: 160,
                }}
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#0d1424', color: '#fff' }}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Touch Numpad for Manual Code Input */}
          <div
            style={{
              background: '#0d1424',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {/* Input Display */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: '#070b14',
                border: '1px solid rgba(79,156,249,0.3)',
                borderRadius: 14,
                padding: '8px 14px',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4f9cf9' }}>MÃ:</span>
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value.toUpperCase())}
                placeholder="VD: CLB-001 hoặc số thẻ..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: 1,
                }}
              />
              {manualCode && (
                <button
                  type="button"
                  onClick={() => setManualCode('')}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                >
                  <IconX size={16} />
                </button>
              )}
            </div>

            {/* Touch Keypad Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}
            >
              {['1', '2', '3', 'CLB-'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpadPress(k)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    background: k === 'CLB-' ? 'rgba(79,156,249,0.15)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: k === 'CLB-' ? '#4f9cf9' : '#fff',
                    fontSize: k === 'CLB-' ? 13 : 18,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {k}
                </button>
              ))}
              {['4', '5', '6', 'CLEAR'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpadPress(k)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    background: k === 'CLEAR' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: k === 'CLEAR' ? '#ef4444' : '#fff',
                    fontSize: k === 'CLEAR' ? 12 : 18,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {k === 'CLEAR' ? 'XÓA' : k}
                </button>
              ))}
              {['7', '8', '9', 'BACK'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpadPress(k)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: k === 'BACK' ? 16 : 18,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {k === 'BACK' ? '⌫' : k}
                </button>
              ))}
              {['0', '-', '.', 'SUBMIT'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpadPress(k)}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    background: k === 'SUBMIT'
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'rgba(255,255,255,0.06)',
                    border: k === 'SUBMIT' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: k === 'SUBMIT' ? 13 : 18,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: k === 'SUBMIT' ? '0 2px 12px rgba(16,185,129,0.3)' : 'none',
                  }}
                >
                  {k === 'SUBMIT' ? '✓ NHẬP' : k}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Checked-in List */}
          <div
            style={{
              flex: 1,
              background: '#0d1424',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 6 }}>
              Vừa Điểm Danh Gần Đây
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentAttendees.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '16px 0' }}>
                  Chưa có thành viên điểm danh trong buổi này
                </div>
              ) : (
                recentAttendees.map(rec => (
                  <div
                    key={rec.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '6px 10px',
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: rec.status === 'on_time' ? '#10b981' : '#f59e0b' }} />
                      <strong style={{ color: '#fff' }}>{rec.name}</strong>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>({rec.code})</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {rec.time}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CELEBRATORY WELCOME POPUP ──────────────────────────────── */}
      <KioskWelcomeOverlay overlay={overlay} onClose={() => setOverlay(null)} />

      {/* ── ADMIN PIN UNLOCK MODAL ─────────────────────────────────── */}
      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onUnlock={() => {
          setShowPinModal(false);
          onExitKiosk();
        }}
      />
    </div>
  );
}
