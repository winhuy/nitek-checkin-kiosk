import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const ClubContext = createContext();

// ─── Generate member code ──────────────────────────────────────────────
export function generateMemberCode(membersList = []) {
  if (!Array.isArray(membersList) || membersList.length === 0) {
    return 'CLB-001';
  }
  let maxNum = 0;
  membersList.forEach(m => {
    if (m.member_code) {
      const match = m.member_code.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val > maxNum) maxNum = val;
      }
    }
  });
  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `CLB-${nextNum}`;
}

// ─── Recurrence & Date Helpers ──────────────────────────────────────────
export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Không lặp (Một lần)' },
  { value: 'every_sunday', label: 'Mỗi Chủ Nhật hàng tuần' },
  { value: 'every_saturday', label: 'Mỗi Thứ Bảy hàng tuần' },
  { value: 'every_weekend', label: 'Thứ Bảy & Chủ Nhật hàng tuần' },
  { value: 'weekly', label: 'Hàng tuần (Theo ngày hiện tại)' },
];

export const parseSessionDate = (sessionDateVal) => {
  if (!sessionDateVal) return new Date();
  if (sessionDateVal instanceof Date) return sessionDateVal;

  if (typeof sessionDateVal === 'string') {
    const parts = sessionDateVal.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
  }
  return new Date(sessionDateVal);
};

export const extractCutoffHours = (session) => {
  if (!session) return 2;
  if (session.absence_cutoff_hours !== undefined && session.absence_cutoff_hours !== null && !isNaN(Number(session.absence_cutoff_hours))) {
    return Number(session.absence_cutoff_hours);
  }
  const match = (session.description || '').match(/\[CUTOFF:(\d+)\]/);
  if (match) {
    return Number(match[1]);
  }
  return 2;
};

export const getAbsenceDeadline = (session) => {
  if (!session || !session.session_date) return null;
  const baseDate = parseSessionDate(session.session_date);
  const startTime = session.start_time || '08:00';
  const [hours, minutes] = (startTime || '08:00').split(':').map(Number);

  const sessionStart = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    Number.isFinite(hours) ? hours : 8,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0
  );

  const cutoffHours = extractCutoffHours(session);
  return new Date(sessionStart.getTime() - cutoffHours * 3600 * 1000);
};

export const isAbsenceDeadlinePassed = (session) => {
  const deadline = getAbsenceDeadline(session);
  if (!deadline) return false;
  return new Date() > deadline;
};

export function checkIsLate(session, checkinTime = new Date()) {
  if (!session) return { isLate: false, lateMinutes: 0, status: 'on_time' };

  const startTimeStr = session.start_time || '08:00';
  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const graceMinutes = Number(session.grace_period_minutes ?? 15);

  const now = new Date(checkinTime);
  const baseDate = session.session_date ? parseSessionDate(session.session_date) : now;

  // Construct target scheduled start time on the date of session (local time)
  const scheduledStart = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    Number.isInteger(startHour) ? startHour : 8,
    Number.isInteger(startMin) ? startMin : 0,
    0,
    0
  );

  // Cutoff time includes grace period
  const cutoffTime = new Date(scheduledStart.getTime() + graceMinutes * 60 * 1000);

  if (now > cutoffTime) {
    const diffMs = now.getTime() - scheduledStart.getTime();
    const lateMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return { isLate: true, lateMinutes, status: 'late' };
  }

  return { isLate: false, lateMinutes: 0, status: 'on_time' };
}

