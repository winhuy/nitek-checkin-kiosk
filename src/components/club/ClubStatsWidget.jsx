import { useClub } from '../../contexts/ClubContext';
import {
  IconUsers,
  IconCheckCircle,
  IconClock,
  IconChart,
  IconCalendar,
  IconMapPin,
} from '../common/CustomIcons';

export default function ClubStatsWidget() {
  const { activeSession, members = [], dbAvailable } = useClub();

  if (!dbAvailable) return null;

  const totalMembers = members.length;
  const attendedCount = activeSession?.attendance_count || 0;
  const onTimeCount = activeSession?.on_time_count || 0;
  const lateCount = activeSession?.late_count || 0;
  const pendingCount = Math.max(0, totalMembers - attendedCount);

  const pct = totalMembers > 0
    ? Math.round((attendedCount / totalMembers) * 100)
    : 0;

  return (
    <div style={{ marginBottom: 'var(--space-6)' }} className="animate-fade-in">
      {/* Active Session Info Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <IconCalendar size={15} color="var(--accent-primary)" />
          <span>Buổi sinh hoạt CLB:</span>
          {activeSession ? (
            <>
              <strong style={{ color: 'var(--text-primary)' }}>{activeSession.title}</strong>
              {activeSession.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  • <IconMapPin size={14} color="var(--text-muted)" /> {activeSession.location}
                </span>
              )}
              {activeSession.start_time && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  • <IconClock size={14} color="var(--text-muted)" /> {activeSession.start_time}
                </span>
              )}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                background: activeSession.status === 'open' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                color: activeSession.status === 'open' ? '#10b981' : '#3b82f6',
                border: `1px solid ${activeSession.status === 'open' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: activeSession.status === 'open' ? '#10b981' : '#3b82f6',
                  boxShadow: activeSession.status === 'open' ? '0 0 6px #10b981' : 'none',
                }} />
                {activeSession.status === 'open' ? 'Đang Điểm Danh' : 'Đã Lên Lịch'}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Chưa có buổi sinh hoạt đang mở
            </span>
          )}
        </div>

      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Total Members */}
        <div className="stat-card">
          <div className="stat-icon"><IconUsers size={28} color="var(--accent-primary)" /></div>
          <div className="stat-label">Tổng thành viên CLB</div>
          <div className="stat-value primary">{totalMembers}</div>
        </div>

        {/* Attended (This Session) */}
        <div className="stat-card">
          <div className="stat-icon"><IconCheckCircle size={28} color="var(--accent-success)" /></div>
          <div className="stat-label">Đã điểm danh</div>
          <div className="stat-value success">{attendedCount}</div>
          {activeSession && attendedCount > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 8 }}>
              <span style={{ color: '#10b981' }}>Đúng giờ: {onTimeCount}</span>
              {lateCount > 0 && <span style={{ color: '#f59e0b' }}>Trễ: {lateCount}</span>}
            </div>
          )}
        </div>

        {/* Not Checked in yet */}
        <div className="stat-card">
          <div className="stat-icon"><IconClock size={28} color="var(--accent-warning)" /></div>
          <div className="stat-label">Chưa có mặt</div>
          <div className="stat-value warning">{pendingCount}</div>
        </div>

        {/* Attendance Rate */}
        <div className="stat-card">
          <div className="stat-icon"><IconChart size={28} color="var(--accent-primary)" /></div>
          <div className="stat-label">Tỷ lệ điểm danh</div>
          <div className="stat-value primary">{pct}%</div>
          <div className="progress-bar-container">
            <div className="progress-label">
              <span>{attendedCount} / {totalMembers}</span>
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
