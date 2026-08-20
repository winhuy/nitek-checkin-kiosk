import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { useEvents, getEventStatusInfo } from '../contexts/EventContext';
import {
  IconPlus,
  IconFileSpreadsheet,
  IconFolder,
  IconTicket,
  IconCalendar,
  IconDownload,
  IconCrown,
  IconSettings,
  IconUpload,
  IconRocket,
  IconAlertTriangle,
} from './common/CustomIcons';

// Generate random 4-character string (excluding confusing characters 0, O, 1, I)
function generateRandom4Char() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 4; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function generateCustomTicketCode(prefix = 'MKTN') {
  const cleanPrefix = (prefix || 'MKTN').trim().toUpperCase().replace(/[^A-Z0-9]/gi, '');
  const p = cleanPrefix || 'MKTN';
  return `${p}-${generateRandom4Char()}`;
}

export const generateTicketCode = generateCustomTicketCode;

export default function AddAttendeeForm({ onAdded, currentCount = 0 }) {
  const { events, selectedEventId } = useEvents();
  const [tab, setTab] = useState('single'); // 'single' | 'excel'
  const [ticketPrefix, setTicketPrefix] = useState('MKTN');
  
  // Single form state
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    company: '',
    ticket_code: '',
    event_id: selectedEventId !== 'all' ? selectedEventId : (events[0]?.id || ''),
    notes: '',
    is_vip: false,
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Excel / CSV state
  const [dragOver, setDragOver] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    full_name: '',
    email: '',
    phone: '',
    company: '',
    ticket_code: '',
    notes: '',
    is_vip: '',
  });
  const [markAllAsVip, setMarkAllAsVip] = useState(false);
  const [targetEventId, setTargetEventId] = useState(
    selectedEventId !== 'all' ? selectedEventId : ''
  );
  const [excelImporting, setExcelImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    if (selectedEventId && selectedEventId !== 'all') {
      setTargetEventId(selectedEventId);
      setForm(f => ({ ...f, event_id: selectedEventId }));
    }
  }, [selectedEventId]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4500);
  };

  // ─── 1. Single Attendee Submit ──────────────────────────────────────────
  const handleSubmitSingle = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return showMsg('Vui lòng nhập họ tên khách mời!', 'error');

    setLoading(true);
    const ticketCode = form.ticket_code.trim() || generateCustomTicketCode(ticketPrefix);

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      ticket_code: ticketCode,
      notes: form.notes.trim() || null,
      is_vip: Boolean(form.is_vip),
      status: 'pending',
    };

    if (form.event_id) payload.event_id = form.event_id;

    const { error } = await supabase.from('attendees').insert(payload);

    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        showMsg(`Mã vé "${ticketCode}" đã tồn tại! Vui lòng nhập mã khác.`, 'error');
      } else {
        showMsg('Lỗi thêm khách: ' + error.message, 'error');
      }
      return;
    }

    showMsg(`Đã thêm ${form.is_vip ? 'KHÁCH VIP' : 'khách'}: ${form.full_name} — Mã vé: ${ticketCode}`);
    setForm({
      full_name: '',
      email: '',
      phone: '',
      company: '',
      ticket_code: '',
      event_id: selectedEventId !== 'all' ? selectedEventId : (events[0]?.id || ''),
      notes: '',
      is_vip: false,
    });
    onAdded?.();
  };

  // ─── Smart Utilities for Excel Parsing ──────────────────────────────
  const normalizeStr = (str) => {
    if (!str) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Smart Phone Normalizer: Handles scientific notation, missing leading '0', spaces, dots
  const cleanPhone = (val) => {
    if (!val) return '';
    let str = String(val).trim();
    
    // Fix scientific notation e.g. 9.01234E+08
    if (str.includes('e') || str.includes('E') || str.includes('+')) {
      const num = Number(val);
      if (!isNaN(num)) str = String(Math.round(num));
    }
    
    // Remove .0 suffix often added by Excel float conversion
    str = str.replace(/\.0$/, '');
    
    // Strip everything except digits
    let digits = str.replace(/\D/g, '');
    
    // Auto add leading '0' if 9 digits starting with 3, 5, 7, 8, 9
    if (digits.length === 9 && /^[35789]/.test(digits)) {
      digits = '0' + digits;
    }
    
    return digits;
  };

  // Smart Name Cleanser
  const cleanFullName = (val) => {
    if (!val) return '';
    let str = String(val).trim().replace(/\s+/g, ' ');
    // Remove common title prefixes if present
    const prefixes = ['ông ', 'bà ', 'anh ', 'chị ', 'thầy ', 'cô ', 'mr. ', 'ms. ', 'mrs. ', 'dr. '];
    const lower = str.toLowerCase();
    for (const prefix of prefixes) {
      if (lower.startsWith(prefix)) {
        str = str.substring(prefix.length).trim();
        break;
      }
    }
    return str;
  };

  // Smart Auto VIP Detector in Row Content
  const VIP_KEYWORDS = [
    'vip', 'giam doc', 'ceo', 'chu tich', 'truong doan', 'dien gia', 'speaker', 
    'co van', 'nhan nhan danh du', 'nha tai tro', 'sponsor', 'ban to chuc', 
    'founder', 'co founder', 'bo truong', 'thu truong', 'hieu truong', 'leader'
  ];

  const detectIsVipInRow = (rowObj, explicitVipCol, markAllVip) => {
    if (markAllVip) return true;
    
    // Check explicit VIP column first
    if (explicitVipCol && rowObj[explicitVipCol]) {
      const val = normalizeStr(rowObj[explicitVipCol]);
      if (['true', 'vip', 'co', '1', 'yes', 'x', 'khach vip', 'k vip', 'hang a'].some(k => val.includes(k))) {
        return true;
      }
    }
    
    // Smart auto-check across all text values in company/position/notes
    const rowText = normalizeStr(Object.values(rowObj).join(' '));
    return VIP_KEYWORDS.some(kw => rowText.includes(kw));
  };

  // Smart Header Auto-Detection with Synonyms & Dynamic Header Row Finding
  const autoDetectMapping = (cols) => {
    const mapping = { full_name: '', email: '', phone: '', company: '', ticket_code: '', notes: '', is_vip: '' };

    cols.forEach(col => {
      const norm = normalizeStr(col);
      if (!norm) return;

      if (!mapping.full_name && ['ho ten', 'ho va ten', 'ten', 'full name', 'fullname', 'name', 'khach moi', 'dai bieu', 'danh xung', 'nguoi tham gia'].some(k => norm.includes(k))) {
        mapping.full_name = col;
      } else if (!mapping.email && ['email', 'mail', 'hop thu', 'thu dien tu'].some(k => norm.includes(k))) {
        mapping.email = col;
      } else if (!mapping.phone && ['so dien thoai', 'sdt', 'phone', 'mobile', 'dien thoai', 'tel', 'contact', 'zalo'].some(k => norm.includes(k))) {
        mapping.phone = col;
      } else if (!mapping.company && ['cong ty', 'chuc vu', 'don vi', 'company', 'organization', 'co', 'org', 'phong ban', 'to chuc', 'lop', 'truong'].some(k => norm.includes(k))) {
        mapping.company = col;
      } else if (!mapping.ticket_code && ['ma ve', 'ticket code', 'code', 'ma', 'ma qr', 'barcode', 'stt', 'ma dk'].some(k => norm.includes(k))) {
        mapping.ticket_code = col;
      } else if (!mapping.notes && ['ghi chu', 'notes', 'note', 'gop y', 'yeu cau'].some(k => norm.includes(k))) {
        mapping.notes = col;
      } else if (!mapping.is_vip && ['vip', 'khach vip', 'is vip', 'loai khach', 'doi tuong', 'hang ve'].some(k => norm.includes(k))) {
        mapping.is_vip = col;
      }
    });

    // Fallback if full_name wasn't matched
    if (!mapping.full_name && cols.length > 0) mapping.full_name = cols[0];

    return mapping;
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert worksheet to raw matrix
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawJson.length === 0) {
          showMsg('File Excel không có dữ liệu!', 'error');
          return;
        }

        // Smart Header Row Finder: Find row with highest density of header keywords
        let bestHeaderIdx = 0;
        let maxMatchCount = -1;

        const KEYWORD_TARGETS = ['ho', 'ten', 'name', 'email', 'sdt', 'phone', 'dienthoai', 'congty', 'chucvu', 'donvi', 'ma', 've', 'code', 'stt', 'vip', 'ghi chu'];

        for (let i = 0; i < Math.min(10, rawJson.length); i++) {
          const rowStr = (rawJson[i] || []).map(cell => normalizeStr(cell)).join(' ');
          let matches = 0;
          KEYWORD_TARGETS.forEach(kw => {
            if (rowStr.includes(kw)) matches++;
          });
          if (matches > maxMatchCount) {
            maxMatchCount = matches;
            bestHeaderIdx = i;
          }
        }

        const rawHeaders = (rawJson[bestHeaderIdx] || []).map(h => String(h || '').trim()).filter(Boolean);
        const dataRows = rawJson.slice(bestHeaderIdx + 1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

        if (rawHeaders.length === 0 || dataRows.length === 0) {
          showMsg('File Excel không tìm thấy cột dữ liệu hợp lệ!', 'error');
          return;
        }

        setHeaders(rawHeaders);
        
        // Detect matching columns intelligently
        const detected = autoDetectMapping(rawHeaders);
        setColumnMapping(detected);

        // Map row objects
        const parsedObjects = dataRows.map(row => {
          const obj = {};
          rawHeaders.forEach((h, idx) => {
            obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });
          return obj;
        });

        setExcelRows(parsedObjects);
        showMsg(`Đã phân tích thông minh "${file.name}" (Tiêu đề ở dòng ${bestHeaderIdx + 1}) — Nạp ${parsedObjects.length} dòng dữ liệu`);
      } catch (err) {
        showMsg('Lỗi đọc file Excel: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Generate standardized Excel template
  const downloadTemplate = () => {
    const templateData = [
      {
        "Họ và tên": "Nguyễn Văn An",
        "Email": "an.nguyen@example.com",
        "Số điện thoại": "0901234567",
        "Công ty / Chức vụ": "Tech Corp - Giám Đốc",
        "Mã vé": "EVT-101",
        "Ghi chú": "Khách VIP",
      },
      {
        "Họ và tên": "Trần Thị Bích",
        "Email": "bich.tran@example.com",
        "Số điện thoại": "0912345678",
        "Công ty / Chức vụ": "Innovate LLC - Trưởng phòng",
        "Mã vé": "EVT-102",
        "Ghi chú": "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachKhachMoi");
    XLSX.writeFile(wb, "Mau_Danh_Sach_Khach_Moi_NITEK.xlsx");
  };

  // Process and Insert Excel data into Supabase with Smart Sanitization
  const handleImportSubmit = async () => {
    if (!targetEventId || targetEventId === 'all') {
      return showMsg('Vui lòng chọn Sự kiện cụ thể để nạp danh sách khách mời!', 'error');
    }
    if (excelRows.length === 0) return;
    if (!columnMapping.full_name) {
      return showMsg('Vui lòng chọn cột chứa "Họ và tên" khách mời!', 'error');
    }

    setExcelImporting(true);

    const generatedCodesInBatch = new Set();

    const formattedData = excelRows.map((row, index) => {
      const rawFullName = row[columnMapping.full_name] || '';
      const fullName = cleanFullName(rawFullName);
      
      const rawEmail = columnMapping.email ? row[columnMapping.email] : '';
      const email = rawEmail.trim().toLowerCase();
      
      const rawPhone = columnMapping.phone ? row[columnMapping.phone] : '';
      const phone = cleanPhone(rawPhone);
      
      const company = columnMapping.company ? row[columnMapping.company].trim() : '';
      const notes = columnMapping.notes ? row[columnMapping.notes].trim() : '';
      
      let code = (columnMapping.ticket_code && row[columnMapping.ticket_code]) 
        ? row[columnMapping.ticket_code].trim().toUpperCase()
        : '';
      
      if (!code || generatedCodesInBatch.has(code)) {
        code = generateCustomTicketCode(ticketPrefix);
      }
      generatedCodesInBatch.add(code);

      // Smart VIP detection
      const isVipValue = detectIsVipInRow(row, columnMapping.is_vip, markAllAsVip);

      const obj = {
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        company: company || null,
        ticket_code: code,
        notes: notes || null,
        is_vip: Boolean(isVipValue),
        status: 'pending',
      };

      if (targetEventId && targetEventId !== 'all') {
        obj.event_id = targetEventId;
      }

      return obj;
    }).filter(r => r.full_name !== '');

    if (formattedData.length === 0) {
      setExcelImporting(false);
      return showMsg('Không tìm thấy dòng hợp lệ có chứa họ tên!', 'error');
    }

    const vipCount = formattedData.filter(d => d.is_vip).length;

    const { error } = await supabase.from('attendees').insert(formattedData);

    setExcelImporting(false);

    if (error) {
      showMsg('Lỗi import dữ liệu: ' + error.message, 'error');
      return;
    }

    showMsg(`Đã nạp thông minh thành công ${formattedData.length} khách mời (${vipCount} Khách VIP tự động nhận diện)!`);
    setExcelRows([]);
    setFileName('');
    onAdded?.();
  };

  return (
    <div>
      {/* Form Subtabs */}
      <div className="section-tabs">
        <button
          id="form-tab-single"
          type="button"
          className={`section-tab ${tab === 'single' ? 'active' : ''}`}
          onClick={() => setTab('single')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconPlus size={15} /> Thêm 1 khách mời
        </button>
        <button
          id="form-tab-excel"
          type="button"
          className={`section-tab ${tab === 'excel' ? 'active' : ''}`}
          onClick={() => setTab('excel')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconFileSpreadsheet size={15} /> Import File Excel (.xlsx / .csv)
        </button>
      </div>

      {/* Message alert */}
      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-warning' : 'alert-info'}`} style={{ marginBottom: 16 }}>
          {message.text}
        </div>
      )}

      {/* ── Tab 1: Single Form ── */}
      {tab === 'single' && (
        <form id="add-attendee-form" onSubmit={handleSubmitSingle}>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="input-fullname">
                Họ và tên <span style={{ color: 'var(--accent-danger)' }}>*</span>
              </label>
              <input
                id="input-fullname"
                className="form-input"
                placeholder="VD: Nguyễn Văn A"
                value={form.full_name}
                onChange={e => handleChange('full_name', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-email">Email</label>
              <input
                id="input-email"
                type="email"
                className="form-input"
                placeholder="nguyenvana@example.com"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-phone">Số điện thoại</label>
              <input
                id="input-phone"
                className="form-input"
                placeholder="0901234567"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-company">Đơn vị / Lớp / Công ty</label>
              <input
                id="input-company"
                className="form-input"
                placeholder="VD: Lớp 12A1 / Công ty ABC"
                value={form.company}
                onChange={e => handleChange('company', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="select-event-id">
                Sự kiện đăng ký <span style={{ color: 'var(--accent-danger)' }}>*</span>
              </label>
              <select
                id="select-event-id"
                className="form-select"
                value={form.event_id}
                onChange={e => handleChange('event_id', e.target.value)}
                required
              >
                <option value="">-- Bắt buộc chọn Sự kiện --</option>
                {events.map(evt => {
                  const statusInfo = getEventStatusInfo(evt);
                  return (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} {statusInfo.tagLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="input-ticket-code">Mã vé (QR Code)</label>
              <input
                id="input-ticket-code"
                className="form-input"
                placeholder="Tự động tạo nếu bỏ trống..."
                value={form.ticket_code}
                onChange={e => handleChange('ticket_code', e.target.value.toUpperCase())}
                style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                userSelect: 'none',
                background: form.is_vip ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: form.is_vip ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                transition: 'all 0.2s ease',
              }}>
                <input
                  type="checkbox"
                  id="input-is-vip"
                  checked={form.is_vip}
                  onChange={e => handleChange('is_vip', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#f59e0b', cursor: 'pointer' }}
                />
                <IconCrown size={18} color="#fbbf24" />
                <span style={{ fontWeight: 700, color: form.is_vip ? '#fbbf24' : 'var(--text-primary)', fontSize: 14 }}>
                  Đặt làm Khách VIP (sẽ được tách biệt ở danh mục Khách VIP riêng)
                </span>
              </label>
            </div>
          </div>

          <button
            id="btn-add-attendee"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {loading ? <><span className="loading-spinner" /> Đang thêm…</> : <><IconPlus size={15} /> Thêm khách mới</>}
          </button>
        </form>
      )}

      {/* ── Tab 2: Excel Import ── */}
      {tab === 'excel' && (
        <div>
          {/* Step 1: Event Selection Warning / Selector */}
          <div style={{
            background: targetEventId ? 'rgba(37,99,235,0.08)' : 'rgba(245,158,11,0.12)',
            border: targetEventId ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(245,158,11,0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: 20,
            boxShadow: targetEventId ? 'none' : '0 0 15px rgba(245,158,11,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <IconCalendar size={16} color="var(--accent-primary)" /> BƯỚC 1: CHỌN SỰ KIỆN NẠP KHÁCH MỜI
                  <span style={{ color: 'var(--accent-danger)', fontWeight: 900 }}>*</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Tất cả khách mời trong file Excel sẽ được gán trực tiếp vào Sự kiện được chọn dưới đây.
                </p>
              </div>

              <select
                id="select-import-target-event-step1"
                className="form-select"
                style={{
                  maxWidth: 360,
                  width: '100%',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '10px 14px',
                  background: targetEventId ? 'var(--bg-secondary)' : 'rgba(245,158,11,0.2)',
                  borderColor: targetEventId ? 'var(--accent-primary)' : 'var(--accent-warning)',
                  color: targetEventId ? 'var(--text-primary)' : 'var(--accent-warning)',
                }}
                value={targetEventId}
                onChange={e => setTargetEventId(e.target.value)}
              >
                <option value="">-- Bắt buộc chọn Sự kiện --</option>
                {events.map(evt => {
                  const statusInfo = getEventStatusInfo(evt);
                  return (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} {statusInfo.tagLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <IconTicket size={14} /> Mã chương trình (Tiền tố vé tự tạo):
              </span>
              <input
                id="input-excel-prefix"
                className="form-input"
                style={{ width: 140, textTransform: 'uppercase', fontWeight: 700, padding: '6px 10px', fontSize: 13 }}
                placeholder="MKTN"
                value={ticketPrefix}
                onChange={e => setTicketPrefix(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div className="alert alert-info" style={{ margin: 0, flex: 1 }}>
              Hỗ trợ file <strong>.xlsx, .xls, .csv</strong>. Tự động nhận diện các cột Họ tên, Email, SĐT, Công ty, Mã vé.
            </div>
            <button
              id="btn-download-template"
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={downloadTemplate}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <IconDownload size={14} /> Tải file mẫu Excel (.xlsx)
            </button>
          </div>

          {excelRows.length === 0 ? (
            <div
              className={`dropzone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (!targetEventId) {
                  showMsg('Vui lòng chọn Sự kiện cần nạp trước khi tải file!', 'error');
                }
                fileInputRef.current?.click();
              }}
              role="button"
              aria-label="Upload Excel file"
              id="excel-dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
                id="excel-file-input"
              />
              <div className="dropzone-icon" style={{ opacity: 0.6 }}><IconFileSpreadsheet size={48} color="var(--accent-primary)" /></div>
              <div className="dropzone-title">Kéo & thả file Excel (.xlsx / .csv) vào đây</div>
              <div className="dropzone-subtitle">
                {targetEventId 
                  ? `Sẽ nạp vào sự kiện: "${events.find(e => e.id === targetEventId)?.name}"`
                  : `Vui lòng chọn Sự kiện ở Bước 1 ở trên trước`
                }
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Column mapping configuration */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconSettings size={15} color="var(--accent-primary)" /> Ghép Cột Excel ({fileName})
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Dữ liệu: <strong>{excelRows.length} dòng</strong></span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Họ và tên *</label>
                    <select
                      className="form-select"
                      value={columnMapping.full_name}
                      onChange={e => setColumnMapping(m => ({ ...m, full_name: e.target.value }))}
                    >
                      <option value="">-- Chọn cột --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <select
                      className="form-select"
                      value={columnMapping.email}
                      onChange={e => setColumnMapping(m => ({ ...m, email: e.target.value }))}
                    >
                      <option value="">-- Bỏ qua --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <select
                      className="form-select"
                      value={columnMapping.phone}
                      onChange={e => setColumnMapping(m => ({ ...m, phone: e.target.value }))}
                    >
                      <option value="">-- Bỏ qua --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Công ty / Chức vụ</label>
                    <select
                      className="form-select"
                      value={columnMapping.company}
                      onChange={e => setColumnMapping(m => ({ ...m, company: e.target.value }))}
                    >
                      <option value="">-- Bỏ qua --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mã vé (nếu có)</label>
                    <select
                      className="form-select"
                      value={columnMapping.ticket_code}
                      onChange={e => setColumnMapping(m => ({ ...m, ticket_code: e.target.value }))}
                    >
                      <option value="">-- Tự động tạo --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <IconCrown size={14} color="#fbbf24" /> Cột phân loại VIP (nếu có)
                    </label>
                    <select
                      className="form-select"
                      value={columnMapping.is_vip}
                      onChange={e => setColumnMapping(m => ({ ...m, is_vip: e.target.value }))}
                    >
                      <option value="">-- Bỏ qua --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      userSelect: 'none',
                      background: markAllAsVip ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: markAllAsVip ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                      transition: 'all 0.2s ease',
                      width: '100%',
                    }}>
                      <input
                        type="checkbox"
                        checked={markAllAsVip}
                        onChange={e => setMarkAllAsVip(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#f59e0b', cursor: 'pointer' }}
                      />
                      <IconCrown size={16} color="#fbbf24" />
                      <span style={{ fontWeight: 700, color: markAllAsVip ? '#fbbf24' : 'var(--text-primary)', fontSize: 13 }}>
                        Đánh dấu TẤT CẢ {excelRows.length} khách trong file này là Khách VIP
                      </span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>Sự kiện đích *</label>
                    <select
                      className="form-select"
                      value={targetEventId}
                      onChange={e => setTargetEventId(e.target.value)}
                      style={{ fontWeight: 600 }}
                    >
                      <option value="">-- Bắt buộc chọn Sự kiện --</option>
                      {events.map(evt => {
                        const statusInfo = getEventStatusInfo(evt);
                        return (
                          <option key={evt.id} value={evt.id}>
                            {evt.name} {statusInfo.tagLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview table & actions */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Xem trước <strong>{Math.min(excelRows.length, 10)}</strong> / {excelRows.length} dòng
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      id="btn-excel-cancel"
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setExcelRows([]); setFileName(''); }}
                    >
                      Hủy file
                    </button>
                    <button
                      id="btn-excel-import-confirm"
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleImportSubmit}
                      disabled={excelImporting || !columnMapping.full_name || !targetEventId}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {excelImporting
                        ? <><span className="loading-spinner" /> Đang import…</>
                        : targetEventId
                          ? <><IconRocket size={14} /> Nhập {excelRows.length} khách vào "{events.find(e => e.id === targetEventId)?.name || 'sự kiện'}"</>
                          : `Vui lòng chọn Sự kiện để nhập`
                      }
                    </button>
                  </div>
                </div>

                <div className="table-wrapper" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Họ và tên</th>
                        <th>Email</th>
                        <th>Số điện thoại</th>
                        <th>Công ty</th>
                        <th>Mã vé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelRows.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{row[columnMapping.full_name] || '(Dòng trống)'}</td>
                          <td>{columnMapping.email ? (row[columnMapping.email] || '—') : '—'}</td>
                          <td>{columnMapping.phone ? (row[columnMapping.phone] || '—') : '—'}</td>
                          <td>{columnMapping.company ? (row[columnMapping.company] || '—') : '—'}</td>
                          <td>
                            <span className="ticket-code">
                              {columnMapping.ticket_code && row[columnMapping.ticket_code] 
                                ? row[columnMapping.ticket_code] 
                                : generateCustomTicketCode(ticketPrefix)
                              }
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
