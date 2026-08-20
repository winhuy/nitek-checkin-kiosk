import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  IconCrown,
  IconSparkles,
  IconCheckCircle,
  IconBuilding,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconX,
  IconTicket,
  IconUsers,
  IconCamera,
  IconSettings,
} from './common/CustomIcons';
import EventCountdownClock from './common/EventCountdownClock';
import { getEventStatusInfo } from '../contexts/EventContext';

// ─── Luxury Hotel/Event Welcome Audio Chime (Web Audio API) ────────────────
function playWelcomeChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.4 },  // C5
      { freq: 659.25, time: 0.15, dur: 0.4 }, // E5
      { freq: 783.99, time: 0.3, dur: 0.5 },  // G5
      { freq: 1046.50, time: 0.45, dur: 0.8 }, // C6
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + n.time);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + n.time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.time + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.dur + 0.1);
    });
  } catch (err) {
    console.debug('Audio chime skipped:', err);
  }
}

// ─── Trigger Celebration Confetti ──────────────────────────────────────────
export function triggerWelcomeConfetti() {
  try {
    // Left cannon
    confetti({
      particleCount: 55,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors: ['#3b82f6', '#38bdf8', '#fbbf24', '#ec4899', '#10b981'],
    });
    // Right cannon
    confetti({
      particleCount: 55,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors: ['#3b82f6', '#38bdf8', '#fbbf24', '#ec4899', '#10b981'],
    });
  } catch (err) {
    console.debug('Confetti skipped:', err);
  }
}

