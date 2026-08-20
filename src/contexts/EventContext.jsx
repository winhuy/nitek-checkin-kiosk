import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const EventContext = createContext();

const STORAGE_KEY = 'nitek_checkin_selected_event';

export const isEventArchived = (evt) => {
  if (!evt) return false;
  if (evt.status === 'archived' || evt.is_archived === true) return true;
  if (typeof evt.description === 'string' && evt.description.startsWith('[ARCHIVED]')) return true;
  return false;
};

export const cleanEventDescription = (desc) => {
  if (!desc || typeof desc !== 'string') return '';
  return desc.replace(/^\[ARCHIVED\]\s*/, '');
};

export const parseFlexibleDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  if (typeof dateStr === 'number') {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Try standard ISO / Date parse first
  let d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  // Try replace space with 'T' (e.g. "2026-08-23 07:30:00")
  d = new Date(trimmed.replace(' ', 'T'));
  if (!isNaN(d.getTime())) return d;

  // Format: "07:30 23/08/2026" or "07:30:00 23/08/2026"
  const timeDateMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (timeDateMatch) {
    const [, hours, minutes, seconds = '0', day, month, year] = timeDateMatch;
    d = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
    if (!isNaN(d.getTime())) return d;
  }

  // Format: "23/08/2026 07:30" or "23/08/2026 07:30:00" or "23/08/2026"
  const dateTimeMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dateTimeMatch) {
    const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = dateTimeMatch;
    d = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
    if (!isNaN(d.getTime())) return d;
  }

  // Format: "YYYY/MM/DD HH:mm" or "YYYY-MM-DD HH:mm"
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ymdMatch) {
    const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = ymdMatch;
    d = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
};

export const getEventStatusInfo = (evt, referenceDate = new Date()) => {
  if (!evt) {
    return {
      key: 'none',
      label: 'Chưa có sự kiện',
      badgeLabel: 'CHƯA CÓ SỰ KIỆN',
      heroLabel: 'CHƯA CÓ SỰ KIỆN',
      subLabel: 'Chưa có sự kiện',
      tagLabel: '(Chưa có sự kiện)',
      isOngoing: false,
      isCompleted: false,
      isUpcoming: false,
      isArchived: false,
      color: '#9ca3af',
      bg: 'rgba(156, 163, 175, 0.15)',
      border: 'rgba(156, 163, 175, 0.3)',
    };
  }

  if (isEventArchived(evt)) {
    return {
      key: 'archived',
      label: 'Đã lưu trữ',
      badgeLabel: 'ĐÃ LƯU TRỮ',
      heroLabel: 'ĐÃ LƯU TRỮ',
      subLabel: 'Sự kiện đã đưa vào lưu trữ',
      tagLabel: '(Đã lưu trữ)',
      isOngoing: false,
      isCompleted: false,
      isUpcoming: false,
      isArchived: true,
      color: '#c084fc',
      bg: 'rgba(168, 85, 247, 0.15)',
      border: 'rgba(168, 85, 247, 0.3)',
    };
  }

  const now = referenceDate instanceof Date ? referenceDate : (parseFlexibleDate(referenceDate) || new Date());
  const evtDate = parseFlexibleDate(evt.event_date);
  const isFuture = evtDate ? (evtDate.getTime() > now.getTime()) : (evt.status === 'upcoming');

  // 1. If event is in the future (Tham chiếu thời gian thực):
  // Even if DB was set to 'completed', a future event CANNOT be completed!
  if (isFuture) {
    if (evt.status === 'active') {
      return {
        key: 'active',
        label: 'Đang diễn ra',
        badgeLabel: 'ĐANG DIỄN RA',
        heroLabel: 'ĐANG DIỄN RA',
        subLabel: 'Đang diễn ra trực tiếp (Mở sớm)',
        tagLabel: '(Đang diễn ra)',
        isOngoing: true,
        isCompleted: false,
        isUpcoming: false,
        isArchived: false,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.3)',
      };
    }
    return {
      key: 'upcoming',
      label: 'Sắp diễn ra',
      badgeLabel: 'SẮP DIỄN RA',
      heroLabel: 'SỰ KIỆN TIẾP THEO',
      subLabel: 'Chưa bắt đầu • Sắp diễn ra',
      tagLabel: '(Sắp diễn ra)',
      isOngoing: false,
      isCompleted: false,
      isUpcoming: true,
      isArchived: false,
      color: '#60a5fa',
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.3)',
    };
  }

  // 2. If event is past/present (time has arrived or passed):
  if (evt.status === 'completed' || evt.status === 'closed') {
    return {
      key: 'completed',
      label: 'Đã kết thúc',
      badgeLabel: 'ĐÃ KẾT THÚC',
      heroLabel: 'ĐÃ KẾT THÚC',
      subLabel: 'Sự kiện đã kết thúc',
      tagLabel: '(Đã kết thúc)',
      isOngoing: false,
      isCompleted: true,
      isUpcoming: false,
      isArchived: false,
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.15)',
      border: 'rgba(148, 163, 184, 0.3)',
    };
  }

  if (evt.status === 'active' || (evtDate && evtDate.getTime() <= now.getTime())) {
    return {
      key: 'active',
      label: 'Đang diễn ra',
      badgeLabel: 'ĐANG DIỄN RA',
      heroLabel: 'ĐANG DIỄN RA',
      subLabel: 'Đang diễn ra trực tiếp',
      tagLabel: '(Đang diễn ra)',
      isOngoing: true,
      isCompleted: false,
      isUpcoming: false,
      isArchived: false,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)',
    };
  }

  return {
    key: 'upcoming',
    label: 'Sắp diễn ra',
    badgeLabel: 'SẮP DIỄN RA',
    heroLabel: 'SỰ KIỆN TIẾP THEO',
    subLabel: 'Chưa bắt đầu • Sắp diễn ra',
    tagLabel: '(Sắp diễn ra)',
    isOngoing: false,
    isCompleted: false,
    isUpcoming: true,
    isArchived: false,
    color: '#60a5fa',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.3)',
  };
};

