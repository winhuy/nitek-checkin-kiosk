import { useState, useEffect } from 'react';
import { parseFlexibleDate } from '../../contexts/EventContext';
import { IconClock, IconSparkles } from './CustomIcons';

export default function EventCountdownClock({ targetDate, isStage = false, eventName = '' }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));

  function calculateTimeLeft(date) {
    if (!date) return null;
    const parsed = parseFlexibleDate(date);
    if (!parsed) return null;

    const diff = parsed.getTime() - Date.now();
    if (diff <= 0) {
      // Program already started or is happening now
      const elapsed = Math.abs(diff);
      const elapsedHours = Math.floor(elapsed / (1000 * 60 * 60));
      const elapsedMinutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      return {
        isStarted: true,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        elapsedHours,
        elapsedMinutes,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      isStarted: false,
      days,
      hours,
      minutes,
      seconds,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  const pad = (n) => String(n).padStart(2, '0');

  // If countdown finished / event started -> do not display
  if (timeLeft.isStarted) {
    return null;
  }

  // ── Stage Large Mode (Dành cho Màn Chiếu / Màn hình LED) ──────────────────
  if (isStage) {
    return (
      <div
        style={{
          margin: '18px auto 24px',
          maxWidth: 580,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#2563eb',
            marginBottom: 12,
            background: 'rgba(37, 99, 235, 0.08)',
            padding: '4px 16px',
            borderRadius: 20,
          }}
        >
          <IconClock size={15} color="#2563eb" />
          <span>CHƯƠNG TRÌNH SẼ BẮT ĐẦU SAU</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'nowrap',
          }}
        >
          {/* Days (if > 0) */}
          {timeLeft.days > 0 && (
            <>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  borderRadius: 18,
                  padding: '12px 16px',
                  minWidth: 78,
                  boxShadow: '0 10px 25px rgba(37, 99, 235, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: '#0f172a',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {pad(timeLeft.days)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginTop: 4,
                    letterSpacing: 0.5,
                  }}
                >
                  Ngày
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#3b82f6', marginBottom: 12 }}>:</div>
            </>
          )}

          {/* Hours */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              borderRadius: 18,
              padding: '12px 16px',
              minWidth: 78,
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pad(timeLeft.hours)}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                marginTop: 4,
                letterSpacing: 0.5,
              }}
            >
              Giờ
            </div>
          </div>

          <div style={{ fontSize: 24, fontWeight: 900, color: '#3b82f6', marginBottom: 12 }}>:</div>

          {/* Minutes */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              borderRadius: 18,
              padding: '12px 16px',
              minWidth: 78,
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: '#0f172a',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pad(timeLeft.minutes)}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                marginTop: 4,
                letterSpacing: 0.5,
              }}
            >
              Phút
            </div>
          </div>

          <div style={{ fontSize: 24, fontWeight: 900, color: '#3b82f6', marginBottom: 12 }}>:</div>

          {/* Seconds */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(56, 189, 248, 0.15))',
              border: '2px solid #3b82f6',
              borderRadius: 18,
              padding: '12px 16px',
              minWidth: 78,
              boxShadow: '0 10px 25px rgba(37, 99, 235, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: '#2563eb',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pad(timeLeft.seconds)}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#2563eb',
                textTransform: 'uppercase',
                marginTop: 4,
                letterSpacing: 0.5,
              }}
            >
              Giây
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Compact Mode (Dành cho Trang Chủ Public View) ─────────────────────────
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(37, 99, 235, 0.08)',
        border: '1px solid rgba(37, 99, 235, 0.25)',
        padding: '6px 14px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 700,
        color: '#1e40af',
        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
      }}
    >
      <IconClock size={14} color="var(--accent-primary)" />
      <span>Bắt đầu sau:</span>
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 800,
          color: '#2563eb',
        }}
      >
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  );
}