// ─── Single Welcome Card Component ─────────────────────────────────────────
function WelcomeGuestCard({ guest, onDismiss, isSplitMode }) {
  const [remainingSec, setRemainingSec] = useState(60);

  useEffect(() => {
    const updateTimer = () => {
      const left = Math.max(0, Math.ceil((guest.expiresAt - Date.now()) / 1000));
      setRemainingSec(left);
      if (left <= 0 && onDismiss) {
        onDismiss(guest.id);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [guest.expiresAt, guest.id, onDismiss]);

  const progressPct = Math.max(0, Math.min(100, (remainingSec / 60) * 100));

  // Determine welcome wish text
  const defaultRegularWish = 'Chúc bạn có một trải nghiệm thật tuyệt vời và nhiều kỷ niệm đáng nhớ tại sự kiện! 🎉';
  const defaultVipWish = 'Trân trọng cảm ơn sự hiện diện quý báu của Quý Khách tại sự kiện hôm nay! 🌟';
  const wishText = guest.is_vip
    ? (guest.wishVip || guest.wish || defaultVipWish)
    : (guest.wish || defaultRegularWish);

  return (
    <div
      className={`welcome-guest-card ${guest.is_vip ? 'vip-welcome' : ''} ${isSplitMode ? 'split-card' : 'single-card'}`}
      style={{
        position: 'relative',
        background: guest.is_vip
          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(254, 243, 199, 0.95))'
          : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        borderRadius: 24,
        padding: isSplitMode ? '24px 20px' : '36px 32px',
        border: guest.is_vip ? '2px solid #f59e0b' : '2px solid rgba(255, 255, 255, 0.95)',
        boxShadow: guest.is_vip
          ? '0 20px 50px rgba(245, 158, 11, 0.25), 0 0 0 1px rgba(255,255,255,0.8) inset'
          : '0 20px 50px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255,255,255,0.8) inset',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        animation: 'welcomeCardEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden',
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Top Countdown Line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: 'rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            background: guest.is_vip
              ? 'linear-gradient(90deg, #f59e0b, #ec4899)'
              : 'linear-gradient(90deg, #2563eb, #38bdf8)',
            transition: 'width 0.5s linear',
          }}
        />
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => onDismiss(guest.id)}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.05)',
          color: '#64748b',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        title="Đóng thông báo"
      >
        <IconX size={15} />
      </button>

      {/* Program Logo if available */}
      {guest.logoUrl && (
        <div style={{ marginBottom: 12 }}>
          <img
            src={guest.logoUrl}
            alt="Logo Chương Trình"
            style={{
              maxHeight: isSplitMode ? 44 : 56,
              maxWidth: 160,
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))',
            }}
          />
        </div>
      )}

      {/* Header Tag / Badge */}
      <div style={{ marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {guest.is_vip ? (
          <span
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              padding: '4px 14px',
              borderRadius: 30,
              fontSize: isSplitMode ? 11 : 12,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
            }}
          >
            <IconCrown size={14} color="#ffffff" /> KHÁCH MỜI VIP
          </span>
        ) : (
          <span
            style={{
              background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
              color: '#ffffff',
              padding: '4px 14px',
              borderRadius: 30,
              fontSize: isSplitMode ? 11 : 12,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <IconCheckCircle size={14} color="#ffffff" /> CHECK-IN THÀNH CÔNG
          </span>
        )}
      </div>

      {/* Welcome Greeting Title: "CHÀO MỪNG KHÁCH MỜI" */}
      <div
        style={{
          fontSize: isSplitMode ? 14 : 16,
          fontWeight: 800,
          color: guest.is_vip ? '#b45309' : '#2563eb',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginBottom: 4,
        }}
      >
        CHÀO MỪNG KHÁCH MỜI
      </div>

      {/* Guest Full Name */}
      <h2
        style={{
          fontSize: isSplitMode ? 26 : 38,
          fontWeight: 900,
          color: '#0f172a',
          margin: '4px 0 8px 0',
          lineHeight: 1.2,
          letterSpacing: -0.5,
          wordBreak: 'break-word',
        }}
      >
        {guest.name}
      </h2>

      {/* Company / Organization if available */}
      {guest.company && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: isSplitMode ? 13 : 15,
            fontWeight: 600,
            color: '#475569',
            background: 'rgba(0, 0, 0, 0.04)',
            padding: '4px 12px',
            borderRadius: 20,
            marginBottom: 10,
            maxWidth: '100%',
          }}
        >
          <IconBuilding size={15} color="#64748b" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {guest.company}
          </span>
        </div>
      )}

      {/* Program / Event Name */}
      <div
        style={{
          marginTop: 4,
          fontSize: isSplitMode ? 13 : 15,
          color: '#334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <span>Đã tham gia sự kiện:</span>
        <strong
          style={{
            color: '#0f172a',
            fontWeight: 800,
            background: 'rgba(37, 99, 235, 0.08)',
            padding: '2px 8px',
            borderRadius: 8,
          }}
        >
          {guest.eventName}
        </strong>
      </div>

      {/* Lời Chúc (Welcome Wish Box) */}
      <div
        style={{
          marginTop: 14,
          padding: isSplitMode ? '10px 14px' : '12px 18px',
          borderRadius: 16,
          background: guest.is_vip ? 'rgba(245, 158, 11, 0.1)' : 'rgba(37, 99, 235, 0.06)',
          border: guest.is_vip ? '1px dashed rgba(245, 158, 11, 0.4)' : '1px dashed rgba(37, 99, 235, 0.25)',
          color: guest.is_vip ? '#92400e' : '#1e3a8a',
          fontSize: isSplitMode ? 13 : 14,
          fontWeight: 600,
          fontStyle: 'italic',
          lineHeight: 1.5,
          maxWidth: '100%',
        }}
      >
        "{wishText}"
      </div>

      {/* Footer Info: Ticket Code + 60s Countdown indicator */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px dashed rgba(0, 0, 0, 0.1)',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconTicket size={14} color="var(--accent-primary)" />
          <span>Mã vé: <strong style={{ color: '#0f172a' }}>{guest.ticket_code || '—'}</strong></span>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(0,0,0,0.04)',
            padding: '2px 8px',
            borderRadius: 12,
            fontWeight: 600,
            color: remainingSec <= 10 ? '#ef4444' : '#64748b',
          }}
        >
          <IconClock size={13} />
          <span>Tự đóng sau {remainingSec}s</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Live Welcome Overlay / Stage Display ─────────────────────────────
export default function LiveWelcomeOverlay({
  welcomingGuests = [],
  onDismissGuest,
  isStageMode = false,
  onCloseStageMode,
  currentEvent = null,
  totalCheckedIn = 0,
  totalAttendees = 0,
  isAdmin = false,
  onOpenEventSettings,
}) {
  const count = welcomingGuests.length;
  const currentEventName = currentEvent?.name || 'Sự Kiện';
  const eventLogo = currentEvent?.logo_url || '';
  const statusInfo = getEventStatusInfo(currentEvent);
  const pct = totalAttendees > 0 ? Math.round((totalCheckedIn / totalAttendees) * 100) : 0;

  // Trigger chime and confetti whenever a new guest is added to the queue
  const prevCountRef = useRef(count);
  useEffect(() => {
    if (count > prevCountRef.current) {
      playWelcomeChime();
      triggerWelcomeConfetti();
    }
    prevCountRef.current = count;
  }, [count]);

  // When not in stage mode and no guests are active, do not render overlay
  if (count === 0 && !isStageMode) return null;

  return (
    <div
      className={`live-welcome-overlay ${isStageMode ? 'stage-mode-active' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99990,
        background: isStageMode
          ? 'radial-gradient(circle at 50% 30%, rgba(30, 27, 75, 0.88), rgba(15, 23, 42, 0.95))'
          : 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        animation: 'fadeIn 0.3s ease',
        overflowY: 'auto',
      }}
      onClick={!isStageMode ? () => welcomingGuests.forEach(g => onDismissGuest?.(g.id)) : undefined}
    >
      {/* Floating Top Controls in Stage Mode */}
      {isStageMode && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 24,
            right: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              padding: '6px 14px',
              borderRadius: 30,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusInfo.isOngoing ? '#10b981' : '#38bdf8',
                boxShadow: `0 0 10px ${statusInfo.isOngoing ? '#10b981' : '#38bdf8'}`,
                animation: 'pulse 1.5s infinite',
              }}
            />
            <span>MÀN CHIẾU SÂN KHẤU • {statusInfo.isOngoing ? 'LIVE CHECK-IN STAGE' : 'CHỜ ĐÓN KHÁCH'}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onCloseStageMode}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <IconX size={14} /> Thoát Chế Độ Sân Khấu
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div
        style={{
          width: '100%',
          maxWidth: count === 2 ? 1100 : count > 2 ? 1200 : 680,
          margin: '0 auto',
          position: 'relative',
          zIndex: 5,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── STAGE STANDBY SCREEN (Khi chưa có khách check-in) ───────────── */}
        {count === 0 && isStageMode && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(28px) saturate(200%)',
              borderRadius: 32,
              padding: '48px 36px',
              textAlign: 'center',
              boxShadow: '0 30px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.9) inset',
              border: '2px solid rgba(255,255,255,0.95)',
              animation: 'fadeIn 0.5s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Ambient Background Aura Glow */}
            <div
              style={{
                position: 'absolute',
                top: -80,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(56, 189, 248, 0.35), transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            {/* Event Logo if present */}
            {eventLogo && (
              <div style={{ marginBottom: 20 }}>
                <img
                  src={eventLogo}
                  alt="Logo Sự Kiện"
                  style={{
                    maxHeight: 110,
                    maxWidth: 260,
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.15))',
                    animation: 'pulse 3s infinite',
                  }}
                />
              </div>
            )}

            {/* Live Event Status Badge */}
            <div style={{ marginBottom: 14 }}>
              {statusInfo.isOngoing ? (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#fff',
                    padding: '6px 20px',
                    borderRadius: 30,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 0 8px #ffffff',
                      animation: 'pulse 1.2s infinite',
                    }}
                  />
                  SỰ KIỆN ĐANG DIỄN RA
                </span>
              ) : statusInfo.isCompleted ? (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #475569, #64748b)',
                    color: '#fff',
                    padding: '6px 20px',
                    borderRadius: 30,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(71, 85, 105, 0.35)',
                  }}
                >
                  <IconClock size={16} /> SỰ KIỆN ĐÃ KẾT THÚC
                </span>
              ) : (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                    color: '#fff',
                    padding: '6px 20px',
                    borderRadius: 30,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  <IconSparkles size={16} /> SỰ KIỆN SẮP DIỄN RA
                </span>
              )}
            </div>

            {/* Event Title */}
            <h1
              style={{
                fontSize: 38,
                fontWeight: 900,
                color: '#0f172a',
                margin: '8px 0 12px 0',
                letterSpacing: -0.5,
                lineHeight: 1.2,
              }}
            >
              {currentEventName}
            </h1>

            {/* Event Details: Date + Location */}
            {(currentEvent?.event_date || currentEvent?.location) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  color: '#475569',
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 20,
                  flexWrap: 'wrap',
                }}
              >
                {currentEvent?.event_date && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconCalendar size={16} color="var(--accent-primary)" />
                    {new Date(currentEvent.event_date).toLocaleString('vi-VN', {
                      hour: '2-digit', minute: '2-digit',
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </span>
                )}
                {currentEvent?.location && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconMapPin size={16} color="var(--accent-primary)" />
                    {currentEvent.location}
                  </span>
                )}
              </div>
            )}

            {/* Event Description */}
            {currentEvent?.description && (
              <p
                style={{
                  fontSize: 15,
                  color: '#475569',
                  maxWidth: 560,
                  margin: '0 auto 16px',
                  lineHeight: 1.6,
                }}
              >
                {currentEvent.description}
              </p>
            )}

            {/* Live Event Countdown Clock: "CHƯƠNG TRÌNH SẼ BẮT ĐẦU SAU" */}
            {currentEvent?.event_date && (
              <EventCountdownClock
                targetDate={currentEvent.event_date}
                isStage={true}
                eventName={currentEventName}
              />
            )}

            {/* Live Check-in Overview Box */}
            <div
              style={{
                background: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                borderRadius: 20,
                padding: '16px 24px',
                maxWidth: 480,
                margin: '0 auto 24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Tiến độ tiếp đón khách mời</span>
                <span style={{ color: '#2563eb', fontWeight: 800 }}>{totalCheckedIn} / {totalAttendees} ({pct}%)</span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>

            {/* Standby Message */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(0, 0, 0, 0.04)',
                padding: '10px 24px',
                borderRadius: 30,
                color: '#334155',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#3b82f6',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <span>
                Chào mừng mọi người đến với NITEK
              </span>
            </div>
          </div>
        )}

        {/* ── CASE 1: Single Guest ───────────────────────────── */}
        {count === 1 && (
          <WelcomeGuestCard
            key={welcomingGuests[0].id}
            guest={welcomingGuests[0]}
            onDismiss={onDismissGuest}
            isSplitMode={false}
          />
        )}

        {/* ── CASE 2: Exactly 2 Guests -> DUAL SPLIT SCREEN (Chia đôi màn hình) ── */}
        {count === 2 && (
          <div>
            <div
              style={{
                textAlign: 'center',
                marginBottom: 16,
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <IconSparkles size={16} color="#fbbf24" />
              <span>CHÀO MỪNG ĐỒNG THỜI 2 KHÁCH MỜI VỪA CHECK-IN</span>
              <IconSparkles size={16} color="#fbbf24" />
            </div>

            <div
              className="welcome-split-screen-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 20,
                alignItems: 'stretch',
                width: '100%',
              }}
            >
              {welcomingGuests.map(guest => (
                <WelcomeGuestCard
                  key={guest.id}
                  guest={guest}
                  onDismiss={onDismissGuest}
                  isSplitMode={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── CASE 3: 3 or More Guests -> Multi-Card Grid ───────── */}
        {count >= 3 && (
          <div>
            <div
              style={{
                textAlign: 'center',
                marginBottom: 16,
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              ✨ CHÀO MỪNG {count} KHÁCH MỜI VỪA CHECK-IN ✨
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
                alignItems: 'stretch',
                width: '100%',
              }}
            >
              {welcomingGuests.map(guest => (
                <WelcomeGuestCard
                  key={guest.id}
                  guest={guest}
                  onDismiss={onDismissGuest}
                  isSplitMode={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