// ─── Member Absence & Streak Calculator ────────────────────────────────
export function calculateMemberAbsenceStats(memberId, sessionsList = [], attendanceRecordsList = []) {
  if (!memberId || !Array.isArray(sessionsList) || sessionsList.length === 0) {
    return { totalAbsent: 0, consecutiveAbsent: 0, excusedCount: 0, unexcusedCount: 0, attendedCount: 0, totalSessions: 0 };
  }

  // Only consider sessions that have CLOSED AND whose date has arrived/passed (buổi sinh hoạt đã chính thức kết thúc)
  const now = new Date();
  const closedSessions = sessionsList
    .filter(s => {
      if (s.status !== 'closed') return false;
      // Time-reference safeguard: session date must not be in the future
      if (s.session_date) {
        const d = parseSessionDate(s.session_date);
        d.setHours(23, 59, 59, 999);
        if (d > now) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.session_date || b.created_at) - new Date(a.session_date || a.created_at));

  if (closedSessions.length === 0) {
    return { totalAbsent: 0, consecutiveAbsent: 0, excusedCount: 0, unexcusedCount: 0, attendedCount: 0, totalSessions: 0 };
  }

  let totalAbsent = 0;
  let excusedCount = 0;
  let unexcusedCount = 0;
  let consecutiveAbsent = 0;
  let attendedCount = 0;
  let countingStreak = true;

  for (const s of closedSessions) {
    const isMandatory = s.is_mandatory !== false; // Default true if not explicitly false
    const records = s.club_attendance_records || [];
    const rec = records.find(r => r.member_id === memberId) || attendanceRecordsList.find(r => r.session_id === s.id && r.member_id === memberId);

    const isPresent = rec && (rec.checkin_status === 'on_time' || rec.checkin_status === 'late' || (rec.checked_in_at && rec.checkin_status !== 'excused' && rec.checkin_status !== 'unexcused'));

    if (isPresent) {
      attendedCount++;
      countingStreak = false;
    } else {
      // ONLY count as absent if session is MANDATORY (Bắt buộc)
      // If session is OPTIONAL (Không bắt buộc / Tự nguyện), absence is NOT counted!
      if (isMandatory) {
        totalAbsent++;
        if (rec?.checkin_status === 'excused') {
          excusedCount++;
        } else {
          unexcusedCount++;
        }

        if (countingStreak) {
          consecutiveAbsent++;
        }
      }
    }
  }

  return {
    totalAbsent,
    consecutiveAbsent,
    excusedCount,
    unexcusedCount,
    attendedCount,
    totalSessions: closedSessions.length,
  };
}

// ─── Teacher / Advisor Helper ──────────────────────────────────────────
export function isTeacherMember(member) {
  if (!member) return false;
  const code = (member.member_code || '').toUpperCase();
  const className = (member.class_name || '').toLowerCase();
  const name = (member.full_name || '').toLowerCase();

  return (
    code === 'CLB-018' ||
    code === 'CLB-019' ||
    className.includes('giáo viên') ||
    className.includes('giang vien') ||
    className.includes('cố vấn') ||
    className.includes('co van') ||
    name.startsWith('thầy') ||
    name.startsWith('thay') ||
    name.startsWith('cô') ||
    name.startsWith('co ')
  );
}

// ─── Diligence Score Calculator ─────────────────────────────────────────
// Rules:
// Optional (is_mandatory === false): on_time (+1), late (+0.5), absent (0)
// Mandatory (is_mandatory !== false): on_time (+2), late (+1), excused (0), unexcused / missed (-1)
// Teachers / Advisors (isTeacherMember): null (No score)
export function calculateMemberDiligenceScore(memberInput, sessionsList = [], attendanceRecordsList = []) {
  if (!memberInput) return null;
  const memberId = typeof memberInput === 'object' ? memberInput.id : memberInput;
  const memberObj = typeof memberInput === 'object' ? memberInput : null;

  if (memberObj && isTeacherMember(memberObj)) {
    return null;
  }

  if (!memberId || !Array.isArray(sessionsList) || sessionsList.length === 0) {
    return 0;
  }

  let totalScore = 0;
  const now = new Date();

  sessionsList.forEach(s => {
    const isMandatory = s.is_mandatory !== false; // Default true
    const records = s.club_attendance_records || [];
    const rec = records.find(r => r.member_id === memberId) || attendanceRecordsList.find(r => r.session_id === s.id && r.member_id === memberId);

    if (rec) {
      if (rec.checkin_status === 'on_time') {
        totalScore += isMandatory ? 2 : 1;
      } else if (rec.checkin_status === 'late') {
        totalScore += isMandatory ? 1 : 0.5;
      } else if (rec.checkin_status === 'excused' || rec.checkin_status === 'pending_excuse') {
        totalScore += 0;
      } else if (rec.checkin_status === 'unexcused') {
        totalScore += isMandatory ? -1 : 0;
      }
    } else {
      // No attendance record for this session
      // Penalize -1 ONLY for CLOSED mandatory sessions whose session_date has arrived/passed
      if (isMandatory && s.status === 'closed') {
        if (!s.session_date || new Date(s.session_date) <= now) {
          totalScore -= 1;
        }
      }
    }
  });

  return Math.round(totalScore * 10) / 10;
}

export function ClubProvider({ children }) {
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [dbAvailable, setDbAvailable] = useState(true);

  // ── Fetch members ─────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('club_members')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          setDbAvailable(false);
        } else {
          console.error('club_members fetch error:', error);
        }
        return;
      }
      setDbAvailable(true);
      setMembers(data || []);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // ── Fetch sessions & attendance ─────────
  const fetchSessions = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('club_sessions')
        .select('*, club_attendance_records(id, member_id, checkin_status, checked_in_at, notes, late_minutes, face_photo_data)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('club_sessions fetch error:', error);
        return;
      }

      // Collect all attendance records
      const allRecs = [];
      const formatted = (data || []).map(s => {
        const records = s.club_attendance_records || [];
        records.forEach(r => allRecs.push({ ...r, session_id: s.id }));

        const presentCount = records.filter(r => r.checkin_status === 'on_time' || r.checkin_status === 'late' || (r.checked_in_at && r.checkin_status !== 'excused' && r.checkin_status !== 'unexcused')).length;
        const onTimeCount = records.filter(r => r.checkin_status === 'on_time').length;
        const lateCount = records.filter(r => r.checkin_status === 'late').length;
        const excusedCount = records.filter(r => r.checkin_status === 'excused').length;
        const unexcusedCount = records.filter(r => r.checkin_status === 'unexcused').length;

        const cleanDescription = (s.description || '').replace(/\s*\[CUTOFF:\d+\]\s*/g, '').trim();
        const cutoffHours = extractCutoffHours(s);

        return {
          ...s,
          description: cleanDescription || null,
          absence_cutoff_hours: cutoffHours,
          attendance_count: presentCount,
          on_time_count: onTimeCount,
          late_count: lateCount,
          excused_count: excusedCount,
          unexcused_count: unexcusedCount,
        };
      });

      setAllAttendanceRecords(allRecs);
      setSessions(formatted);
      // Find the most recent open session as active
      const openSession = formatted.find(s => s.status === 'open');
      setActiveSession(openSession || null);

      // ── Time-referencing Auto-healing ──────────────────────────
      // If any future session was marked 'closed' (with 0 checkins), auto-correct it to 'scheduled'
      const now = new Date();
      (data || []).forEach(async (s) => {
        if (s.status === 'closed' && s.session_date && parseSessionDate(s.session_date) > now && (!s.club_attendance_records || s.club_attendance_records.length === 0)) {
          console.log(`Auto-correcting future session "${s.title}" from 'closed' to 'scheduled'`);
          await supabase.from('club_sessions').update({ status: 'scheduled' }).eq('id', s.id);
        }
      });
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // ── Check / Generate Recurring Session on Explicit Action ──
  const checkAutoCreateRecurring = useCallback(async () => {
    if (!supabase) return { created: false, message: 'Supabase client not initialized' };

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, 6 = Saturday
    const dateStr = today.toISOString().split('T')[0];

    // Find any existing recurring session rule
    const { data: recSessions } = await supabase
      .from('club_sessions')
      .select('*')
      .neq('recurrence_rule', 'none');

    if (!recSessions || recSessions.length === 0) {
      return { created: false, message: 'Chưa có buổi sinh hoạt nào cài đặt lịch lặp lại.' };
    }

    let createdCount = 0;

    for (const parent of recSessions) {
      let shouldCreateToday = false;
      const rule = parent.recurrence_rule;
      const parentDayOfWeek = parent.session_date ? new Date(parent.session_date).getDay() : new Date(parent.created_at).getDay();

      if (rule === 'every_sunday' && dayOfWeek === 0) shouldCreateToday = true;
      if (rule === 'every_saturday' && dayOfWeek === 6) shouldCreateToday = true;
      if (rule === 'every_weekend' && (dayOfWeek === 0 || dayOfWeek === 6)) shouldCreateToday = true;
      if (rule === 'weekly' && dayOfWeek === parentDayOfWeek) shouldCreateToday = true;

      if (shouldCreateToday) {
        // Check if session for today already exists
        const { data: todaySessions } = await supabase
          .from('club_sessions')
          .select('id')
          .gte('session_date', `${dateStr}T00:00:00Z`)
          .lte('session_date', `${dateStr}T23:59:59Z`);

        if (!todaySessions || todaySessions.length === 0) {
          const dayName = dayOfWeek === 0 ? 'Chủ Nhật' : dayOfWeek === 6 ? 'Thứ Bảy' : `Thứ ${dayOfWeek + 1}`;
          const title = `${parent.title.replace(/\(.*\)/, '').trim()} (${dayName} ${today.toLocaleDateString('vi-VN')})`;
          
          await supabase.from('club_sessions').insert([{
            title,
            description: parent.description || 'Buổi sinh hoạt định kỳ tự động',
            location: parent.location || 'Phòng sinh hoạt CLB',
            session_date: today.toISOString(),
            start_time: parent.start_time || '08:00',
            grace_period_minutes: parent.grace_period_minutes ?? 15,
            recurrence_rule: parent.recurrence_rule,
            status: 'open',
            created_by: 'user_action',
          }]);

          createdCount++;
        }
      }
    }

    if (createdCount > 0) {
      await fetchSessions();
      return { created: true, message: `Đã tạo thành công ${createdCount} buổi sinh hoạt cho ngày hôm nay!` };
    }

    return { created: false, message: 'Hôm nay không trùng lịch lặp lại của buổi nào hoặc buổi hôm nay đã được tạo rồi.' };
  }, [fetchSessions]);

  // ── Initial fetch + realtime ──────────────────────────────
  useEffect(() => {
    fetchMembers();
    fetchSessions();

    if (!supabase) return;

    const membersChannel = supabase
      .channel('club-members-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_members' }, fetchMembers)
      .subscribe();

    const sessionsChannel = supabase
      .channel('club-sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_sessions' }, fetchSessions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_attendance_records' }, fetchSessions)
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [fetchMembers, fetchSessions]);

  // ── CRUD: Members ─────────────────────────────────────────
  const createMember = async (data) => {
    const { data: inserted, error } = await supabase
      .from('club_members')
      .insert([{
        member_code: data.member_code || generateMemberCode(members),
        full_name: data.full_name.trim(),
        class_name: data.class_name?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
        status: 'active',
      }])
      .select();
    if (!error) await fetchMembers();
    return { data: inserted, error };
  };

  const updateMember = async (id, data) => {
    const payload = {};
    if (data.full_name !== undefined) payload.full_name = data.full_name?.trim();
    if (data.class_name !== undefined) payload.class_name = data.class_name?.trim() || null;
    if (data.email !== undefined) payload.email = data.email?.trim() || null;
    if (data.phone !== undefined) payload.phone = data.phone?.trim() || null;
    if (data.notes !== undefined) payload.notes = data.notes?.trim() || null;
    if (data.status !== undefined) payload.status = data.status;
    if (data.face_descriptor !== undefined) payload.face_descriptor = data.face_descriptor;
    if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;

    const { error } = await supabase
      .from('club_members')
      .update(payload)
      .eq('id', id);
    if (!error) await fetchMembers();
    return { error };
  };


  const deleteMember = async (id) => {
    const { error } = await supabase.from('club_members').delete().eq('id', id);
    if (!error) await fetchMembers();
    return { error };
  };

  const deleteAllMembers = async () => {
    const { error } = await supabase
      .from('club_members')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) await fetchMembers();
    return { error };
  };

  // ── CRUD: Sessions ────────────────────────────────────────
  const updateSessionStatus = async (id, status) => {
    if (!id) return { error: new Error('Thiếu ID buổi sinh hoạt') };

    try {
      // If opening a session, close any currently open sessions first
      if (status === 'open') {
        await supabase
          .from('club_sessions')
          .update({ status: 'closed' })
          .eq('status', 'open');
      }

      const { error } = await supabase
        .from('club_sessions')
        .update({ status })
        .eq('id', id);

      if (!error) {
        await fetchSessions();
      }
      return { error };
    } catch (err) {
      console.error('updateSessionStatus exception:', err);
      return { error: err };
    }
  };

  const createSession = async (data) => {
    const isFutureDate = data.session_date && parseSessionDate(data.session_date) > new Date();
    const targetStatus = data.status || (isFutureDate ? 'scheduled' : 'open');
    const targetDate = data.session_date 
      ? new Date(data.session_date).toISOString() 
      : new Date().toISOString();

    const cutoffHours = Number(data.absence_cutoff_hours ?? 2);
    let desc = (data.description || '').replace(/\s*\[CUTOFF:\d+\]\s*/g, '').trim();
    if (desc) {
      desc = `${desc} [CUTOFF:${cutoffHours}]`;
    } else {
      desc = `[CUTOFF:${cutoffHours}]`;
    }

    const insertPayload = {
      title: data.title.trim(),
      description: desc,
      session_date: targetDate,
      start_time: data.start_time || '08:00',
      grace_period_minutes: Number(data.grace_period_minutes ?? 15),
      absence_cutoff_hours: cutoffHours,
      recurrence_rule: data.recurrence_rule || 'none',
      location: data.location?.trim() || null,
      is_mandatory: data.is_mandatory !== false,
      status: targetStatus,
      created_by: 'admin',
    };

    let { data: inserted, error } = await supabase
      .from('club_sessions')
      .insert([insertPayload])
      .select();

    if (error && (error.message?.includes('absence_cutoff_hours') || error.code === '42703')) {
      console.warn('absence_cutoff_hours column missing. Falling back to insert with description tag.');
      delete insertPayload.absence_cutoff_hours;
      const res = await supabase.from('club_sessions').insert([insertPayload]).select();
      inserted = res.data;
      error = res.error;
    }

    if (!error) {
      await fetchSessions();
      if (inserted?.[0] && targetStatus === 'open') {
        setActiveSession(inserted[0]);
      }
    }
    return { data: inserted, error };
  };

  const updateSession = async (id, data) => {
    const updatePayload = {};
    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.session_date !== undefined) updatePayload.session_date = data.session_date ? new Date(data.session_date).toISOString() : null;
    if (data.start_time !== undefined) updatePayload.start_time = data.start_time || '08:00';
    if (data.grace_period_minutes !== undefined) updatePayload.grace_period_minutes = Number(data.grace_period_minutes);
    if (data.recurrence_rule !== undefined) updatePayload.recurrence_rule = data.recurrence_rule;
    if (data.location !== undefined) updatePayload.location = data.location?.trim() || null;
    if (data.is_mandatory !== undefined) updatePayload.is_mandatory = data.is_mandatory !== false;
    if (data.status !== undefined) updatePayload.status = data.status;

    const cutoffHours = data.absence_cutoff_hours !== undefined ? Number(data.absence_cutoff_hours) : null;
    if (cutoffHours !== null) {
      updatePayload.absence_cutoff_hours = cutoffHours;
    }

    let desc = data.description !== undefined ? (data.description || '').replace(/\s*\[CUTOFF:\d+\]\s*/g, '').trim() : null;
    if (desc !== null) {
      if (cutoffHours !== null) {
        desc = desc ? `${desc} [CUTOFF:${cutoffHours}]` : `[CUTOFF:${cutoffHours}]`;
      }
      updatePayload.description = desc || null;
    } else if (cutoffHours !== null) {
      // If description wasn't explicitly passed, try to preserve/update cutoff in existing session description
      const existing = (sessions || []).find(s => s.id === id);
      let existingDesc = (existing?.description || '').replace(/\s*\[CUTOFF:\d+\]\s*/g, '').trim();
      existingDesc = existingDesc ? `${existingDesc} [CUTOFF:${cutoffHours}]` : `[CUTOFF:${cutoffHours}]`;
      updatePayload.description = existingDesc;
    }

    let { error } = await supabase
      .from('club_sessions')
      .update(updatePayload)
      .eq('id', id);

    if (error && (error.message?.includes('absence_cutoff_hours') || error.code === '42703')) {
      console.warn('absence_cutoff_hours column missing in Supabase DB. Falling back without column.');
      delete updatePayload.absence_cutoff_hours;
      const res = await supabase.from('club_sessions').update(updatePayload).eq('id', id);
      error = res.error;
    }

    if (!error) {
      await fetchSessions();
    }
    return { error };
  };

  const openSession = async (id) => updateSessionStatus(id, 'open');
  const closeSession = async (id) => updateSessionStatus(id, 'closed');
  const reopenSession = async (id) => updateSessionStatus(id, 'open');
  const setSessionScheduled = async (id) => updateSessionStatus(id, 'scheduled');

  const deleteSession = async (id) => {
    const { error } = await supabase.from('club_sessions').delete().eq('id', id);
    if (!error) {
      await fetchSessions();
      if (activeSession?.id === id) setActiveSession(null);
    }
    return { error };
  };

  // ── Attendance & Absence ───────────────────────────────────
  const recordAttendance = async ({ memberId, sessionId, notes, checkinStatus = 'on_time', lateMinutes = 0 }) => {
    const { data, error } = await supabase
      .from('club_attendance_records')
      .insert([{
        member_id: memberId,
        session_id: sessionId,
        checkin_status: checkinStatus,
        late_minutes: lateMinutes,
        notes: notes || null,
      }])
      .select();
    // B4: Removed fetchSessions() here — it was a heavy nested query called on every checkin.
    // Realtime subscription in ClubAttendanceScanner + loadAttendance() already handles UI update.
    return { data, error };
  };

  const markAbsence = async ({ memberId, sessionId, checkinStatus = 'excused', notes = '' }) => {
    const { data: existing } = await supabase
      .from('club_attendance_records')
      .select('id')
      .eq('member_id', memberId)
      .eq('session_id', sessionId)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('club_attendance_records')
        .update({
          checkin_status: checkinStatus,
          notes: notes?.trim() || null,
        })
        .eq('id', existing[0].id);
      await fetchSessions();
      return { error };
    } else {
      const { error } = await supabase
        .from('club_attendance_records')
        .insert([{
          member_id: memberId,
          session_id: sessionId,
          checkin_status: checkinStatus,
          notes: notes?.trim() || null,
        }]);
      await fetchSessions();
      return { error };
    }
  };
  const submitAbsenceRequest = async ({ memberId, sessionId, reason }) => {
    const targetSession = (sessions || []).find(s => s.id === sessionId);
    if (targetSession && isAbsenceDeadlinePassed(targetSession)) {
      const deadline = getAbsenceDeadline(targetSession);
      const deadlineStr = deadline ? deadline.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
      return {
        error: new Error(`Buổi sinh hoạt "${targetSession.title}" đã quá thời hạn gửi đơn báo vắng (Hạn chót: ${deadlineStr}). Vui lòng liên hệ Admin.`)
      };
    }

    const { data: existing } = await supabase
      .from('club_attendance_records')
      .select('id')
      .eq('member_id', memberId)
      .eq('session_id', sessionId)
      .limit(1);

    const notesText = reason?.trim() ? `[ĐƠN XIN BÁO VẮNG]: ${reason.trim()}` : '[ĐƠN XIN BÁO VẮNG] Gửi đơn báo vắng';

    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('club_attendance_records')
        .update({
          checkin_status: 'pending_excuse',
          notes: notesText,
        })
        .eq('id', existing[0].id)
        .select();
      await fetchSessions();
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from('club_attendance_records')
        .insert([{
          member_id: memberId,
          session_id: sessionId,
          checkin_status: 'pending_excuse',
          notes: notesText,
        }])
        .select();
      await fetchSessions();
      return { data, error };
    }
  };

  const reviewAbsenceRequest = async ({ recordId, statusKey = 'excused', notes }) => {
    const updatePayload = { checkin_status: statusKey };
    if (notes !== undefined) updatePayload.notes = notes;

    const { data, error } = await supabase
      .from('club_attendance_records')
      .update(updatePayload)
      .eq('id', recordId)
      .select();

    await fetchSessions();
    return { data, error };
  };

  const markOnTime = async ({ recordId, notes }) => {
    if (!recordId || !supabase) return { error: new Error('Thiếu ID bản ghi') };
    const updatePayload = {
      checkin_status: 'on_time',
      late_minutes: 0,
    };
    if (notes !== undefined) updatePayload.notes = notes;

    const { data, error } = await supabase
      .from('club_attendance_records')
      .update(updatePayload)
      .eq('id', recordId)
      .select();

    await fetchSessions();
    return { data, error };
  };

  const markLate = async ({ recordId, lateMinutes = 1, notes }) => {
    if (!recordId || !supabase) return { error: new Error('Thiếu ID bản ghi') };
    const updatePayload = {
      checkin_status: 'late',
      late_minutes: Number(lateMinutes) || 1,
    };
    if (notes !== undefined) updatePayload.notes = notes;

    const { data, error } = await supabase
      .from('club_attendance_records')
      .update(updatePayload)
      .eq('id', recordId)
      .select();

    await fetchSessions();
    return { data, error };
  };

  const revokeAbsence = async ({ recordId }) => {
    if (!recordId || !supabase) return { error: new Error('Thiếu ID bản ghi') };
    const { error } = await supabase
      .from('club_attendance_records')
      .delete()
      .eq('id', recordId);

    await fetchSessions();
    return { error };
  };

  const fetchAttendanceForSession = async (sessionId) => {
    if (!sessionId || !supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('club_attendance_records')
      .select('*, club_members(id, full_name, member_code, class_name, email, phone)')
      .eq('session_id', sessionId)
      .order('checked_in_at', { ascending: true });
    return { data: data || [], error };
  };

  const fetchAttendanceForMember = async (memberId) => {
    if (!memberId || !supabase) return { data: [], error: null };
    const { data, error } = await supabase
      .from('club_attendance_records')
      .select('*, club_sessions(id, title, session_date, location, start_time)')
      .eq('member_id', memberId)
      .order('checked_in_at', { ascending: false });
    return { data: data || [], error };
  };

  return (
    <ClubContext.Provider value={{
      members,
      sessions,
      allAttendanceRecords,
      activeSession,
      setActiveSession,
      loadingMembers,
      loadingSessions,
      dbAvailable,
      fetchMembers,
      fetchSessions,
      createMember,
      updateMember,
      deleteMember,
      deleteAllMembers,
      createSession,
      updateSession,
      openSession,
      closeSession,
      reopenSession,
      setSessionScheduled,
      updateSessionStatus,
      deleteSession,
      recordAttendance,
      markOnTime,
      markLate,
      markAbsence,
      submitAbsenceRequest,
      reviewAbsenceRequest,
      revokeAbsence,
      fetchAttendanceForSession,
      fetchAttendanceForMember,
      checkAutoCreateRecurring,
      getAbsenceDeadline,
      isAbsenceDeadlinePassed,
    }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used within ClubProvider');
  return ctx;
}
