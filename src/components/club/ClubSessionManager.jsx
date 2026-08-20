import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { useClub, RECURRENCE_OPTIONS } from '../../contexts/ClubContext';
import { copyToClipboard } from '../../lib/clipboard';
import ClubSessionModal from './ClubSessionModal';
import {
  IconSettings,
  IconRocket,
  IconFileText,
  IconAlertTriangle,
  IconInfo,
  IconMail,
  IconUser,
  IconZap,
  IconX,
  IconEdit,
  IconReport,
  IconRepeat,
  IconCheck,
  IconSparkles,
  IconDot,
  IconPin,
  IconStar,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPlus,
  IconTrash,
  IconSave,
  IconLock,
  IconCopy,
} from '../common/CustomIcons';

function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Session Attendance Detail Modal ─────────────────────────────────────
function SessionDetailModal({ session, onClose }) {
  const { members, markAbsence, reviewAbsenceRequest, fetchAttendanceForSession, markOnTime } = useClub();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [modalTab, setModalTab] = useState('all'); // 'all' | 'present' | 'excused' | 'unexcused'
  const [editingExcuseMember, setEditingExcuseMember] = useState(null);
  const [excuseNotes, setExcuseNotes] = useState('');
  const [submittingExcuse, setSubmittingExcuse] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchAttendanceForSession(session.id);
    setRecords(data || []);
    setLoading(false);
  }, [session.id, fetchAttendanceForSession]);

  // Correct: useEffect for side effects on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // Combine full members list with records status
  const fullStatusList = members.map(m => {
    // Use member_id directly — fetchAttendanceForSession already provides it
    const rec = records.find(r => r.member_id === m.id);
    let statusKey = 'unexcused';
    let statusLabel = 'Vắng không phép';
    let checkinTime = null;
    let lateMinutes = 0;
    let photoData = null;
    let notes = rec?.notes || null;

    if (rec) {
      if (rec.checkin_status === 'on_time') {
        statusKey = 'on_time';
        statusLabel = 'Đúng giờ';
        checkinTime = rec.checked_in_at ? new Date(rec.checked_in_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null;
        photoData = rec.face_photo_data;
      } else if (rec.checkin_status === 'late') {
        statusKey = 'late';
        statusLabel = `Đến trễ (+${rec.late_minutes || 0}m)`;
        checkinTime = rec.checked_in_at ? new Date(rec.checked_in_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null;
        lateMinutes = rec.late_minutes || 0;
        photoData = rec.face_photo_data;
      } else if (rec.checkin_status === 'excused') {
        statusKey = 'excused';
        statusLabel = 'Vắng có phép';
      } else if (rec.checkin_status === 'unexcused') {
        statusKey = 'unexcused';
        statusLabel = 'Vắng không phép';
      } else if (rec.checkin_status === 'pending_excuse') {
        statusKey = 'pending_excuse';
        statusLabel = 'Đơn xin vắng (Chờ duyệt)';
      } else if (rec.checked_in_at) {
        statusKey = 'on_time';
        statusLabel = 'Đúng giờ';
        checkinTime = new Date(rec.checked_in_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        photoData = rec.face_photo_data;
      }
    }

    return {
      member: m,
      record: rec,
      statusKey,
      statusLabel,
      checkinTime,
      lateMinutes,
      photoData,
      notes,
    };
  });

  const presentList = fullStatusList.filter(i => i.statusKey === 'on_time' || i.statusKey === 'late');
  const excusedList = fullStatusList.filter(i => i.statusKey === 'excused');
  const unexcusedList = fullStatusList.filter(i => i.statusKey === 'unexcused');
  const pendingList = fullStatusList.filter(i => i.statusKey === 'pending_excuse');

  const filteredDisplay = fullStatusList.filter(i => {
    if (modalTab === 'present') return i.statusKey === 'on_time' || i.statusKey === 'late';
    if (modalTab === 'excused') return i.statusKey === 'excused';
    if (modalTab === 'unexcused') return i.statusKey === 'unexcused';
    if (modalTab === 'pending') return i.statusKey === 'pending_excuse';
    return true;
  });

  // Handle Mark Absence / Excuse
  const handleSaveExcuse = async (e) => {
    e.preventDefault();
    if (!editingExcuseMember) return;

    setSubmittingExcuse(true);
    const { error } = await markAbsence({
      memberId: editingExcuseMember.id,
      sessionId: session.id,
      checkinStatus: 'excused',
      notes: excuseNotes,
    });
    setSubmittingExcuse(false);

    if (error) alert('Lỗi lưu vắng có phép: ' + error.message);
    else {
      setEditingExcuseMember(null);
      setExcuseNotes('');
      await load();
    }
  };

  const handleMarkUnexcused = async (m) => {
    if (!window.confirm(`Đánh dấu "${m.full_name}" là Vắng KHÔNG phép?`)) return;
    await markAbsence({
      memberId: m.id,
      sessionId: session.id,
      checkinStatus: 'unexcused',
      notes: null,
    });
    await load();
  };

  // Export session attendance report to Excel
  const exportSessionExcel = () => {
    const sessionDateStr = new Date(session.session_date || session.created_at).toLocaleDateString('vi-VN');

    const statusText = (key) => {
      if (key === 'on_time') return 'Co mat - Dung gio';
      if (key === 'late') return 'Co mat - Den tre';
      if (key === 'excused') return 'Vang co phep';
      return 'Vang khong phep';
    };

    const rows = fullStatusList.map((item, idx) => ({
      STT: idx + 1,
      'Ma Thanh Vien': item.member.member_code,
      'Ho va Ten': item.member.full_name,
      'Lop / Don Vi': item.member.class_name || '',
      'Trang Thai': statusText(item.statusKey),
      'Gio Diem Danh': item.checkinTime || '',
      'So Phut Tre': item.lateMinutes || 0,
      'Ly Do Vang': item.notes || '',
    }));

    const summaryRows = [
      { Parameter: 'Tên Buổi Sinh Hoạt', Value: session.title },
      { Parameter: 'Ngày Sinh Hoạt', Value: sessionDateStr },
      { Parameter: 'Giờ Quy Định', Value: session.start_time || '08:00' },
      { Parameter: 'Địa Điểm', Value: session.location || 'Phòng sinh hoạt CLB' },
      { Parameter: 'Tổng Số Thành Viên CLB', Value: members.length },
      { Parameter: 'Số Thành Viên Có Mặt', Value: presentList.length },
      { Parameter: 'Số Thành Viên Vắng Có Phép', Value: excusedList.length },
      { Parameter: 'Số Thành Viên Vắng Không Phép', Value: unexcusedList.length },
      { Parameter: 'Tỷ Lệ Tham Gia', Value: `${Math.round((presentList.length / (members.length || 1)) * 100)}%` },
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    const wsDetail = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'TongQuan');
    XLSX.utils.book_append_sheet(wb, wsDetail, 'DanhSachDiemDanh');

    const fileName = `Bao_Cao_Sinh_Hoat_${session.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_${sessionDateStr.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="session-detail-modal-overlay modal-overlay modal-large"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)', maxWidth: 920, width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(79,156,249,0.05)', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{session.title}</h2>
              {session.is_mandatory === false ? (
                <span style={{
                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.3)',
                  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }} title="Vắng mặt KHÔNG tính vắng, tham gia được +1 chuyên cần">
                  <IconStar size={12} color="#fbbf24" /> Tự nguyện (Không tính vắng)
                </span>
              ) : (
                <span style={{
                  background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
                  border: '1px solid rgba(124,58,237,0.25)',
                  padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <IconPin size={12} color="#a78bfa" /> Bắt buộc
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconCalendar size={13} /> Ngày: <strong>{new Date(session.session_date).toLocaleDateString('vi-VN')}</strong></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconClock size={13} /> Giờ: <strong>{session.start_time || '08:00'}</strong></span>
              {session.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconMapPin size={13} /> {session.location}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              id="btn-export-session-excel"
              className="btn btn-secondary btn-sm"
              onClick={exportSessionExcel}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IconFileText size={14} /> Xuất Excel Báo Cáo
            </button>
            <button
              id="btn-close-session-detail"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: '50%', padding: 0 }}
            ><IconX size={16} /></button>
          </div>
        </div>

        {/* Overview Stats Badges */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12, padding: '16px 24px', borderBottom: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconDot size={7} color="#10b981" /> Có Mặt</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{presentList.length}</div>
          </div>

          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconDot size={7} color="#f59e0b" /> Vắng Có Phép</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>{excusedList.length}</div>
          </div>

          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconDot size={7} color="#ef4444" /> Vắng Không Phép</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#ef4444' }}>{unexcusedList.length}</div>
          </div>

          <div style={{ background: 'rgba(79,156,249,0.1)', border: '1px solid rgba(79,156,249,0.3)', borderRadius: 'var(--radius-md)', padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconUser size={12} color="var(--accent-primary)" /> Tổng Thành Viên</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-primary)' }}>{members.length}</div>
          </div>
        </div>

        {/* Filter sub-tabs */}
        <div style={{ padding: '12px 24px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${modalTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setModalTab('all')}
          >
            Tất cả ({fullStatusList.length})
          </button>
          <button
            className={`btn btn-sm ${modalTab === 'present' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setModalTab('present')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconDot size={7} color="#10b981" /> Có mặt ({presentList.length})
          </button>
          <button
            className={`btn btn-sm ${modalTab === 'excused' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setModalTab('excused')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconDot size={7} color="#f59e0b" /> Vắng có phép ({excusedList.length})
          </button>
          <button
            className={`btn btn-sm ${modalTab === 'unexcused' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setModalTab('unexcused')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <IconDot size={7} color="#ef4444" /> Vắng không phép ({unexcusedList.length})
          </button>
          <button
            className={`btn btn-sm ${modalTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setModalTab('pending')}
            style={{
              borderColor: pendingList.length > 0 ? '#3b82f6' : undefined,
              background: pendingList.length > 0 ? 'rgba(59,130,246,0.2)' : undefined,
              color: pendingList.length > 0 ? '#60a5fa' : undefined,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <IconMail size={13} /> Đơn chờ duyệt ({pendingList.length})
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <span className="loading-spinner" />
            </div>
          ) : (
            <>
              {/* Photo grid for present members */}
              {modalTab !== 'excused' && modalTab !== 'unexcused' && presentList.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 12, marginBottom: 24,
                }}>
                  {presentList.map((item) => {
                    const member = item.member;

                    return (
                      <div
                        key={member.id}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: `1px solid ${item.statusKey === 'late' ? 'rgba(245,158,11,0.4)' : 'var(--border-color)'}`,
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          width: '100%', aspectRatio: '1/1',
                          background: item.statusKey === 'late'
                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                            : 'linear-gradient(135deg, #10b981, #059669)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 36, color: '#fff', fontWeight: 800,
                          boxShadow: item.statusKey === 'late' ? '0 4px 12px rgba(245,158,11,0.2)' : '0 4px 12px rgba(16,185,129,0.2)',
                        }}>
                          {(member?.full_name || '?').split(' ').pop().charAt(0)}
                        </div>
                        <div style={{ padding: '8px 8px 10px' }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            color: 'var(--text-primary)',
                          }}>{member?.full_name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                            {member?.member_code} {member?.class_name ? `• ${member.class_name}` : ''}
                          </div>

                          {item.statusKey === 'late' ? (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IconAlertTriangle size={11} color="#f59e0b" /> Trễ {item.lateMinutes}m ({item.checkinTime})
                              </div>
                              <button
                                type="button"
                                style={{
                                  marginTop: 4,
                                  background: 'rgba(16,185,129,0.15)',
                                  border: '1px solid rgba(16,185,129,0.3)',
                                  color: '#10b981',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  width: '100%',
                                  justifyContent: 'center',
                                }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (item.record?.id) {
                                    await markOnTime({ recordId: item.record.id });
                                    const { data } = await fetchAttendanceForSession(session.id);
                                    setRecords(data || []);
                                  }
                                }}
                                title="Đánh dấu đến đúng giờ"
                              >
                                <IconDot size={6} color="#10b981" /> Đổi đúng giờ
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: 10, color: 'var(--accent-success)', marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <IconDot size={6} color="#10b981" /> {item.checkinTime}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Attendance Table */}
              <div className="table-wrapper" style={{ maxHeight: 380, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Thành viên</th>
                      <th>Lớp</th>
                      <th>Mã TV</th>
                      <th>Giờ / Trạng Thái</th>
                      <th>Ghi chú / Lý do vắng</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDisplay.map((item, i) => {
                      const m = item.member;

                      return (
                        <tr key={m.id}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{m?.full_name}</td>
                          <td>
                            {m?.class_name ? (
                              <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>
                                {m.class_name}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td><span className="ticket-code" style={{ fontSize: 11 }}>{m?.member_code}</span></td>
                          <td>
                            {item.statusKey === 'on_time' && (
                              <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IconDot size={7} color="#10b981" /> Đúng giờ ({item.checkinTime})
                              </span>
                            )}
                            {item.statusKey === 'late' && (
                              <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IconAlertTriangle size={11} color="#f59e0b" /> Trễ {item.lateMinutes}m ({item.checkinTime})
                              </span>
                            )}
                            {item.statusKey === 'excused' && (
                              <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IconDot size={7} color="#f59e0b" /> Vắng có phép
                              </span>
                            )}
                            {item.statusKey === 'unexcused' && (
                              session.is_mandatory === false ? (
                                <span style={{ color: '#9ca3af', background: 'rgba(156,163,175,0.15)', border: '1px solid rgba(156,163,175,0.3)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <IconDot size={7} color="#9ca3af" /> Tự nguyện (Không tính vắng)
                                </span>
                              ) : (
                                <span style={{ color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <IconDot size={7} color="#ef4444" /> Vắng không phép
                                </span>
                              )
                            )}
                            {item.statusKey === 'pending_excuse' && (
                              <span style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <IconMail size={12} color="#3b82f6" /> Đơn xin vắng (Chờ duyệt)
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {item.notes || '—'}
                          </td>
                          <td>
                            {item.statusKey === 'pending_excuse' ? (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={async () => {
                                    await reviewAbsenceRequest({ recordId: item.record.id, statusKey: 'excused' });
                                    const { data } = await fetchAttendanceForSession(session.id);
                                    setRecords(data || []);
                                  }}
                                  title="Duyệt vắng có phép (0 điểm)"
                                >
                                  <IconCheck size={12} /> Duyệt Có Phép
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  onClick={async () => {
                                    await reviewAbsenceRequest({ recordId: item.record.id, statusKey: 'unexcused' });
                                    const { data } = await fetchAttendanceForSession(session.id);
                                    setRecords(data || []);
                                  }}
                                  title="Từ chối (Ghi nhận vắng không phép -1 điểm)"
                                >
                                  <IconX size={12} /> Từ Chối
                                </button>
                              </div>
                            ) : item.statusKey === 'excused' ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleMarkUnexcused(m)}
                                title="Đổi thành vắng không phép"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <IconX size={12} /> Đổi vắng không phép
                              </button>
                            ) : item.statusKey === 'unexcused' ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setEditingExcuseMember(m);
                                  setExcuseNotes(item.notes || '');
                                }}
                                title="Đánh dấu vắng có phép"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <IconEdit size={12} /> Đánh dấu có phép
                              </button>
                            ) : item.statusKey === 'late' ? (
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: 'rgba(16,185,129,0.15)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16,185,129,0.3)',
                                  padding: '4px 10px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                onClick={async () => {
                                  if (item.record?.id) {
                                    await markOnTime({ recordId: item.record.id });
                                    const { data } = await fetchAttendanceForSession(session.id);
                                    setRecords(data || []);
                                  }
                                }}
                                title="Đánh dấu thành viên này đến đúng giờ (xoá trạng thái trễ)"
                              >
                                <IconDot size={6} color="#10b981" /> Đổi đúng giờ
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Excuse Modal */}
      {editingExcuseMember && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9995,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)', padding: 24, maxWidth: 420, width: '100%',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconEdit size={16} /> Đánh Dấu Vắng Có Phép: {editingExcuseMember.full_name}
            </h3>
            <form onSubmit={handleSaveExcuse} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Lý do vắng / Ghi chú</label>
                <input
                  className="form-input"
                  placeholder="VD: Bị ốm có xin phép, Bận việc gia đình..."
                  value={excuseNotes}
                  onChange={e => setExcuseNotes(e.target.value)}
                  autoFocus required
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingExcuseMember(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} disabled={submittingExcuse}>
                  {submittingExcuse ? <><span className="loading-spinner" /> Đang lưu…</> : <><IconSave size={14} /> Lưu Vắng Có Phép</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged Photo View */}
      {selectedPhoto && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.97)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div style={{ textAlign: 'center' }}>
            <img
              src={selectedPhoto.photo}
              alt={selectedPhoto.member?.full_name}
              style={{
                maxWidth: '90vw', maxHeight: '75vh',
                borderRadius: 'var(--radius-lg)',
                border: '3px solid var(--accent-primary)',
                boxShadow: '0 0 60px rgba(0,0,0,0.8)',
              }}
            />
            <div style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: '#fff' }}>
              {selectedPhoto.member?.full_name} ({selectedPhoto.member?.member_code})
            </div>
            <div style={{ fontSize: 14, color: selectedPhoto.isLate ? '#f59e0b' : '#10b981', marginTop: 4 }}>
              {selectedPhoto.isLate ? `Đến trễ ${selectedPhoto.lateMinutes} phút` : 'Điểm danh đúng giờ'} • {selectedPhoto.time}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

// ─── Main Session History Manager ─────────────────────────────────────────
export default function ClubSessionManager() {
  const { members, sessions, activeSession, loadingSessions, createSession, updateSession, openSession, closeSession, setSessionScheduled, deleteSession, checkAutoCreateRecurring, reviewAbsenceRequest, getAbsenceDeadline, isAbsenceDeadlinePassed } = useClub();
  const [selectedSession, setSelectedSession] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [msg, setMsg] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Collect all pending absence requests across all sessions
  const allPendingRequests = [];
  (sessions || []).forEach(s => {
    const records = s.club_attendance_records || [];
    records.filter(r => r.checkin_status === 'pending_excuse').forEach(r => {
      const member = (members || []).find(m => m.id === r.member_id) || r.club_members;
      allPendingRequests.push({
        recordId: r.id,
        session: s,
        member,
        notes: r.notes,
        createdAt: r.created_at,
      });
    });
  });

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleStartCreate = () => {
    setEditingSession(null);
    setShowCreateModal(true);
  };

  const handleStartEdit = (sessionItem) => {
    setEditingSession(sessionItem);
    setShowCreateModal(true);
  };

  const handleToggleMandatory = async (sessionItem) => {
    const newMandatory = sessionItem.is_mandatory === false ? true : false;
    const { error } = await updateSession(sessionItem.id, { is_mandatory: newMandatory });
    if (error) showToast('Lỗi cập nhật: ' + error.message, 'error');
    else showToast(`Đã chuyển buổi thành "${newMandatory ? 'Bắt buộc' : 'Tự nguyện (Không bắt buộc)'}"!`);
  };

  const handleSaveSessionModal = async (payload, sessionToEdit) => {
    let res;
    if (sessionToEdit) {
      res = await updateSession(sessionToEdit.id, payload);
    } else {
      res = await createSession(payload);
    }

    if (res?.error) {
      showToast('Lỗi lưu buổi sinh hoạt: ' + res.error.message, 'error');
      return res;
    } else {
      showToast(sessionToEdit ? 'Đã cập nhật cài đặt buổi sinh hoạt thành công!' : 'Đã lên lịch buổi sinh hoạt thành công!');
      setShowCreateModal(false);
      setEditingSession(null);
      return res;
    }
  };

  const handleOpen = async (id) => {
    const { error } = await openSession(id);
    if (error) showToast('Lỗi kích hoạt: ' + error.message, 'error');
    else showToast('Đã kích hoạt buổi sinh hoạt! Đang mở điểm danh.');
  };

  const handleClose = async (sessionItem) => {
    const targetSession = typeof sessionItem === 'object' ? sessionItem : sessions.find(s => s.id === sessionItem);
    if (!targetSession) return;

    const sessionDate = targetSession.session_date ? new Date(targetSession.session_date) : null;
    const now = new Date();
    if (sessionDate && sessionDate > now) {
      const dateStr = sessionDate.toLocaleDateString('vi-VN');
      if (!window.confirm(`LƯU Ý THỜI GIAN:\n\nBuổi sinh hoạt "${targetSession.title}" có ngày lên lịch là ${dateStr} (Thời gian này chưa tới).\nBạn có chắc chắn muốn KẾT THÚC SỚM buổi này không?`)) {
        return;
      }
    }

    const { error } = await closeSession(targetSession.id);
    if (error) showToast('Lỗi kết thúc: ' + error.message, 'error');
    else showToast('Đã kết thúc buổi sinh hoạt.');
  };

  const handleSetScheduled = async (id) => {
    const { error } = await setSessionScheduled(id);
    if (error) showToast('Lỗi chuyển trạng thái: ' + error.message, 'error');
    else showToast('Đã chuyển buổi sinh hoạt về trạng thái "Chưa bắt đầu".');
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Xóa buổi "${title}"? Tất cả bản ghi điểm danh sẽ bị xóa!`)) return;
    const { error } = await deleteSession(id);
    if (error) showToast('Lỗi xóa buổi: ' + error.message, 'error');
    else showToast('Đã xóa buổi sinh hoạt!');
  };

  if (loadingSessions) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <span className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Đang tải lịch sử buổi sinh hoạt…</p>
      </div>
    );
  }

  return (
    <div>
      {msg && (
        <div className={`alert ${msg.type === 'error' ? 'alert-warning' : 'alert-info'}`} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{msg.text}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMsg(null)} style={{ padding: '2px 8px' }}>
              <IconX size={14} />
            </button>
          </div>
          {msg.text.includes('absence_cutoff_hours') && (
            <div style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
            }}>
              <code style={{ color: '#f59e0b', fontSize: 12, fontFamily: 'monospace' }}>
                ALTER TABLE club_sessions ADD COLUMN IF NOT EXISTS absence_cutoff_hours INTEGER DEFAULT 2;
              </code>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
                onClick={async () => {
                  const copied = await copyToClipboard('ALTER TABLE club_sessions ADD COLUMN IF NOT EXISTS absence_cutoff_hours INTEGER DEFAULT 2;');
                  if (copied) showToast('Đã sao chép câu lệnh SQL! Dán vào Supabase SQL Editor và chạy để hoàn tất.');
                }}
              >
                <IconCopy size={14} /> Sao chép SQL
              </button>
            </div>
          )}
        </div>
      )}

      {/* Global Pending Absence Requests Notification Banner */}
      {allPendingRequests.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.08))',
          border: '1px solid rgba(59,130,246,0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: '0 4px 20px rgba(59,130,246,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: '#60a5fa', fontSize: 15 }}>
              <IconMail size={16} /> Có {allPendingRequests.length} Đơn Xin Báo Vắng Đang Chờ Duyệt
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bấm Duyệt Có Phép (0đ) hoặc Từ Chối (-1đ)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allPendingRequests.map(req => (
              <div key={req.recordId} style={{
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--radius-md)', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 12,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconUser size={14} color="var(--accent-primary)" /> {req.member?.full_name || 'Thành viên'} ({req.member?.member_code || '—'}) {req.member?.class_name ? `• Lớp ${req.member.class_name}` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconPin size={12} /> Buổi: <strong style={{ color: 'var(--text-primary)' }}>{req.session?.title}</strong> ({req.session?.session_date ? new Date(req.session.session_date).toLocaleDateString('vi-VN') : '—'})
                  </div>
                  <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 3, fontStyle: 'italic' }}>
                    Lý do: {req.notes || 'Không ghi lý do'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={async () => {
                      const { error } = await reviewAbsenceRequest({ recordId: req.recordId, statusKey: 'excused' });
                      if (error) showToast('Lỗi duyệt đơn: ' + error.message, 'error');
                      else showToast(`Đã duyệt Vắng có phép cho ${req.member?.full_name || 'thành viên'}!`);
                    }}
                  >
                    <IconCheck size={13} /> Duyệt Có Phép (0đ)
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={async () => {
                      const { error } = await reviewAbsenceRequest({ recordId: req.recordId, statusKey: 'unexcused' });
                      if (error) showToast('Lỗi từ chối: ' + error.message, 'error');
                      else showToast(`Đã từ chối đơn báo vắng của ${req.member?.full_name || 'thành viên'}!`);
                    }}
                  >
                    <IconX size={13} /> Từ Chối (-1đ)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconCalendar size={20} color="var(--accent-primary)" />
            Quản Lý & Lịch Sử Buổi Sinh Hoạt ({sessions.length} buổi)
          </h3>
          {activeSession && (
            <div style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconDot size={8} color="#10b981" /> Đang mở điểm danh: <strong>{activeSession.title}</strong> (Giờ quy định: {activeSession.start_time || '08:00'})
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            id="btn-auto-create-today"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={async () => {
              const res = await checkAutoCreateRecurring();
              showToast(res.message, res.created ? 'success' : 'info');
            }}
            title="Kiểm tra và tạo buổi lặp lại theo lịch hôm nay"
          >
            <IconZap size={14} color="#f59e0b" /> Kiểm Tra Lịch Lặp Lại
          </button>
          <button
            id="btn-new-session-history"
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleStartCreate}
          >
            <IconPlus size={16} /> Lên Lịch Buổi Sinh Hoạt Mới
          </button>
        </div>
      </div>

      {/* Sessions list table */}
      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconCalendar size={48} color="var(--accent-primary)" /></div>
          <div className="empty-state-title">Chưa có buổi sinh hoạt nào</div>
          <div className="empty-state-desc">Lên lịch trước hoặc tạo buổi sinh hoạt mới từ nút bên trên</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>#</th>
                <th style={{ minWidth: 160 }}>Tên buổi sinh hoạt</th>
                <th style={{ minWidth: 240 }}>Ngày & Giờ sinh hoạt</th>
                <th style={{ minWidth: 120 }}>Địa điểm</th>
                <th style={{ minWidth: 140 }}>Lặp lại</th>
                <th style={{ minWidth: 120 }}>Thống kê tham gia</th>
                <th style={{ minWidth: 140 }}>Trạng thái</th>
                <th style={{ minWidth: 240 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const isOpen = s.status === 'open';
                const isScheduled = s.status === 'scheduled';
                const recRuleLabel = RECURRENCE_OPTIONS.find(r => r.value === s.recurrence_rule)?.label || 'Không lặp';

                return (
                  <tr key={s.id} style={{ background: isOpen ? 'rgba(16,185,129,0.04)' : undefined }}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                        {s.is_mandatory === false ? (
                          <span style={{
                            background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                            border: '1px solid rgba(245,158,11,0.3)',
                            padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                          }} title="Buổi tự nguyện — Vắng mặt KHÔNG bị tính vắng mặt. Tham gia được +1 chuyên cần">
                            <IconStar size={12} color="#f59e0b" /> Tự nguyện (+1 CC)
                          </span>
                        ) : (
                          <span style={{
                            background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
                            border: '1px solid rgba(124,58,237,0.25)',
                            padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                          }}>
                            <IconPin size={12} color="#a78bfa" /> Bắt buộc
                          </span>
                        )}
                      </div>
                      {s.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                          {s.description}
                        </div>
                      )}
                    </td>
                    <td style={{ minWidth: 240 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        <IconCalendar size={14} color="var(--accent-primary)" />
                        <span>{new Date(s.session_date || s.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                        <IconClock size={12} color="var(--text-muted)" />
                        <span>Giờ: <strong>{s.start_time || '08:00'}</strong> (Trễ +{s.grace_period_minutes ?? 15}m)</span>
                      </div>
                      {(() => {
                        const deadline = getAbsenceDeadline ? getAbsenceDeadline(s) : null;
                        const isPassed = isAbsenceDeadlinePassed ? isAbsenceDeadlinePassed(s) : false;
                        const deadlineStr = deadline ? deadline.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
                        return (
                          <div style={{ fontSize: 11, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              <IconClock size={12} color={isPassed ? '#ef4444' : '#10b981'} />
                              <span>Hạn báo vắng: <strong>{s.absence_cutoff_hours ?? 2}h trước</strong></span>
                            </span>
                            {isPassed ? (
                              <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }} title={`Hạn chót: ${deadlineStr}`}>
                                (<IconLock size={10} color="#ef4444" /> Đã ngưng)
                              </span>
                            ) : (
                              <span style={{ color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' }} title={`Hạn chót: ${deadlineStr}`}>
                                (Đến {deadlineStr})
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconMapPin size={13} /> {s.location || 'Phòng CLB'}
                      </div>
                    </td>
                    <td style={{ minWidth: 140, whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, color: s.recurrence_rule !== 'none' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: s.recurrence_rule !== 'none' ? 600 : 400, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconRepeat size={12} /> {recRuleLabel}
                      </span>
                    </td>
                    <td style={{ minWidth: 120, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconDot size={8} color="#10b981" /> {s.attendance_count || 0}
                        </span>
                        {s.excused_count > 0 && (
                          <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            (<IconDot size={6} color="#f59e0b" /> {s.excused_count} phép)
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ minWidth: 140, whiteSpace: 'nowrap' }}>
                      {isOpen && (
                        <span className="badge badge-checked-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                          <IconDot size={8} color="#10b981" /> Đang mở điểm danh
                        </span>
                      )}
                      {isScheduled && (
                        <span style={{
                          background: 'rgba(79,156,249,0.15)', color: 'var(--accent-primary)',
                          border: '1px solid rgba(79,156,249,0.3)',
                          padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                        }}>
                          <IconCalendar size={12} /> Chưa bắt đầu
                        </span>
                      )}
                      {s.status === 'closed' && (
                        <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                          <IconDot size={8} color="#64748b" /> Đã kết thúc
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {/* Detail / View Report */}
                        <button
                          id={`btn-session-detail-${s.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => setSelectedSession(s)}
                          title="Xem danh sách chi tiết & Báo cáo vắng mặt"
                        >
                          <IconReport size={14} /> Báo cáo
                        </button>

                        {/* Edit & Configure Session */}
                        <button
                          id={`btn-edit-session-${s.id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStartEdit(s)}
                          style={{ borderColor: 'rgba(79,156,249,0.4)', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Cài đặt & chỉnh sửa thông tin buổi sinh hoạt (Hạn ngưng nhận báo vắng, giờ bắt đầu, địa điểm...)"
                        >
                          <IconSettings size={14} /> Cài đặt
                        </button>

                        {/* Toggle Mandatory / Optional */}
                        <button
                          id={`btn-toggle-mandatory-${s.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={() => handleToggleMandatory(s)}
                          title={s.is_mandatory === false ? 'Chuyển sang buổi sinh hoạt BẮT BUỘC' : 'Chuyển sang buổi sinh hoạt TỰ NGUYỆN (Vắng mặt không tính vắng, tham gia +1 chuyên cần)'}
                        >
                          {s.is_mandatory === false ? (
                            <><IconPin size={14} /> Đổi Bắt buộc</>
                          ) : (
                            <><IconStar size={14} color="#f59e0b" /> Đổi Tự nguyện</>
                          )}
                        </button>

                        {/* Open Session if scheduled or closed */}
                        {isScheduled && (
                          <button
                            id={`btn-open-session-${s.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleOpen(s.id)}
                            title="Kích hoạt mở điểm danh cho buổi này"
                          >
                            <IconRocket size={14} /> Kích hoạt
                          </button>
                        )}
                        {isOpen && (
                          <button
                            id={`btn-close-session-${s.id}`}
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleClose(s)}
                            title="Kết thúc điểm danh buổi này"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <IconLock size={13} /> Kết thúc
                          </button>
                        )}
                        {s.status === 'closed' && (
                          <>
                            <button
                              id={`btn-reopen-session-${s.id}`}
                              className="btn btn-primary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => handleOpen(s.id)}
                            >
                              <IconRocket size={14} /> Kích hoạt lại
                            </button>
                            <button
                              id={`btn-scheduled-session-${s.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => handleSetScheduled(s.id)}
                            >
                              <IconCalendar size={14} /> Đặt Chưa bắt đầu
                            </button>
                          </>
                        )}
                        <button
                          id={`btn-delete-session-${s.id}`}
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(s.id, s.title)}
                          title="Xóa buổi sinh hoạt này"
                          style={{ padding: '6px 8px' }}
                        ><IconTrash size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Session Modal */}
      <ClubSessionModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingSession(null); }}
        session={editingSession}
        onSave={handleSaveSessionModal}
      />

      {/* Session Attendance Detail Modal */}
      {selectedSession && (
        <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}
