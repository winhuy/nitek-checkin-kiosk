import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabaseClient';
import { useEvents } from '../contexts/EventContext';
import { copyToClipboard } from '../lib/clipboard';
import {
  IconCrown,
  IconCopy,
  IconDownload,
  IconImage,
  IconUser,
  IconEdit,
  IconCheck,
  IconUndo,
  IconX,
  IconSave,
  IconFileText,
} from './common/CustomIcons';

export default function AttendeeDetailModal({ attendee, onClose, onUpdated }) {
  const { events } = useEvents();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: attendee?.full_name || '',
    email: attendee?.email || '',
    phone: attendee?.phone || '',
    company: attendee?.company || '',
    ticket_code: attendee?.ticket_code || '',
    event_id: attendee?.event_id || '',
    notes: attendee?.notes || '',
    is_vip: attendee?.is_vip || false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  if (!attendee) return null;

  const eventObj = events.find(e => e.id === attendee.event_id);
  const checkinLog = attendee.checkin_logs?.[0];

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return showMsg('Vui lòng nhập họ tên!', 'error');

    setLoading(true);
    const { error } = await supabase
      .from('attendees')
      .update({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        ticket_code: form.ticket_code.trim(),
        event_id: form.event_id || null,
        notes: form.notes.trim() || null,
        is_vip: Boolean(form.is_vip),
      })
      .eq('id', attendee.id);

    setLoading(false);

    if (error) {
      showMsg('Lỗi cập nhật: ' + error.message, 'error');
    } else {
      showMsg('Đã cập nhật thông tin khách!');
      setIsEditing(false);
      onUpdated?.();
    }
  };

  const handleToggleCheckin = async () => {
    const newStatus = attendee.status === 'checked_in' ? 'pending' : 'checked_in';
    setLoading(true);
    
    const { error } = await supabase
      .from('attendees')
      .update({ status: newStatus })
      .eq('id', attendee.id);

    if (newStatus === 'checked_in') {
      await supabase.from('checkin_logs').insert({
        attendee_id: attendee.id,
        scanned_by: 'admin_manual',
      });
    }

    setLoading(false);
    if (error) {
      showMsg('Lỗi đổi trạng thái: ' + error.message, 'error');
    } else {
      showMsg(`Đã đổi trạng thái thành "${newStatus === 'checked_in' ? 'Đã check-in' : 'Chưa đến'}"`);
      onUpdated?.();
    }
  };

  const handleToggleVip = async () => {
    const newVip = !attendee.is_vip;
    setLoading(true);
    const { error } = await supabase
      .from('attendees')
      .update({ is_vip: newVip })
      .eq('id', attendee.id);

    setLoading(false);
    if (error) {
      showMsg('Lỗi cập nhật VIP: ' + error.message, 'error');
    } else {
      showMsg(`Đã ${newVip ? 'gán thành KHÁCH VIP' : 'hủy trạng thái KHÁCH VIP'}`);
      onUpdated?.();
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById(`modal-qr-code-${attendee.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 300;
    canvas.height = 300;

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 20, 20, 260, 260);

      const a = document.createElement('a');
      a.download = `QR-${attendee.ticket_code}-${attendee.full_name}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyQRImage = async () => {
    const svg = document.getElementById(`modal-qr-code-${attendee.id}`);
    if (!svg) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 400;
      canvas.height = 400;

      img.onload = async () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 20, 20, 360, 360);

        canvas.toBlob(async (blob) => {
          if (!blob) return showMsg('Không thể tạo ảnh QR!', 'error');

          if (navigator.clipboard && window.ClipboardItem) {
            try {
              const item = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([item]);
              showMsg('Đã sao chép ảnh QR vào bộ nhớ tạm! (Dán Ctrl+V vào Zalo, Messenger...)');
            } catch (err) {
              console.error('Clipboard copy error:', err);
              showMsg('Lỗi sao chép ảnh: Hãy sử dụng nút Tải QR Image', 'error');
            }
          } else {
            showMsg('Trình duyệt không hỗ trợ sao chép ảnh trực tiếp!', 'error');
          }
        }, 'image/png');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      showMsg('Lỗi sao chép ảnh QR: ' + err.message, 'error');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'KM';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      id="attendee-detail-modal-overlay"
      className="modal-overlay modal-large"
      onClick={onClose}
    >
      <div
        className="modal-card modal-large-card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div style={{
          padding: '24px 28px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontSize: 20,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {getInitials(attendee.full_name)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2
                  style={{ fontSize: 20, fontWeight: 700, margin: '0', color: 'var(--text-primary)', cursor: 'pointer' }}
                  onClick={async () => {
                    const success = await copyToClipboard(attendee.full_name);
                    if (success) showMsg('Đã copy họ và tên!');
                  }}
                  title="Click để sao chép họ và tên"
                >
                  {attendee.full_name}
                </h2>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={async () => {
                    const success = await copyToClipboard(attendee.full_name);
                    if (success) showMsg('Đã copy họ và tên!');
                  }}
                  title="Sao chép tên khách mời"
                >
                  <IconCopy size={12} /> Copy Tên
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  className="ticket-code"
                  onClick={async () => {
                    const success = await copyToClipboard(attendee.ticket_code);
                    if (success) showMsg('Đã copy mã vé!');
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Click để sao chép mã vé"
                >
                  {attendee.ticket_code}
                </span>
                {attendee.is_vip && (
                  <span className="badge badge-vip">
                    <IconCrown size={12} color="#fbbf24" /> VIP
                  </span>
                )}
                {attendee.status === 'checked_in' ? (
                  <span className="badge badge-checked-in"><span className="badge-dot" /> Đã check-in</span>
                ) : (
                  <span className="badge badge-pending"><span className="badge-dot" /> Chưa đến</span>
                )}
              </div>
            </div>
          </div>

          <button
            id="btn-close-detail-modal"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Notification Toast */}
        {message && (
          <div style={{ margin: '16px 24px 0' }} className={`alert ${message.type === 'error' ? 'alert-warning' : 'alert-info'}`}>
            {message.text}
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {isEditing ? (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-fullname">
                  Họ và tên <span style={{ color: 'var(--accent-danger)' }}>*</span>
                </label>
                <input
                  id="edit-fullname"
                  className="form-input"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: form.is_vip ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255,255,255,0.03)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: form.is_vip ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}>
                  <input
                    type="checkbox"
                    id="edit-is-vip"
                    checked={form.is_vip}
                    onChange={e => setForm(f => ({ ...f, is_vip: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: '#f59e0b', cursor: 'pointer' }}
                  />
                  <IconCrown size={18} color="#fbbf24" />
                  <span style={{ fontWeight: 700, color: form.is_vip ? '#fbbf24' : 'var(--text-primary)', fontSize: 13 }}>
                    Đặt làm Khách VIP (được xếp ở danh mục Khách VIP riêng)
                  </span>
                </label>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-email">Email</label>
                  <input
                    id="edit-email"
                    className="form-input"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-phone">Số điện thoại</label>
                  <input
                    id="edit-phone"
                    className="form-input"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-company">Công ty / Chức vụ</label>
                  <input
                    id="edit-company"
                    className="form-input"
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-code">Mã vé</label>
                  <input
                    id="edit-code"
                    className="form-input"
                    value={form.ticket_code}
                    onChange={e => setForm(f => ({ ...f, ticket_code: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-event">Sự kiện tham gia</label>
                <select
                  id="edit-event"
                  className="form-select"
                  value={form.event_id}
                  onChange={e => setForm(f => ({ ...f, event_id: e.target.value }))}
                >
                  <option value="">-- Chưa chọn sự kiện --</option>
                  {events.map(evt => (
                    <option key={evt.id} value={evt.id}>{evt.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-notes">Ghi chú</label>
                <textarea
                  id="edit-notes"
                  className="form-input"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  id="btn-cancel-edit-guest"
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Hủy
                </button>
                <button
                  id="btn-save-edit-guest"
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {loading ? <><span className="loading-spinner" /> Đang lưu…</> : <><IconSave size={14} /> Lưu thông tin</>}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Detailed Grid Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Họ và tên</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>{attendee.full_name}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Email</div>
                  <div style={{ fontSize: 14, marginTop: 4, color: 'var(--text-primary)' }}>{attendee.email || '—'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Số điện thoại</div>
                  <div style={{ fontSize: 14, marginTop: 4, color: 'var(--text-primary)' }}>{attendee.phone || '—'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Công ty / Chức vụ</div>
                  <div style={{ fontSize: 14, marginTop: 4, color: 'var(--text-primary)' }}>{attendee.company || '—'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sự kiện</div>
                  <div style={{ fontSize: 14, marginTop: 4, color: 'var(--accent-primary)', fontWeight: 600 }}>{eventObj?.name || 'Sự kiện NITEK Tech Summit'}</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Thời gian check-in</div>
                  <div style={{ fontSize: 14, marginTop: 4, color: 'var(--text-primary)' }}>
                    {checkinLog?.checked_in_at ? new Date(checkinLog.checked_in_at).toLocaleString('vi-VN') : 'Chưa check-in'}
                  </div>
                </div>
              </div>

              {attendee.notes && (
                <div style={{ background: 'rgba(245,158,11,0.08)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconFileText size={13} color="#f59e0b" /> Ghi chú:</strong> {attendee.notes}
                </div>
              )}

              {/* QR Code Section */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                flexWrap: 'wrap',
              }}>
                <div style={{ background: '#ffffff', padding: 12, borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <QRCodeSVG
                    id={`modal-qr-code-${attendee.id}`}
                    value={attendee.ticket_code}
                    size={130}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Mã QR Soát Vé</div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    Khách mời có thể xuất trình mã QR này tại quầy soát vé để check-in tự động.
                  </p>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    <button
                      id="btn-copy-qr-image-detail"
                      className="btn btn-primary btn-sm"
                      onClick={copyQRImage}
                      title="Sao chép trực tiếp ảnh QR vào bộ nhớ tạm để Dán (Ctrl+V / Cmd+V) vào Zalo, Messenger, Facebook..."
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <IconImage size={14} /> Copy Ảnh QR
                    </button>
                    <button
                      id="btn-download-qr-detail"
                      className="btn btn-secondary btn-sm"
                      onClick={downloadQR}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <IconDownload size={14} /> Tải QR
                    </button>
                    <button
                      id="btn-copy-ticket-code"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={async () => {
                        const success = await copyToClipboard(attendee.ticket_code);
                        if (success) {
                          showMsg('Đã copy mã vé!');
                        } else {
                          showMsg('Không thể copy mã vé', 'error');
                        }
                      }}
                    >
                      <IconCopy size={14} /> Copy mã vé
                    </button>
                    <button
                      id="btn-copy-full-name"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={async () => {
                        const success = await copyToClipboard(attendee.full_name);
                        if (success) {
                          showMsg('Đã copy họ và tên!');
                        } else {
                          showMsg('Không thể copy tên', 'error');
                        }
                      }}
                    >
                      <IconUser size={14} /> Copy tên
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isEditing && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card)',
            gap: 10,
            flexWrap: 'wrap',
          }}>
            <button
              id="btn-toggle-checkin"
              className={`btn btn-sm ${attendee.status === 'checked_in' ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleToggleCheckin}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {attendee.status === 'checked_in' ? <><IconUndo size={14} /> Hủy Check-in</> : <><IconCheck size={14} /> Đánh dấu Đã Check-in</>}
            </button>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                id="btn-toggle-vip-quick"
                className="btn btn-sm"
                style={{
                  background: attendee.is_vip ? 'rgba(245,158,11,0.2)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: attendee.is_vip ? '#fbbf24' : '#ffffff',
                  border: attendee.is_vip ? '1px solid rgba(245,158,11,0.5)' : 'none',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={handleToggleVip}
                disabled={loading}
              >
                <IconCrown size={14} color={attendee.is_vip ? '#fbbf24' : '#ffffff'} />
                {attendee.is_vip ? 'Hủy Khách VIP' : 'Đặt làm Khách VIP'}
              </button>

              <button
                id="btn-edit-guest-info"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditing(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <IconEdit size={14} /> Sửa thông tin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
