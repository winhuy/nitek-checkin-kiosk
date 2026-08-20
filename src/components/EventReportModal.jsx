import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { cleanEventDescription } from '../contexts/EventContext';
import { copyToClipboard } from '../lib/clipboard';
import {
  IconReport,
  IconUsers,
  IconCheckCircle,
  IconClock,
  IconCrown,
  IconSearch,
  IconFileSpreadsheet,
  IconCamera,
  IconCalendar,
  IconMapPin,
  IconX,
  IconCheck,
  IconBuilding,
  IconFolder,
  IconDot,
  IconCopy,
} from './common/CustomIcons';

export default function EventReportModal({ isOpen, onClose, event, onOpenStory }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'checked_in' | 'pending' | 'vip'
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (!isOpen || !event || !supabase) return;

    let isMounted = true;
    async function fetchEventAttendees() {
      setLoading(true);
      try {
        let { data, error } = await supabase
          .from('attendees')
          .select('*, checkin_logs(checked_in_at, operator_name)')
          .eq('event_id', event.id)
          .order('created_at', { ascending: true });

        if (error) {
          const fallbackRes = await supabase
            .from('attendees')
            .select('*')
            .eq('event_id', event.id)
            .order('created_at', { ascending: true });
          data = fallbackRes.data;
        }

        if (isMounted) {
          setAttendees(data || []);
        }
      } catch (err) {
        console.error('Error fetching event attendees for report:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchEventAttendees();
    return () => { isMounted = false; };
  }, [isOpen, event?.id]);

  // Statistics calculation
  const total = attendees.length;
  const checkedInList = attendees.filter(a => a.status === 'checked_in');
  const checkedIn = checkedInList.length;
  const pending = total - checkedIn;
  const vipList = attendees.filter(a => a.role === 'VIP' || a.is_vip);
  const vipCount = vipList.length;
  const vipCheckedIn = vipList.filter(a => a.status === 'checked_in').length;
  const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // Filtered attendees for the table
  const filtered = useMemo(() => {
    let list = attendees;
    if (filterTab === 'checked_in') {
      list = list.filter(a => a.status === 'checked_in');
    } else if (filterTab === 'pending') {
      list = list.filter(a => a.status !== 'checked_in');
    } else if (filterTab === 'vip') {
      list = list.filter(a => a.role === 'VIP' || a.is_vip);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.full_name?.toLowerCase().includes(q) ||
        a.ticket_code?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.company?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [attendees, filterTab, search]);

  const handleCopyTicket = (code) => {
    copyToClipboard(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Export Excel
  const handleExportExcel = () => {
    if (!event || attendees.length === 0) return;

    const eventDateStr = event.event_date ? new Date(event.event_date).toLocaleDateString('vi-VN') : 'Khong_Xac_Dinh';
    
    // Sheet 1: Summary KPI
    const summaryData = [
      { 'CHỈ SỐ BÁO CÁO': 'Tên sự kiện', 'GIÁ TRỊ': event.name },
      { 'CHỈ SỐ BÁO CÁO': 'Địa điểm', 'GIÁ TRỊ': event.location || '—' },
      { 'CHỈ SỐ BÁO CÁO': 'Thời gian diễn ra', 'GIÁ TRỊ': event.event_date ? new Date(event.event_date).toLocaleString('vi-VN') : '—' },
      { 'CHỈ SỐ BÁO CÁO': 'Tổng khách mời đăng ký', 'GIÁ TRỊ': total },
      { 'CHỈ SỐ BÁO CÁO': 'Số lượng đã check-in', 'GIÁ TRỊ': checkedIn },
      { 'CHỈ SỐ BÁO CÁO': 'Số lượng chưa đến', 'GIÁ TRỊ': pending },
      { 'CHỈ SỐ BÁO CÁO': 'Tỷ lệ tham gia thực tế', 'GIÁ TRỊ': `${rate}%` },
      { 'CHỈ SỐ BÁO CÁO': 'Khách VIP đã check-in', 'GIÁ TRỊ': `${vipCheckedIn} / ${vipCount}` },
      { 'CHỈ SỐ BÁO CÁO': 'Thời gian xuất báo cáo', 'GIÁ TRỊ': new Date().toLocaleString('vi-VN') },
    ];

    // Sheet 2: Detailed attendees
    const detailData = attendees.map((a, idx) => {
      const checkinTime = a.checkin_logs?.[0]?.checked_in_at || (a.status === 'checked_in' ? a.updated_at : null);
      return {
        'STT': idx + 1,
        'Mã Vé': a.ticket_code,
        'Họ và Tên': a.full_name,
        'Hạng Khách': a.role === 'VIP' || a.is_vip ? 'Khách VIP' : 'Khách Thường',
        'Công Ty / Đơn Vị': a.company || '—',
        'Số Điện Thoại': a.phone || '—',
        'Email': a.email || '—',
        'Trạng Thái Check-in': a.status === 'checked_in' ? 'ĐÃ CHECK-IN' : 'CHƯA ĐẾN',
        'Thời Gian Check-in': checkinTime ? new Date(checkinTime).toLocaleString('vi-VN') : '—',
        'Ghi Chú': a.notes || '',
      };
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsDetail = XLSX.utils.json_to_sheet(detailData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'TongQuanBaoCao');
    XLSX.utils.book_append_sheet(wb, wsDetail, 'DanhSachKhachMoi');

    const cleanName = (event.name || 'SuKien').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
    XLSX.writeFile(wb, `Bao_Cao_Chi_Tiet_${cleanName}_${eventDateStr.replace(/\//g, '-')}.xlsx`);
  };

  if (!isOpen || !event) return null;
  if (typeof document === 'undefined') return null;

  const desc = cleanEventDescription(event.description);

  return createPortal(
    <div
      id="event-report-modal-overlay"
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10005,
        background: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        animation: 'fadeIn 0.2s ease',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        id="event-report-modal-card"
        style={{
          background: 'var(--bg-card, #111827)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
          borderRadius: '16px',
          width: 'min(1180px, 95vw)',
          maxWidth: '1180px',
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s ease',
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 100%)',
          gap: 16,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
            }}>
              <IconReport size={22} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{
                  fontSize: 18,
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--text-primary, #f9fafb)',
                  letterSpacing: '-0.3px',
                }}>
                  Báo Cáo Chi Tiết: {event.name}
                </h2>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 12,
                  background: 'rgba(168, 85, 247, 0.16)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                }}>
                  <IconFolder size={12} /> ĐÃ LƯU TRỮ
                </span>
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--text-muted, #9ca3af)',
                marginTop: 4,
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                {event.location && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <IconMapPin size={13} color="var(--accent-primary, #60a5fa)" /> {event.location}
                  </span>
                )}
                {event.event_date && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <IconCalendar size={13} color="var(--accent-primary, #60a5fa)" /> {new Date(event.event_date).toLocaleString('vi-VN')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              id="btn-report-export-excel"
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportExcel}
              disabled={loading || attendees.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                fontSize: 12,
                padding: '7px 12px',
                borderRadius: '8px',
              }}
              title="Tải về file Excel danh sách và chỉ số"
            >
              <IconFileSpreadsheet size={15} color="#10b981" /> Xuất Excel
            </button>

            {onOpenStory && (
              <button
                id="btn-report-open-story"
                type="button"
                className="btn btn-sm"
                onClick={() => { onClose(); onOpenStory(event); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '7px 14px',
                  borderRadius: '8px',
                  boxShadow: '0 3px 12px rgba(236,72,153,0.35)',
                }}
                title="Tạo ảnh tổng quan 9:16 chạy Marketing"
              >
                <IconCamera size={14} /> Story 9:16
              </button>
            )}

            <button
              id="btn-close-event-report"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body with vertical scroll */}
        <div
          id="event-report-modal-body"
          style={{
            padding: '22px 26px 30px',
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {desc && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: 13,
              color: 'var(--text-secondary, #cbd5e1)',
              lineHeight: 1.5,
              flexShrink: 0,
            }}>
              <strong style={{ color: 'var(--text-primary, #f9fafb)' }}>Mô tả sự kiện:</strong> {desc}
            </div>
          )}

          {/* KPI Cards: 4 columns taking 100% full width */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            width: '100%',
            flexShrink: 0,
          }}>
            {/* 1. Total */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(59,130,246,0.09) 0%, rgba(59,130,246,0.02) 100%)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tổng Khách Mời
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconUsers size={16} color="#60a5fa" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary, #fff)', lineHeight: 1.1 }}>
                  {total}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', marginTop: 4 }}>
                  Đã đăng ký tham dự
                </div>
              </div>
            </div>

            {/* 2. Checked In */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(16,185,129,0.09) 0%, rgba(16,185,129,0.02) 100%)',
              border: '1px solid rgba(16,185,129,0.28)',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Đã Check-in
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconCheckCircle size={16} color="#10b981" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981', lineHeight: 1.1 }}>
                  {checkedIn} <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-muted, #94a3b8)' }}>({rate}%)</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', marginTop: 4 }}>
                  Khách đã có mặt tại sự kiện
                </div>
              </div>
            </div>

            {/* 3. Pending */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(245,158,11,0.09) 0%, rgba(245,158,11,0.02) 100%)',
              border: '1px solid rgba(245,158,11,0.28)',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Chưa Đến / Vắng
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconClock size={16} color="#f59e0b" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#f59e0b', lineHeight: 1.1 }}>
                  {pending}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', marginTop: 4 }}>
                  Chưa quét mã QR điểm danh
                </div>
              </div>
            </div>

            {/* 4. VIP */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(234,179,8,0.09) 0%, rgba(234,179,8,0.02) 100%)',
              border: '1px solid rgba(234,179,8,0.28)',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Khách VIP
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconCrown size={16} color="#fbbf24" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#fbbf24', lineHeight: 1.1 }}>
                  {vipCheckedIn} / {vipCount}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', marginTop: 4 }}>
                  Tỷ lệ VIP: {vipCount > 0 ? Math.round((vipCheckedIn / vipCount) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            width: '100%',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { key: 'all', label: `Tất cả (${total})` },
                { key: 'checked_in', label: `Đã check-in (${checkedIn})` },
                { key: 'pending', label: `Chưa đến (${pending})` },
                { key: 'vip', label: `Khách VIP (${vipCount})` },
              ].map(t => {
                const isActive = filterTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilterTab(t.key)}
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 500,
                      padding: '7px 14px',
                      borderRadius: '8px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
              <input
                className="form-input"
                placeholder="Tìm tên, mã vé, SĐT, đơn vị..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 36,
                  paddingRight: 12,
                  fontSize: 12,
                  height: 38,
                  borderRadius: '8px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.6,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}>
                <IconSearch size={14} />
              </div>
            </div>
          </div>

          {/* Attendee Details Table Container */}
          <div style={{ flex: 1, minHeight: 180, width: '100%' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <span className="loading-spinner" />
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 10 }}>Đang tải danh sách báo cáo…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
              }}>
                Không tìm thấy khách mời nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div style={{
                overflowX: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                background: 'var(--bg-card)',
                width: '100%',
              }}>
                <table className="data-table" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ width: 44, textAlign: 'center', padding: '12px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>STT</th>
                      <th style={{ minWidth: 120, padding: '12px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>MÃ VÉ</th>
                      <th style={{ minWidth: 200, padding: '12px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>HỌ VÀ TÊN</th>
                      <th style={{ minWidth: 140, padding: '12px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ĐƠN VỊ / CÔNG TY</th>
                      <th style={{ width: 110, padding: '12px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>PHÂN LOẠI</th>
                      <th style={{ minWidth: 210, padding: '12px 14px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>TRẠNG THÁI & THỜI GIAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, idx) => {
                      const isChecked = a.status === 'checked_in';
                      const isVip = a.role === 'VIP' || a.is_vip;
                      const checkinTime = a.checkin_logs?.[0]?.checked_in_at || (isChecked ? a.updated_at : null);
                      const isCopied = copiedCode === a.ticket_code;

                      return (
                        <tr
                          key={a.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', padding: '12px 10px' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <div
                              onClick={() => handleCopyTicket(a.ticket_code)}
                              title="Click để copy mã vé"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: isCopied ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.12)',
                                color: isCopied ? '#34d399' : 'var(--accent-primary, #60a5fa)',
                                border: `1px solid ${isCopied ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.3)'}`,
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontFamily: 'monospace, var(--font-mono, monospace)',
                                fontWeight: 700,
                                fontSize: 12,
                                letterSpacing: '0.5px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                wordBreak: 'keep-all',
                                userSelect: 'all',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span>{a.ticket_code}</span>
                              {isCopied ? <IconCheck size={12} /> : <IconCopy size={11} style={{ opacity: 0.6 }} />}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary, #f9fafb)', fontSize: 13 }}>
                              {a.full_name}
                            </div>
                            {(a.email || a.phone) && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                                {a.phone} {a.phone && a.email ? '• ' : ''}{a.email}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {a.company ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary, #cbd5e1)' }}>
                                <IconBuilding size={13} color="var(--text-muted, #94a3b8)" /> {a.company}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted, #64748b)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            {isVip ? (
                              <span style={{
                                background: 'rgba(234,179,8,0.15)',
                                color: '#fbbf24',
                                border: '1px solid rgba(234,179,8,0.35)',
                                padding: '3px 9px',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                <IconCrown size={12} color="#fbbf24" /> VIP
                              </span>
                            ) : (
                              <span style={{
                                color: 'var(--text-muted, #94a3b8)',
                                fontSize: 12,
                                padding: '3px 8px',
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.03)',
                              }}>
                                Thường
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            {isChecked ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{
                                  color: '#10b981',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}>
                                  <IconDot size={8} color="#10b981" /> ĐÃ CHECK-IN
                                </span>
                                {checkinTime && (
                                  <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <IconClock size={11} /> {new Date(checkinTime).toLocaleTimeString('vi-VN')} • {new Date(checkinTime).toLocaleDateString('vi-VN')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{
                                color: '#f59e0b',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 8,
                                background: 'rgba(245,158,11,0.1)',
                                border: '1px solid rgba(245,158,11,0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                <IconDot size={6} color="#f59e0b" /> Chưa đến
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
