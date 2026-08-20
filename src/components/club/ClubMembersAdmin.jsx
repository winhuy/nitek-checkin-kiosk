import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabaseClient';
import { useClub, generateMemberCode, calculateMemberAbsenceStats, calculateMemberDiligenceScore, isTeacherMember } from '../../contexts/ClubContext';
import {
  IconSearch,
  IconTrash,
  IconFileSpreadsheet,
  IconFolder,
  IconPlus,
  IconUsers,
  IconSchool,
  IconQrCode,
  IconSave,
  IconDownload,
  IconStar,
  IconX,
  IconUser,
  IconEdit,
  IconCheck,
} from '../common/CustomIcons';

// Helper to check if an Excel cell value means empty / blank / "không"
const isBlankOrNoValue = (val) => {
  if (val == null) return true;
  const s = String(val).trim().toLowerCase();
  return !s || s === 'không' || s === 'khong' || s === 'k' || s === 'none' || s === '-' || s === 'n/a' || s === 'null' || s === 'undefined';
};

// Helper to parse Excel class name, converting Excel Serial Date Numbers (e.g. 46152 -> "10/5")
const parseExcelClassName = (val) => {
  if (val == null) return null;
  const str = String(val).trim();
  if (isBlankOrNoValue(str)) return null;

  // If it's a raw Excel date serial number (e.g. 35000 to 60000 -> years 1995 to 2064)
  if (!isNaN(str) && Number(str) > 35000 && Number(str) < 60000) {
    const serial = Number(str);
    const utc_days = Math.floor(serial - 25569);
    const date_info = new Date(utc_days * 86400 * 1000);
    const day = date_info.getDate();
    const month = date_info.getMonth() + 1;
    return `${day}/${month}`;
  }

  // If it's an ISO date string or formatted date string like "2026-05-10" or "5/10/26"
  if (str.includes('-') && str.length >= 8 && !isNaN(Date.parse(str))) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }
  }

  return str;
};