export function EventProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventIdState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'all';
  });
  const [loading, setLoading] = useState(true);
  const [sqlMigrationNeeded, setSqlMigrationNeeded] = useState(false);

  const setSelectedEventId = (id) => {
    setSelectedEventIdState(id || 'all');
    if (id && id !== 'all') {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const fetchEvents = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          console.warn('Events table query error (migration may be needed):', error.message);
          setSqlMigrationNeeded(true);
        } else {
          console.error('Failed to fetch events:', error);
        }
        setEvents([]);
      } else {
        // ── Real-time Time-referencing Auto-healing for Events ──────────────────────────
        // If any future event was incorrectly marked 'completed' or 'closed', auto-heal it to 'upcoming'
        const now = new Date();
        const healedData = (data || []).map(evt => {
          const cachedMeta = JSON.parse(localStorage.getItem(`nitek_event_meta_${evt.id}`) || '{}');
          const mergedEvt = {
            ...evt,
            logo_url: evt.logo_url || cachedMeta.logo_url || '',
            welcome_wish: evt.welcome_wish || cachedMeta.welcome_wish || '',
            welcome_wish_vip: evt.welcome_wish_vip || cachedMeta.welcome_wish_vip || '',
          };

          const evtDate = parseFlexibleDate(mergedEvt.event_date);
          const isFuture = evtDate ? (evtDate.getTime() > now.getTime()) : (mergedEvt.status === 'upcoming');
          if ((mergedEvt.status === 'completed' || mergedEvt.status === 'closed') && isFuture && !isEventArchived(mergedEvt)) {
            console.log(`Auto-correcting future event "${mergedEvt.name}" from '${mergedEvt.status}' to 'upcoming' based on real-time reference`);
            supabase.from('events').update({ status: 'upcoming' }).eq('id', mergedEvt.id).then(({ error: updateErr }) => {
              if (updateErr) console.warn('Failed to auto-heal event status:', updateErr.message);
            });
            return { ...mergedEvt, status: 'upcoming' };
          }
          return mergedEvt;
        });

        setEvents(healedData);
        setSqlMigrationNeeded(false);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    if (!supabase) return;

    // Realtime subscription for events table
    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatEventDate = (dateStr) => {
    const d = parseFlexibleDate(dateStr);
    return d ? d.toISOString() : null;
  };

  const createEvent = async (eventData) => {
    if (!supabase) return { error: new Error('Supabase client not initialized') };

    const formattedDate = formatEventDate(eventData.event_date);
    const evtDate = parseFlexibleDate(formattedDate || eventData.event_date);
    const isFuture = evtDate ? (evtDate.getTime() > Date.now()) : false;
    const defaultStatus = isFuture ? 'upcoming' : 'active';
    const finalStatus = eventData.status || defaultStatus;

    const insertObj = {
      name: eventData.name.trim(),
      description: eventData.description?.trim() || null,
      event_date: formattedDate,
      location: eventData.location?.trim() || null,
      status: finalStatus,
    };
    if (eventData.logo_url !== undefined) insertObj.logo_url = eventData.logo_url;
    if (eventData.welcome_wish !== undefined) insertObj.welcome_wish = eventData.welcome_wish;
    if (eventData.welcome_wish_vip !== undefined) insertObj.welcome_wish_vip = eventData.welcome_wish_vip;

    let { data, error } = await supabase
      .from('events')
      .insert([insertObj])
      .select();

    // If column doesn't exist yet, retry without custom columns and save locally
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      console.warn('Database table "events" missing custom columns, retrying standard insert and saving metadata locally...');
      const fallbackRes = await supabase
        .from('events')
        .insert([{
          name: eventData.name.trim(),
          description: eventData.description?.trim() || null,
          event_date: formattedDate,
          location: eventData.location?.trim() || null,
          status: finalStatus,
        }])
        .select();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (!error && data?.[0]) {
      if (eventData.logo_url || eventData.welcome_wish || eventData.welcome_wish_vip) {
        localStorage.setItem(`nitek_event_meta_${data[0].id}`, JSON.stringify({
          logo_url: eventData.logo_url || '',
          welcome_wish: eventData.welcome_wish || '',
          welcome_wish_vip: eventData.welcome_wish_vip || '',
        }));
      }
      await fetchEvents();
      setSelectedEventId(data[0].id);
    }
    return { data, error };
  };

  const updateEvent = async (id, eventData) => {
    if (!supabase) return { error: new Error('Supabase client not initialized') };

    const existingEvent = events.find(e => e.id === id);
    const isArchiving = eventData.status === 'archived';
    const isUnarchiving = eventData.status && eventData.status !== 'archived' && isEventArchived(existingEvent);

    const updatePayload = {};
    if (eventData.name !== undefined) updatePayload.name = eventData.name?.trim();
    if (eventData.description !== undefined) updatePayload.description = eventData.description?.trim() || null;
    if (eventData.event_date !== undefined) updatePayload.event_date = formatEventDate(eventData.event_date);
    if (eventData.location !== undefined) updatePayload.location = eventData.location?.trim() || null;
    if (eventData.status !== undefined) updatePayload.status = eventData.status;
    if (eventData.logo_url !== undefined) updatePayload.logo_url = eventData.logo_url;
    if (eventData.welcome_wish !== undefined) updatePayload.welcome_wish = eventData.welcome_wish;
    if (eventData.welcome_wish_vip !== undefined) updatePayload.welcome_wish_vip = eventData.welcome_wish_vip;

    // Cache metadata locally
    const cachedMeta = JSON.parse(localStorage.getItem(`nitek_event_meta_${id}`) || '{}');
    localStorage.setItem(`nitek_event_meta_${id}`, JSON.stringify({
      ...cachedMeta,
      ...(eventData.logo_url !== undefined ? { logo_url: eventData.logo_url } : {}),
      ...(eventData.welcome_wish !== undefined ? { welcome_wish: eventData.welcome_wish } : {}),
      ...(eventData.welcome_wish_vip !== undefined ? { welcome_wish_vip: eventData.welcome_wish_vip } : {}),
    }));

    // Try standard update first
    let { data, error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', id)
      .select();

    // If column doesn't exist yet, retry without custom columns
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const sanitizedPayload = { ...updatePayload };
      delete sanitizedPayload.logo_url;
      delete sanitizedPayload.welcome_wish;
      delete sanitizedPayload.welcome_wish_vip;

      const retryRes = await supabase
        .from('events')
        .update(sanitizedPayload)
        .eq('id', id)
        .select();
      data = retryRes.data;
      error = retryRes.error;
    }

    // Fallback if Postgres CHECK constraint rejects 'archived' (e.g. status IN ('upcoming', 'active', 'completed'))
    if (error && isArchiving && (error.message?.includes('check constraint') || error.message?.includes('events_status_check'))) {
      console.warn('Database CHECK constraint does not support status="archived". Applying metadata archive fallback...');
      const currentDesc = cleanEventDescription(existingEvent?.description || updatePayload.description || '');
      const archivedDesc = currentDesc ? `[ARCHIVED] ${currentDesc}` : '[ARCHIVED]';
      
      const fallbackPayload = {
        ...updatePayload,
        status: 'completed',
        description: archivedDesc,
      };

      const fallbackRes = await supabase
        .from('events')
        .update(fallbackPayload)
        .eq('id', id)
        .select();

      data = fallbackRes.data;
      error = fallbackRes.error;
    } else if (!error && isUnarchiving) {
      // If unarchiving, clean [ARCHIVED] tag from description
      const cleanedDesc = cleanEventDescription(existingEvent?.description || updatePayload.description || '');
      if (cleanedDesc !== (existingEvent?.description || '')) {
        await supabase
          .from('events')
          .update({ description: cleanedDesc || null })
          .eq('id', id);
      }
    }

    if (!error) {
      await fetchEvents();
    }
    return { data, error };
  };

  const deleteEvent = async (id) => {
    if (!supabase) return { error: new Error('Supabase client not initialized') };

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (!error) {
      if (selectedEventId === id) {
        setSelectedEventId('all');
      }
      await fetchEvents();
    }
    return { error };
  };

  const selectedEvent = events.find(e => e.id === selectedEventId) || null;

  return (
    <EventContext.Provider value={{
      events,
      selectedEventId,
      selectedEvent,
      setSelectedEventId,
      loading,
      fetchEvents,
      createEvent,
      updateEvent,
      deleteEvent,
      sqlMigrationNeeded,
    }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
