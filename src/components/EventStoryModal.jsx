import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { getEventStatusInfo } from '../contexts/EventContext';
import {
  IconDownload,
  IconCopy,
  IconCheck,
  IconX,
  IconCrown,
  IconUsers,
  IconCheckCircle,
  IconCalendar,
  IconMapPin,
  IconChart,
  IconZap,
  IconCamera,
  IconSparkles,
} from './common/CustomIcons';

export default function EventStoryModal({ isOpen, onClose, event }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('tech'); // 'tech' | 'luxury' | 'modern'
  const [badgeType, setBadgeType] = useState('auto'); // 'auto' | 'ended' | 'recap' | 'live' | 'upcoming'
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !event || !supabase) return;

    let isMounted = true;
    async function fetchEventDetails() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('attendees')
          .select('*, checkin_logs(checked_in_at)')
          .eq('event_id', event.id);

        if (isMounted) {
          setAttendees(data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch attendees for story:', err);
        if (isMounted) setLoading(false);
      }
    }

    fetchEventDetails();
    return () => { isMounted = false; };
  }, [isOpen, event?.id]);

  // Statistics calculation
  const total = attendees.length;
  const checkedIn = attendees.filter(a => a.status === 'checked_in').length;
  const pending = total - checkedIn;
  const vipTotal = attendees.filter(a => a.is_vip).length;
  const vipCheckedIn = attendees.filter(a => a.is_vip && a.status === 'checked_in').length;
  const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // Peak checkin time calculation
  const checkinTimes = attendees
    .filter(a => a.checkin_logs?.[0]?.checked_in_at)
    .map(a => new Date(a.checkin_logs[0].checked_in_at).getTime())
    .sort((a, b) => a - b);

  let firstCheckinStr = '—';
  let lastCheckinStr = '—';
  if (checkinTimes.length > 0) {
    firstCheckinStr = new Date(checkinTimes[0]).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    lastCheckinStr = new Date(checkinTimes[checkinTimes.length - 1]).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  const statusInfo = getEventStatusInfo(event);

  // Draw the 9:16 Canvas (1080 x 1920)
  const drawStoryCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !event) return;

    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1920;
    canvas.width = width;
    canvas.height = height;

    // Theme palettes
    const themes = {
      tech: {
        bgStart: '#090d16',
        bgEnd: '#0f172a',
        accent: '#3b82f6',
        accentSecondary: '#10b981',
        accentGlow: 'rgba(59, 130, 246, 0.4)',
        cardBg: 'rgba(30, 41, 59, 0.7)',
        cardBorder: 'rgba(59, 130, 246, 0.25)',
        textColor: '#f8fafc',
        mutedText: '#94a3b8',
        tagBg: 'rgba(16, 185, 129, 0.2)',
        tagText: '#34d399',
        tagBorder: 'rgba(16, 185, 129, 0.4)',
      },
      luxury: {
        bgStart: '#0f0c08',
        bgEnd: '#1c160c',
        accent: '#f59e0b',
        accentSecondary: '#fbbf24',
        accentGlow: 'rgba(245, 158, 11, 0.4)',
        cardBg: 'rgba(40, 30, 15, 0.75)',
        cardBorder: 'rgba(245, 158, 11, 0.3)',
        textColor: '#fffbeb',
        mutedText: '#d97706',
        tagBg: 'rgba(245, 158, 11, 0.2)',
        tagText: '#fbbf24',
        tagBorder: 'rgba(245, 158, 11, 0.5)',
      },
      modern: {
        bgStart: '#0b0f19',
        bgEnd: '#1e1035',
        accent: '#8b5cf6',
        accentSecondary: '#ec4899',
        accentGlow: 'rgba(139, 92, 246, 0.4)',
        cardBg: 'rgba(35, 20, 60, 0.7)',
        cardBorder: 'rgba(139, 92, 246, 0.3)',
        textColor: '#faf5ff',
        mutedText: '#c084fc',
        tagBg: 'rgba(236, 72, 153, 0.2)',
        tagText: '#f472b6',
        tagBorder: 'rgba(236, 72, 153, 0.4)',
      },
    };

    const cur = themes[theme] || themes.tech;

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, cur.bgStart);
    bgGrad.addColorStop(0.5, cur.bgEnd);
    bgGrad.addColorStop(1, '#05070d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Glow Orbs
    const glow1 = ctx.createRadialGradient(200, 300, 20, 200, 300, 500);
    glow1.addColorStop(0, cur.accentGlow);
    glow1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(880, 1400, 20, 880, 1400, 600);
    glow2.addColorStop(0, cur.accentGlow);
    glow2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid/tech lines in background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 60; x < width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 60; y < height; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Helper: Rounded Rect
    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // 2. Header: Logo & Branding Pill
    const headerY = 120;
    roundRect(80, headerY, 920, 100, 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Brand title
    ctx.fillStyle = cur.textColor;
    ctx.font = '900 32px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NITEK CHECKIN', 120, headerY + 62);

    // Tag badge inside header
    roundRect(680, headerY + 24, 290, 52, 26);
    ctx.fillStyle = cur.tagBg;
    ctx.fill();
    ctx.strokeStyle = cur.tagBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = cur.tagText;
    ctx.font = '800 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EVENT RECAP STORY', 825, headerY + 57);

    // 3. Event Title & Date Location Banner
    const bannerY = 270;
    roundRect(80, bannerY, 920, 360, 36);
    const bannerGrad = ctx.createLinearGradient(80, bannerY, 1000, bannerY + 360);
    bannerGrad.addColorStop(0, cur.cardBg);
    bannerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
    ctx.fillStyle = bannerGrad;
    ctx.fill();
    ctx.strokeStyle = cur.cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Status Pill
    let effectiveBadge = badgeType;
    if (effectiveBadge === 'auto') {
      if (checkedIn > 0 || statusInfo.isCompleted) {
        effectiveBadge = 'ended';
      } else if (statusInfo.isOngoing) {
        effectiveBadge = 'live';
      } else {
        effectiveBadge = 'upcoming';
      }
    }

    let storyBadgeText = 'ĐÃ DIỄN RA';
    let storyBadgeBg = 'rgba(16, 185, 129, 0.2)';
    let storyBadgeBorder = 'rgba(16, 185, 129, 0.4)';
    let storyBadgeColor = '#34d399';

    if (effectiveBadge === 'ended') {
      storyBadgeText = 'ĐÃ DIỄN RA';
      storyBadgeBg = 'rgba(16, 185, 129, 0.2)';
      storyBadgeBorder = 'rgba(16, 185, 129, 0.4)';
      storyBadgeColor = '#34d399';
    } else if (effectiveBadge === 'recap') {
      storyBadgeText = 'TỔNG KẾT SỰ KIỆN';
      storyBadgeBg = 'rgba(139, 92, 246, 0.2)';
      storyBadgeBorder = 'rgba(139, 92, 246, 0.4)';
      storyBadgeColor = '#c084fc';
    } else if (effectiveBadge === 'live') {
      storyBadgeText = 'ĐANG DIỄN RA (LIVE)';
      storyBadgeBg = 'rgba(239, 68, 68, 0.2)';
      storyBadgeBorder = 'rgba(239, 68, 68, 0.4)';
      storyBadgeColor = '#f87171';
    } else if (effectiveBadge === 'upcoming') {
      storyBadgeText = 'SẮP DIỄN RA';
      storyBadgeBg = 'rgba(59, 130, 246, 0.2)';
      storyBadgeBorder = 'rgba(59, 130, 246, 0.4)';
      storyBadgeColor = '#60a5fa';
    }

    ctx.font = '800 18px Inter, sans-serif';
    const textWidth = ctx.measureText(storyBadgeText).width;
    const pillWidth = Math.max(180, textWidth + 44);

    roundRect(130, bannerY + 40, pillWidth, 48, 24);
    ctx.fillStyle = storyBadgeBg;
    ctx.fill();
    ctx.strokeStyle = storyBadgeBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = storyBadgeColor;
    ctx.textAlign = 'center';
    ctx.fillText(storyBadgeText, 130 + pillWidth / 2, bannerY + 71);

    // Event Name (Word wrap)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px Inter, sans-serif';
    ctx.textAlign = 'left';

    const words = (event.name || 'Sự Kiện').split(' ');
    let line = '';
    let currentY = bannerY + 155;
    const maxWidth = 820;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), 130, currentY);
        line = words[n] + ' ';
        currentY += 60;
        if (currentY > bannerY + 225) break; // Limit to 2 lines
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), 130, currentY);

    // Date & Location Info
    const dateStr = event.event_date ? new Date(event.event_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Thời gian diễn ra';
    const locStr = event.location ? `${event.location}` : 'Địa điểm sự kiện';

    ctx.fillStyle = cur.mutedText;
    ctx.font = '600 22px Inter, sans-serif';
    ctx.fillText(`Thời gian: ${dateStr}`, 130, bannerY + 300);
    ctx.fillText(`Địa điểm: ${locStr}`, 130, bannerY + 335);

    // 4. Highlight Stat (Hero Check-in Rate Card)
    const heroY = 670;
    roundRect(80, heroY, 920, 320, 36);
    const heroGrad = ctx.createLinearGradient(80, heroY, 1000, heroY + 320);
    heroGrad.addColorStop(0, 'rgba(30, 41, 59, 0.85)');
    heroGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
    ctx.fillStyle = heroGrad;
    ctx.fill();
    ctx.strokeStyle = cur.accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Rate percentage big number
    ctx.fillStyle = '#10b981';
    ctx.font = '900 110px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${rate}%`, 130, heroY + 155);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 32px Inter, sans-serif';
    ctx.fillText(`${rate}% KHÁCH MỜI THAM GIA SỰ KIỆN`, 130, heroY + 215);

    ctx.fillStyle = cur.mutedText;
    ctx.font = '600 24px Inter, sans-serif';
    ctx.fillText(`Đã đón tiếp thành công ${checkedIn} / ${total} khách mời tham gia sự kiện`, 130, heroY + 260);

    // Glow progress bar track
    const barX = 130;
    const barY = heroY + 285;
    const barW = 820;
    const barH = 14;

    roundRect(barX, barY, barW, barH, 7);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    const fillW = Math.max(14, (barW * rate) / 100);
    roundRect(barX, barY, fillW, barH, 7);
    const barFillGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
    barFillGrad.addColorStop(0, '#10b981');
    barFillGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = barFillGrad;
    ctx.fill();

    // 5. 2x2 Detail Stats Grid
    const gridY = 1030;
    const colW = 440;
    const rowH = 200;
    const gap = 40;

    const cards = [
      {
        x: 80,
        y: gridY,
        code: '01',
        val: `${total}`,
        unit: 'khách mời',
        label: 'TỔNG QUY MÔ',
        color: cur.accent,
      },
      {
        x: 80 + colW + gap,
        y: gridY,
        code: '02',
        val: `${checkedIn}`,
        unit: 'đã check-in',
        label: 'KHÁCH THAM DỰ',
        color: '#10b981',
      },
      {
        x: 80,
        y: gridY + rowH + gap,
        code: '03',
        val: `${vipCheckedIn} / ${vipTotal}`,
        unit: 'đã có mặt',
        label: 'KHÁCH MỜI VIP',
        color: '#fbbf24',
      },
      {
        x: 80 + colW + gap,
        y: gridY + rowH + gap,
        code: '04',
        val: `${firstCheckinStr} - ${lastCheckinStr}`,
        unit: 'khung giờ đón tiếp',
        label: 'THỜI GIAN CHECK-IN',
        color: '#a855f7',
      },
    ];

    cards.forEach(c => {
      roundRect(c.x, c.y, colW, rowH, 28);
      ctx.fillStyle = cur.cardBg;
      ctx.fill();
      ctx.strokeStyle = cur.cardBorder;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Number badge
      roundRect(c.x + 30, c.y + 35, 40, 28, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.fillStyle = c.color;
      ctx.font = '800 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.code, c.x + 50, c.y + 54);

      ctx.fillStyle = cur.mutedText;
      ctx.font = '800 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(c.label, c.x + 85, c.y + 55);

      ctx.fillStyle = c.color;
      ctx.font = '900 44px Inter, sans-serif';
      ctx.fillText(c.val, c.x + 30, c.y + 130);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 18px Inter, sans-serif';
      ctx.fillText(c.unit, c.x + 30, c.y + 165);
    });

    // 6. Club Contact Information Card
    const contactY = 1490;
    const contactH = 230;
    roundRect(80, contactY, 920, contactH, 24);
    const contactGrad = ctx.createLinearGradient(80, contactY, 1000, contactY + contactH);
    contactGrad.addColorStop(0, 'rgba(30, 41, 59, 0.7)');
    contactGrad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
    ctx.fillStyle = contactGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Contact Header Badge
    roundRect(110, contactY + 24, 210, 34, 17);
    ctx.fillStyle = 'rgba(79, 156, 249, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(79, 156, 249, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = cur.accent;
    ctx.font = '800 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THÔNG TIN LIÊN HỆ', 215, contactY + 46);

    // Contact Details List
    ctx.textAlign = 'left';
    
    // Row 1: Fanpage
    ctx.fillStyle = cur.mutedText;
    ctx.font = '600 17px Inter, sans-serif';
    ctx.fillText('Fanpage:', 115, contactY + 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillText('NITEK - Câu Lạc Bộ Robotics & IoT', 220, contactY + 92);

    // Row 2: Gmail
    ctx.fillStyle = cur.mutedText;
    ctx.font = '600 17px Inter, sans-serif';
    ctx.fillText('Gmail:', 115, contactY + 137);
    ctx.fillStyle = cur.accent;
    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillText('nitekclub@gmail.com', 195, contactY + 137);

    // Row 3: Phone
    ctx.fillStyle = cur.mutedText;
    ctx.font = '600 17px Inter, sans-serif';
    ctx.fillText('Hotline / Zalo:', 115, contactY + 182);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 18px Inter, sans-serif';
    ctx.fillText('(+84) 387151672', 260, contactY + 182);
    ctx.fillStyle = cur.mutedText;
    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillText('— Hoàng Minh (Chủ nhiệm CLB)', 445, contactY + 182);

    // 7. Footer Branding & Watermark
    const footerY = 1765;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '600 17px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NITEK Robotics & IoT • THPT Nguyễn Huệ', 540, footerY + 25);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(`Báo cáo tổng kết sự kiện xuất tự động • ${new Date().toLocaleDateString('vi-VN')}`, 540, footerY + 60);
  };

  useEffect(() => {
    if (!loading && attendees) {
      drawStoryCanvas();
    }
  }, [loading, attendees, theme, badgeType, event]);

  if (!isOpen || !event) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setDownloading(true);
    try {
      const imgData = canvas.toDataURL('image/png', 1.0);
      const a = document.createElement('a');
      const cleanName = (event.name || 'SuKien').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
      a.download = `Story_9x16_TongKet_${cleanName}.png`;
      a.href = imgData;
      a.click();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } else {
          handleDownload();
        }
      });
    } catch (err) {
      console.error('Copy error, falling back to download:', err);
      handleDownload();
    }
  };

  if (!isOpen || !event) return null;
  if (typeof document === 'undefined') return null;

  const activeBadgeKey = badgeType === 'auto'
    ? (checkedIn > 0 || statusInfo.isCompleted ? 'ended' : (statusInfo.isOngoing ? 'live' : 'upcoming'))
    : badgeType;

  return createPortal(
    <div
      className="modal-overlay modal-large"
      onClick={onClose}
    >
      <div
        className="modal-card modal-large-card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 920,
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              <IconCamera size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Ảnh Tổng Quan Story 9:16 Marketing
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Xuất ảnh định dạng dọc (1080x1920) tối ưu đăng Facebook / Instagram Story & TikTok
              </p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: '50%', padding: 0 }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: 24,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: 24,
          alignItems: 'start',
        }}>
          {/* Left Column: Canvas Preview (scaled down smoothly to 9:16) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: 320,
              aspectRatio: '9/16',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              border: '2px solid rgba(255,255,255,0.12)',
              position: 'relative',
              background: '#000',
            }}>
              {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 10 }}>
                  <span className="loading-spinner" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Chuẩn tỷ lệ Story 9:16 (1080 x 1920 px HD)
            </div>
          </div>

          {/* Right Column: Controls & Stats Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status Badge Selector */}
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Nhãn Trạng Thái Trên Ảnh:</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {badgeType === 'auto' ? '(Tự động nhận diện)' : '(Tùy chọn)'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${activeBadgeKey === 'ended' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setBadgeType('ended')}
                  style={{
                    fontSize: 12, padding: '7px 8px',
                    borderColor: activeBadgeKey === 'ended' ? '#10b981' : void 0,
                    color: activeBadgeKey === 'ended' ? '#34d399' : void 0,
                    fontWeight: 700,
                  }}
                >
                  ✓ Đã Diễn Ra
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeBadgeKey === 'recap' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setBadgeType('recap')}
                  style={{
                    fontSize: 12, padding: '7px 8px',
                    borderColor: activeBadgeKey === 'recap' ? '#a855f7' : void 0,
                    color: activeBadgeKey === 'recap' ? '#c084fc' : void 0,
                    fontWeight: 700,
                  }}
                >
                  📊 Tổng Kết Sự Kiện
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeBadgeKey === 'live' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setBadgeType('live')}
                  style={{
                    fontSize: 12, padding: '7px 8px',
                    borderColor: activeBadgeKey === 'live' ? '#ef4444' : void 0,
                    color: activeBadgeKey === 'live' ? '#f87171' : void 0,
                    fontWeight: 700,
                  }}
                >
                  🔴 Đang Diễn Ra (Live)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeBadgeKey === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setBadgeType('upcoming')}
                  style={{
                    fontSize: 12, padding: '7px 8px',
                    borderColor: activeBadgeKey === 'upcoming' ? '#3b82f6' : void 0,
                    color: activeBadgeKey === 'upcoming' ? '#60a5fa' : void 0,
                    fontWeight: 700,
                  }}
                >
                  ⏳ Sắp Diễn Ra
                </button>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Chọn Phong Cách Thiết Kế:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${theme === 'tech' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTheme('tech')}
                  style={{ fontSize: 12, padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                >
                  <IconZap size={18} />
                  Cyber Tech
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${theme === 'luxury' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTheme('luxury')}
                  style={{
                    fontSize: 12, padding: '8px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    borderColor: theme === 'luxury' ? '#f59e0b' : void 0,
                    color: theme === 'luxury' ? '#fbbf24' : void 0,
                  }}
                >
                  <IconCrown size={18} />
                  Luxury Gold
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${theme === 'modern' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTheme('modern')}
                  style={{
                    fontSize: 12, padding: '8px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    borderColor: theme === 'modern' ? '#c084fc' : void 0,
                    color: theme === 'modern' ? '#c084fc' : void 0,
                  }}
                >
                  <IconSparkles size={18} />
                  Neon Purple
                </button>
              </div>
            </div>

            {/* Quick Stats Summary Card */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconChart size={15} color="var(--accent-primary)" />
                Thông Số Tự Động Nạp Vào Ảnh:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tên Sự Kiện</div>
                  <strong style={{ color: 'var(--text-primary)' }}>{event.name}</strong>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tỷ Lệ Check-in</div>
                  <strong style={{ color: '#10b981', fontSize: 15 }}>{rate}% ({checkedIn}/{total})</strong>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Khách VIP</div>
                  <strong style={{ color: '#fbbf24' }}>{vipCheckedIn} / {vipTotal} có mặt</strong>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Thời gian Check-in</div>
                  <strong style={{ color: 'var(--text-primary)' }}>{firstCheckinStr} - {lastCheckinStr}</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                id="btn-download-story-image"
                className="btn btn-primary btn-lg"
                onClick={handleDownload}
                disabled={loading || downloading}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  fontWeight: 800,
                  padding: '14px 20px',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                }}
              >
                <IconDownload size={20} />
                {downloading ? 'Đang xuất ảnh...' : 'Tải Ảnh Story 9:16 (1080x1920 HD)'}
              </button>

              <button
                type="button"
                id="btn-copy-story-image"
                className="btn btn-secondary"
                onClick={handleCopy}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 600,
                }}
              >
                {copied ? (
                  <>
                    <IconCheck size={16} color="#10b981" />
                    <span style={{ color: '#10b981' }}>Đã sao chép ảnh vào Clipboard!</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={16} />
                    Sao chép ảnh vào Clipboard
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
