import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { useEvents } from '../contexts/EventContext';
import { copyToClipboard } from '../lib/clipboard';
import {
  IconSearch,
  IconTrash,
  IconFileSpreadsheet,
  IconCrown,
  IconUsers,
  IconTicket,
  IconCopy,
  IconCheckCircle,
} from './common/CustomIcons';
import QRCodeCard from './QRCodeCard';
import AttendeeDetailModal from './AttendeeDetailModal';

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit',
  });
}

export default function AttendeeTable({ onCountChange }) {
  const { events, selectedEventId } = useEvents();
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [categoryTab, setCategoryTab] = useState('regular'); // 'regular' | 'vip' | 'all'
  const [newlyCheckedIn, setNewlyCheckedIn] = useState(new Set());
  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [copiedNameId, setCopiedNameId] = useState(null);
  const channelRef = useRef(null);

  const fetchAttendees = useCallback(async () => {
    let query = supabase
      .from('attendees')
      .select('*, checkin_logs(checked_in_at, scanned_by)')
      .order('created_at', { ascending: true });

    if (selectedEventId && selectedEventId !== 'all') {
      query = query.eq('event_id', selectedEventId);
    }

    const { data, error } = await query;

    if (!error) {
      setAttendees(data || []);
      onCountChange?.(data?.length || 0);
    }
    setLoading(false);
  }, [selectedEventId, onCountChange]);

  useEffect(() => {
    fetchAttendees();

    // Realtime subscription — update table when attendee changes
    channelRef.current = supabase
      .channel('attendees-table-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendees' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.status === 'checked_in') {
            setNewlyCheckedIn(prev => new Set([...prev, payload.new.id]));
            setTimeout(() => {
              setNewlyCheckedIn(prev => {
                const next = new Set(prev);
                next.delete(payload.new.id);
                return next;
              });
            }, 3000);
          }
          fetchAttendees();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchAttendees]);

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Xóa khách "${name}"?`)) return;
    await supabase.from('attendees').delete().eq('id', id);
    fetchAttendees();
  };

  const regularCount = attendees.filter(a => !a.is_vip).length;
  const vipCount = attendees.filter(a => a.is_vip).length;

  // Filter + search + category tab
  const filtered = attendees.filter(a => {
    // Category tab filter
    if (categoryTab === 'regular' && a.is_vip) return false;
    if (categoryTab === 'vip' && !a.is_vip) return false;

    // Status filter
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    
    // Search filter
    const q = search.toLowerCase();
    const matchSearch = !q ||
      a.full_name.toLowerCase().includes(q) ||
      a.ticket_code.toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.phone || '').toLowerCase().includes(q) ||
      (a.company || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Export current filtered list to Excel (.xlsx)
  const exportToExcel = () => {
    if (filtered.length === 0) return;

    const dataToExport = filtered.map((a, idx) => {
      const evt = events.find(e => e.id === a.event_id);
      const checkinTime = a.checkin_logs?.[0]?.checked_in_at;

      return {
        "STT": idx + 1,
        "Loại khách": a.is_vip ? 'Khách VIP' : 'Khách Thường',
        "Họ và tên": a.full_name,
        "Mã vé": a.ticket_code,
        "Trạng thái": a.status === 'checked_in' ? 'Đã check-in' : 'Chưa đến',
        "Thời gian check-in": checkinTime ? new Date(checkinTime).toLocaleString('vi-VN') : '',
        "Email": a.email || '',
        "Số điện thoại": a.phone || '',
        "Công ty / Chức vụ": a.company || '',
        "Sự kiện": evt?.name || 'Sự kiện NITEK',
        "Ghi chú": a.notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "KhachMoi");

    const evtName = selectedEventId !== 'all' ? (events.find(e => e.id === selectedEventId)?.name || 'Event') : 'TatCa';
    const cleanFileName = `Danh_Sach_Khach_Moi_${evtName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, cleanFileName);
  };

  const handleDeleteAllInEvent = async () => {
    const currentEvtName = selectedEventId !== 'all' 
      ? (events.find(e => e.id === selectedEventId)?.name || 'Sự kiện này')
      : 'tất cả sự kiện';

    if (!window.confirm(`Bạn có chắc chắn muốn XÓA TẤT CẢ ${attendees.length} khách mời thuộc "${currentEvtName}"?\nThao tác này KHÔNG THỂ HOÀN TÁC!`)) return;

    setLoading(true);
    let query = supabase.from('attendees').delete();
    if (selectedEventId && selectedEventId !== 'all') {
      query = query.eq('event_id', selectedEventId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { error } = await query;
    if (error) {
      alert('Lỗi xóa danh sách khách mời: ' + error.message);
    } else {
      await fetchAttendees();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <span className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Đang tải danh sách khách mời…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Category sub-tabs: Khách thường vs Khách VIP */}
      <div className="section-tabs" style={{ marginBottom: 16 }}>
        <button
          id="attendee-cat-regular"
          type="button"
          className={`section-tab ${categoryTab === 'regular' ? 'active' : ''}`}
          onClick={() => setCategoryTab('regular')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconUsers size={15} /> Khách thường ({regularCount})
        </button>
        <button
          id="attendee-cat-vip"
          type="button"
          className={`section-tab ${categoryTab === 'vip' ? 'active' : ''}`}
          onClick={() => setCategoryTab('vip')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderColor: categoryTab === 'vip' ? '#f59e0b' : 'transparent',
            color: categoryTab === 'vip' ? '#fbbf24' : 'var(--text-secondary)',
          }}
        >
          <IconCrown size={15} color="#fbbf24" /> Khách VIP ({vipCount})
        </button>
        <button
          id="attendee-cat-all"
          type="button"
          className={`section-tab ${categoryTab === 'all' ? 'active' : ''}`}
          onClick={() => setCategoryTab('all')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconTicket size={15} /> Tất cả ({attendees.length})
        </button>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar-row" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          id="search-attendees"
          className="form-input"
          placeholder="Tìm theo tên, mã vé, SĐT, công ty…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />

        <select
          id="filter-status"
          className="form-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="all">Tất cả trạng thái ({attendees.length})</option>
          <option value="pending">Chưa đến ({attendees.filter(a => a.status === 'pending').length})</option>
          <option value="checked_in">Đã check-in ({attendees.filter(a => a.status === 'checked_in').length})</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {attendees.length > 0 && (
            <button
              id="btn-clear-all-attendees"
              className="btn btn-danger btn-sm"
              onClick={handleDeleteAllInEvent}
              title="Xóa tất cả khách mời thuộc sự kiện này để nạp danh sách mới"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconTrash size={13} /> Xóa danh sách ({attendees.length})
            </button>
          )}

          <button
            id="btn-export-excel"
            className="btn btn-secondary btn-sm"
            onClick={exportToExcel}
            title="Xuất danh sách hiện tại ra file Excel"
            disabled={filtered.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <IconFileSpreadsheet size={13} /> Xuất Excel ({filtered.length})
          </button>
          <span className="realtime-dot" style={{ fontSize: 12 }}>
            Realtime
          </span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ opacity: 0.5 }}>
            <IconSearch size={40} color="var(--accent-primary)" />
          </div>
          <div className="empty-state-title">Không tìm thấy khách mời</div>
          <div className="empty-state-desc">Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục Khách Thường / Khách VIP</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Họ và tên</th>
                <th>Thông tin liên hệ</th>
                <th>Mã vé</th>
                <th>Trạng thái</th>
                <th>Thời gian check-in</th>
                <th>Mã QR</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) => {
                const isNew = newlyCheckedIn.has(a.id);
                const checkinTime = a.checkin_logs?.[0]?.checked_in_at;
                const evtObj = events.find(e => e.id === a.event_id);

                return (
                  <tr
                    key={a.id}
                    className={`${isNew ? 'just-checked-in' : ''} ${a.is_vip ? 'row-vip' : ''}`}
                    onClick={() => setSelectedAttendee(a)}
                    style={{ cursor: 'pointer' }}
                    title="Click để xem thông tin chi tiết khách mời"
                  >
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{ fontWeight: a.is_vip ? 700 : 600, color: a.is_vip ? 'var(--vip-text)' : 'var(--text-primary)', cursor: 'pointer' }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const success = await copyToClipboard(a.full_name);
                            if (success) {
                              setCopiedNameId(a.id);
                              setTimeout(() => setCopiedNameId(null), 2000);
                            }
                          }}
                          title="Click để sao chép họ và tên"
                        >
                          {a.full_name}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 5px', fontSize: 10, display: 'inline-flex', alignItems: 'center', opacity: 0.8 }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const success = await copyToClipboard(a.full_name);
                            if (success) {
                              setCopiedNameId(a.id);
                              setTimeout(() => setCopiedNameId(null), 2000);
                            }
                          }}
                          title={`Sao chép tên: ${a.full_name}`}
                        >
                          {copiedNameId === a.id ? (
                            <IconCheckCircle size={11} color="var(--accent-success)" />
                          ) : (
                            <IconCopy size={11} />
                          )}
                        </button>
                        {a.is_vip && (
                          <span className="badge badge-vip" style={{ fontSize: 10, padding: '2px 8px' }}>
                            <IconCrown size={12} color="currentColor" /> VIP
                          </span>
                        )}
                        {((a.company || '').includes('Staff') || (a.company || '').includes('Ban Tổ Chức')) && (
                          <span style={{
                            fontSize: 10, background: 'rgba(168,85,247,0.2)', color: '#d8b4fe',
                            border: '1px solid rgba(168,85,247,0.4)', padding: '1px 6px',
                            borderRadius: 4, fontWeight: 700,
                          }}>
                            STAFF
                          </span>
                        )}
                      </div>
                      {a.company && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {a.company}
                        </div>
                      )}
                      {evtObj && selectedEventId === 'all' && (
                        <div style={{ fontSize: 10, color: 'var(--accent-primary)', marginTop: 2, fontWeight: 500 }}>
                          {evtObj.name}
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.email || '—'}</div>
                      {a.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{a.phone}</div>}
                    </td>

                    <td>
                      <span className="ticket-code">{a.ticket_code}</span>
                    </td>

                    <td>
                      {a.status === 'checked_in' ? (
                        <span className="badge badge-checked-in">
                          <span className="badge-dot" />
                          Đã check-in
                        </span>
                      ) : (
                        <span className="badge badge-pending">
                          <span className="badge-dot" />
                          Chưa đến
                        </span>
                      )}
                    </td>

                    <td className="checkin-time">
                      {formatTime(checkinTime)}
                    </td>

                    <td onClick={e => e.stopPropagation()}>
                      <QRCodeCard
                        ticketCode={a.ticket_code}
                        fullName={a.full_name}
                      />
                    </td>

                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          id={`btn-info-${a.id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedAttendee(a)}
                          title="Xem chi tiết khách mời"
                        >
                          Chi tiết
                        </button>
                        <button
                          id={`btn-delete-${a.id}`}
                          className="btn btn-danger btn-sm"
                          onClick={(e) => handleDelete(e, a.id, a.full_name)}
                          title="Xóa khách"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Guest Detail Modal */}
      {selectedAttendee && (
        <AttendeeDetailModal
          attendee={selectedAttendee}
          onClose={() => setSelectedAttendee(null)}
          onUpdated={() => {
            fetchAttendees();
            setSelectedAttendee(null);
          }}
        />
      )}
    </div>
  );
}
