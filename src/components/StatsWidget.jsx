import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useEvents, isEventArchived } from '../contexts/EventContext';
import {
  IconUsers,
  IconCheckCircle,
  IconClock,
  IconChart,
  IconCalendar,
  IconMapPin,
} from './common/CustomIcons';

export default function StatsWidget() {
  const { selectedEventId, selectedEvent, events = [] } = useEvents();
  const [stats, setStats] = useState({ total: 0, checkedIn: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const safeEvents = (Array.isArray(events) ? events : []).filter(e => !isEventArchived(e));

  const fetchStats = async () => {
    let query = supabase.from('attendees').select('status');

    if (selectedEventId && selectedEventId !== 'all') {
      query = query.eq('event_id', selectedEventId);
    } else {
      const activeIds = safeEvents.map(e => e.id);
      if (activeIds.length === 0) {
        setStats({ total: 0, checkedIn: 0, pending: 0 });
        setLoading(false);
        return;
      }
      query = query.in('event_id', activeIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    const total = data?.length || 0;
    const checkedIn = data?.filter(r => r.status === 'checked_in').length || 0;
    const pending = total - checkedIn;
    setStats({ total, checkedIn, pending });
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();

    if (!supabase) return;

    // Realtime subscription
    const channel = supabase
      .channel('stats-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendees' },
        () => fetchStats()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [selectedEventId, safeEvents.length]);

  const pct = stats.total > 0
    ? Math.round((stats.checkedIn / stats.total) * 100)
    : 0;

  // When no active events exist (all are archived or none created), do not show Event StatsWidget
  if (safeEvents.length === 0 || loading) return null;

  return (
    <div style={{ marginBottom: 'var(--space-6)' }}>
      {selectedEvent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          <IconCalendar size={15} color="var(--accent-primary)" />
          <span>Sự kiện hiện tại:</span>
          <strong style={{ color: 'var(--text-primary)' }}>{selectedEvent.name}</strong>
          {selectedEvent.location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              • <IconMapPin size={14} color="var(--text-muted)" /> {selectedEvent.location}
            </span>
          )}
        </div>
      )}

      <div className="stats-grid">
        {/* Total */}
        <div className="stat-card">
          <div className="stat-icon"><IconUsers size={28} color="var(--accent-primary)" /></div>
          <div className="stat-label">Tổng khách mời</div>
          <div className="stat-value primary">{stats.total}</div>
        </div>

        {/* Checked in */}
        <div className="stat-card">
          <div className="stat-icon"><IconCheckCircle size={28} color="var(--accent-success)" /></div>
          <div className="stat-label">Đã check-in</div>
          <div className="stat-value success">{stats.checkedIn}</div>
        </div>

        {/* Pending */}
        <div className="stat-card">
          <div className="stat-icon"><IconClock size={28} color="var(--accent-warning)" /></div>
          <div className="stat-label">Chưa đến</div>
          <div className="stat-value warning">{stats.pending}</div>
        </div>

        {/* Progress */}
        <div className="stat-card">
          <div className="stat-icon"><IconChart size={28} color="var(--accent-primary)" /></div>
          <div className="stat-label">Tỷ lệ check-in</div>
          <div className="stat-value primary">{pct}%</div>
          <div className="progress-bar-container">
            <div className="progress-label">
              <span>{stats.checkedIn} / {stats.total}</span>
              <span>{pct}%</span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