// ─── QR Popup ─────────────────────────────────────────────────────────────
function MemberQRPopup({ member, onClose }) {
  if (!member) return null;

  const downloadQR = () => {
    const svg = document.getElementById(`qr-popup-${member.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 390;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 320, 390);
      ctx.drawImage(img, 35, 20, 250, 250);
      ctx.fillStyle = '#1a1a2e';
      ctx.font = 'bold 16px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(member.full_name, 160, 298);
      ctx.font = '13px Inter,sans-serif';
      ctx.fillStyle = '#4f9cf9';
      ctx.fillText(`Mã: ${member.member_code}${member.class_name ? ` • Lớp: ${member.class_name}` : ''}`, 160, 324);
      ctx.font = '11px Inter,sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText('Thẻ Thành Viên CLB', 160, 348);
      const a = document.createElement('a');
      a.download = `QR_${member.member_code}_${member.full_name}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)', padding: 32, textAlign: 'center',
          maxWidth: 360, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
          Mã QR Thành Viên
        </div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: 20 }}>
          <QRCodeSVG
            id={`qr-popup-${member.id}`}
            value={member.member_code}
            size={200}
            level="H"
            includeMargin
          />
        </div>

        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
          {member.full_name}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          <span className="ticket-code" style={{ fontSize: 13 }}>{member.member_code}</span>
          {member.class_name && (
            <span style={{
              background: 'rgba(79,156,249,0.15)', color: 'var(--accent-primary)',
              padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
              border: '1px solid rgba(79,156,249,0.3)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <IconSchool size={13} /> Lớp: {member.class_name}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            id="btn-download-qr-member"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={downloadQR}
          >
            <IconDownload size={14} /> Tải Xuống QR
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── AddMemberForm (inline) ───────────────────────────────────────────────
function AddMemberForm({ onDone }) {
  const { createMember, members } = useClub();
  const [form, setForm] = useState({ full_name: '', class_name: '', email: '', phone: '', notes: '', member_code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return setError('Vui lòng nhập họ tên!');
    setLoading(true);
    const { error: err } = await createMember({
      ...form,
      member_code: form.member_code.trim().toUpperCase() || generateMemberCode(members),
    });
    setLoading(false);
    if (err) {
      if (err.code === '23505') setError('Mã thành viên đã tồn tại!');
      else setError('Lỗi: ' + err.message);
    } else {
      onDone?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div className="alert alert-warning">{error}</div>}
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="add-member-name">
            Họ và tên <span style={{ color: 'var(--accent-danger)' }}>*</span>
          </label>
          <input
            id="add-member-name"
            className="form-input"
            placeholder="Nguyễn Văn A"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            required autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="add-member-class">
            Lớp / Đơn vị
          </label>
          <input
            id="add-member-class"
            className="form-input"
            placeholder="VD: Lớp 12A1, K65-CNTT..."
            value={form.class_name}
            onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="add-member-code">
            Mã thành viên <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tự sinh nếu bỏ trống)</span>
          </label>
          <input
            id="add-member-code"
            className="form-input"
            placeholder={generateMemberCode(members)}
            value={form.member_code}
            onChange={e => setForm(f => ({ ...f, member_code: e.target.value.toUpperCase() }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="add-member-email">Email</label>
          <input
            id="add-member-email"
            className="form-input"
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="add-member-phone">Số điện thoại</label>
          <input
            id="add-member-phone"
            className="form-input"
            placeholder="0901234567"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="add-member-notes">Ghi chú / Chức vụ</label>
        <input
          id="add-member-notes"
          className="form-input"
          placeholder="VD: Trưởng nhóm, Phó chủ nhiệm CLB..."
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="button" className="btn btn-secondary" onClick={onDone}>Hủy</button>
        <button id="btn-save-new-member" type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} disabled={loading}>
          {loading ? <><span className="loading-spinner" /> Đang thêm…</> : <><IconPlus size={14} /> Thêm Thành Viên</>}
        </button>
      </div>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function ClubMembersAdmin() {
  const { members, sessions, allAttendanceRecords, loadingMembers, deleteMember, deleteAllMembers, updateMember, createMember, fetchMembers } = useClub();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showAddForm, setShowAddForm] = useState(false);
  const [qrMember, setQrMember] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [msg, setMsg] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef();

  const absenceStatsMap = new Map(
    members.map(m => [m.id, calculateMemberAbsenceStats(m.id, sessions, allAttendanceRecords)])
  );

  const diligenceScoreMap = new Map(
    members.map(m => [m.id, calculateMemberDiligenceScore(m.id, sessions, allAttendanceRecords)])
  );

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const filtered = members.filter(m => {
    const st = absenceStatsMap.get(m.id);

    if (filterStatus === 'active' && m.status !== 'active') return false;
    if (filterStatus === 'inactive' && m.status !== 'inactive') return false;
    if (filterStatus === 'consecutive_warning' && st.consecutiveAbsent < 2) return false;

    const q = search.toLowerCase();
    return !q 
      || m.full_name.toLowerCase().includes(q) 
      || m.member_code.toLowerCase().includes(q)
      || (m.class_name || '').toLowerCase().includes(q)
      || (m.email || '').toLowerCase().includes(q) 
      || (m.phone || '').includes(q);
  });

  // ── Edit ─────────────────────────────────────────────────────────────
  const startEdit = (m) => {
    setEditMember(m);
    setEditForm({
      full_name: m.full_name,
      class_name: m.class_name || '',
      email: m.email || '',
      phone: m.phone || '',
      notes: m.notes || '',
      status: m.status,
    });
    setShowAddForm(false);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    const { error } = await updateMember(editMember.id, editForm);
    if (error) showToast('Lỗi cập nhật: ' + error.message, 'error');
    else { showToast('Đã cập nhật thông tin thành công!'); setEditMember(null); }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa thành viên "${name}"? Lịch sử điểm danh của thành viên này cũng bị xóa.`)) return;
    const { error } = await deleteMember(id);
    if (error) showToast('Lỗi xóa: ' + error.message, 'error');
    else showToast('Đã xóa thành viên!');
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ ${members.length} THÀNH VIÊN?\nLịch sử điểm danh liên quan của tất cả thành viên cũng sẽ bị xóa!`)) return;
    const { error } = await deleteAllMembers();
    if (error) showToast('Lỗi xóa toàn bộ: ' + error.message, 'error');
    else showToast('Đã xóa thành công toàn bộ danh sách thành viên!');
  };

  // ── Excel Import ──────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: false, cellText: true, raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
        if (rows.length < 2) return showToast('File không có dữ liệu!', 'error');

        const headers = rows[0].map(h => String(h || '').toLowerCase().trim());
        const getCol = (...keys) => {
          const idx = headers.findIndex(h => keys.some(k => h.includes(k)));
          return idx >= 0 ? idx : -1;
        };

        const iName = getCol('họ', 'tên', 'name');
        const iClass = getCol('lớp', 'class', 'đơn vị', 'khóa');
        const iEmail = getCol('email', 'mail');
        const iPhone = getCol('điện thoại', 'phone', 'sđt', 'tel');
        const iCode = getCol('mã', 'code');
        const iNotes = getCol('ghi chú', 'note', 'chức vụ');

        // Find starting max number for auto code generation
        let maxNum = 0;
        members.forEach(m => {
          if (m.member_code) {
            const match = m.member_code.match(/\d+/);
            if (match) {
              const val = parseInt(match[0], 10);
              if (val > maxNum) maxNum = val;
            }
          }
        });

        let currentCounter = maxNum;
        const toImport = [];
        const dataRows = rows.slice(1);

        for (const row of dataRows) {
          if (!row || row.length === 0) continue;

          let rawName = iName >= 0 ? String(row[iName] || '').trim() : '';
          // Fallback to first cell if header was not matched
          if (isBlankOrNoValue(rawName) && iName < 0) {
            const firstCell = row.find(cell => !isBlankOrNoValue(cell));
            rawName = firstCell ? String(firstCell).trim() : '';
          }

          if (isBlankOrNoValue(rawName)) continue; // skip completely empty rows

          // Check if code was explicitly set and not "không" / "none"
          let codeRaw = iCode >= 0 && row[iCode] ? String(row[iCode]).trim() : '';
          let code = isBlankOrNoValue(codeRaw) ? '' : codeRaw.toUpperCase();

          // Auto-generate code if empty or "không"
          if (!code) {
            currentCounter++;
            code = `CLB-${String(currentCounter).padStart(3, '0')}`;
          }

          const className = iClass >= 0 ? parseExcelClassName(row[iClass]) : null;
          const email = iEmail >= 0 && !isBlankOrNoValue(row[iEmail]) ? String(row[iEmail]).trim() : null;
          const phone = iPhone >= 0 && !isBlankOrNoValue(row[iPhone]) ? String(row[iPhone]).trim() : null;
          const notes = iNotes >= 0 && !isBlankOrNoValue(row[iNotes]) ? String(row[iNotes]).trim() : null;

          toImport.push({
            member_code: code,
            full_name: rawName,
            class_name: className,
            email: email,
            phone: phone,
            notes: notes,
            status: 'active',
          });
        }

        if (toImport.length === 0) return showToast('Không tìm thấy dữ liệu thành viên trong file!', 'error');

        setImportLoading(true);

        // Bulk insert or single loops fallback
        const { error: bulkErr } = await supabase.from('club_members').insert(toImport);

        if (bulkErr) {
          console.warn('Bulk insert error, falling back to individual inserts:', bulkErr.message);
          let successCount = 0;
          for (const m of toImport) {
            const { error: singleErr } = await supabase.from('club_members').insert([m]);
            if (!singleErr) successCount++;
          }
          await fetchMembers();
          setImportLoading(false);
          showToast(`Đã import ${successCount}/${toImport.length} thành viên vào danh sách!`);
        } else {
          await fetchMembers();
          setImportLoading(false);
          showToast(`Đã thêm thành công TẤT CẢ ${toImport.length} thành viên từ file Excel!`);
        }
      } catch (err) {
        setImportLoading(false);
        showToast('Lỗi đọc file Excel: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Excel Export ──────────────────────────────────────────────────────
  const exportExcel = () => {
    const rows = filtered.map((m, i) => ({
      STT: i + 1,
      'Mã Thành Viên': m.member_code,
      'Họ và Tên': m.full_name,
      Lớp: m.class_name || '',
      'Điểm Chuyên Cần': isTeacherMember(m) ? 'Giáo viên' : (diligenceScoreMap.get(m.id) ?? 0),
      Email: m.email || '',
      'Điện Thoại': m.phone || '',
      'Ghi Chú': m.notes || '',
      'Trạng Thái': m.status === 'active' ? 'Hoạt động' : 'Tạm dừng',
      'Ngày Tạo': new Date(m.created_at).toLocaleDateString('vi-VN'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ThanhVienCLB');
    XLSX.writeFile(wb, 'Danh_Sach_Thanh_Vien_CLB.xlsx');
  };

  if (loadingMembers) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <span className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Đang tải danh sách thành viên…</p>
      </div>
    );
  }

  return (
    <div>
      {msg && (
        <div className={`alert ${msg.type === 'error' ? 'alert-warning' : 'alert-info'}`} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          id="search-members"
          className="form-input"
          placeholder="Tìm theo tên, lớp, mã thành viên, SĐT…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <select
          id="filter-member-status"
          className="form-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="all">Tất cả ({members.length})</option>
          <option value="active">Hoạt động ({members.filter(m => m.status === 'active').length})</option>
          <option value="consecutive_warning">Vắng liên tục 2+ buổi ({members.filter(m => (absenceStatsMap.get(m.id)?.consecutiveAbsent ?? 0) >= 2).length})</option>
          <option value="inactive">Tạm dừng ({members.filter(m => m.status === 'inactive').length})</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {members.length > 0 && (
            <button
              id="btn-delete-all-members"
              className="btn btn-danger btn-sm"
              onClick={handleDeleteAll}
              title="Xóa tất cả thành viên trong danh sách"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <IconTrash size={13} /> Xóa Tất Cả ({members.length})
            </button>
          )}
          <button
            id="btn-export-members-excel"
            className="btn btn-secondary btn-sm"
            onClick={exportExcel}
            disabled={filtered.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <IconFileSpreadsheet size={13} /> Xuất Excel
          </button>
          <button
            id="btn-import-members-excel"
            className="btn btn-secondary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            {importLoading ? <><span className="loading-spinner" /> Đang import…</> : <><IconFolder size={13} /> Import Excel</>}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }}
          />
          <button
            id="btn-add-member"
            className="btn btn-primary btn-sm"
            onClick={() => { setShowAddForm(s => !s); setEditMember(null); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            {showAddForm ? <><IconX size={13} /> Đóng</> : <><IconPlus size={13} /> Thêm Thành Viên</>}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && !editMember && (
        <div style={{
          background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)',
          borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconPlus size={15} /> Thêm Thành Viên Mới
          </div>
          <AddMemberForm onDone={() => setShowAddForm(false)} />
        </div>
      )}

      {/* Edit Form */}
      {editMember && (
        <div style={{
          background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#f59e0b' }}>
            Sửa Thông Tin: {editMember.full_name}
          </div>
          <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input className="form-input" value={editForm.full_name}
                  onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Lớp / Đơn vị</label>
                <input className="form-input" value={editForm.class_name}
                  onChange={e => setEditForm(f => ({ ...f, class_name: e.target.value }))} placeholder="VD: Lớp 12A1" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input className="form-input" value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tạm dừng</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú / Chức vụ</label>
              <input className="form-input" value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditMember(null)}>Hủy</button>
              <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconSave size={14} /> Lưu Thay Đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ opacity: 0.5 }}>
            <IconUsers size={40} color="var(--accent-primary)" />
          </div>
          <div className="empty-state-title">
            {members.length === 0 ? 'Chưa có thành viên nào' : 'Không tìm thấy kết quả'}
          </div>
          <div className="empty-state-desc">
            {members.length === 0 ? 'Thêm thành viên đầu tiên của CLB bằng nút bên trên' : 'Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm'}
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Thành viên</th>
                <th>Lớp</th>
                <th><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconStar size={13} color="#f59e0b" /> Điểm chuyên cần</span></th>
                <th>Thống kê vắng mặt</th>
                <th>Mã QR</th>
                <th>Thông tin liên hệ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const st = absenceStatsMap.get(m.id);

                return (
                  <tr key={m.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt=""
                            style={{
                              width: 38, height: 38, borderRadius: '50%',
                              objectFit: 'cover', border: '2px solid var(--accent-primary)', flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: 'var(--accent-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
                          }}>
                            {m.full_name.split(' ').pop().charAt(0)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{m.full_name}</div>
                          <span className="ticket-code" style={{ fontSize: 11 }}>{m.member_code}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {m.class_name ? (
                        <span style={{
                          background: 'rgba(37,99,235,0.12)', color: 'var(--accent-primary)',
                          padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          <IconSchool size={12} /> {m.class_name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        if (isTeacherMember(m)) {
                          return (
                            <span style={{
                              background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                              border: '1px solid rgba(59,130,246,0.3)',
                              padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <IconUser size={13} color="#60a5fa" /> Giáo Viên
                            </span>
                          );
                        }

                        const score = diligenceScoreMap.get(m.id) ?? 0;
                        const scoreBg = score < 0 ? 'rgba(239,68,68,0.15)' : score < 5 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';
                        const scoreColor = score < 0 ? '#ef4444' : score < 5 ? '#f59e0b' : '#10b981';
                        const scoreBorder = score < 0 ? 'rgba(239,68,68,0.4)' : score < 5 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)';

                        return (
                          <span style={{
                            background: scoreBg, color: scoreColor,
                            border: `1px solid ${scoreBorder}`,
                            padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 800,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                            <IconStar size={13} color={scoreColor} /> {score > 0 ? `+${score}` : score}đ
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      {st.totalSessions === 0 ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          — (Chưa có buổi kết thúc)
                        </span>
                      ) : (
                        <>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            Vắng: <strong>{st.totalAbsent}</strong>/{st.totalSessions} buổi
                          </div>
                          {st.consecutiveAbsent >= 2 ? (
                            <span style={{
                              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.4)',
                              padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                              display: 'inline-block', marginTop: 3,
                            }}>
                              Vắng liên tục {st.consecutiveAbsent} buổi
                            </span>
                          ) : st.totalAbsent > 0 ? (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                              ({st.excusedCount} phép, {st.unexcusedCount} không phép)
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                              Tham gia 100%
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      <button
                        id={`btn-show-qr-${m.id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => setQrMember(m)}
                        title="Xem mã QR cá nhân"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <IconQrCode size={13} /> Xem QR
                      </button>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{m.email || '—'}</div>
                      {m.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.phone}</div>}
                    </td>
                    <td>
                      {m.status === 'active' ? (
                        <span className="badge badge-checked-in"><span className="badge-dot" />Hoạt động</span>
                      ) : (
                        <span className="badge badge-pending"><span className="badge-dot" />Tạm dừng</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          id={`btn-edit-member-${m.id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => startEdit(m)}
                          title="Sửa thông tin"
                        >Sửa</button>
                        <button
                          id={`btn-delete-member-${m.id}`}
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(m.id, m.full_name)}
                          title="Xóa thành viên"
                        ><IconTrash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Popup */}
      {qrMember && <MemberQRPopup member={qrMember} onClose={() => setQrMember(null)} />}
    </div>
  );
}
