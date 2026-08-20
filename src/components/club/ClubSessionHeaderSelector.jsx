import { useState } from 'react';
import { useClub } from '../../contexts/ClubContext';
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconUsers,
} from '../common/CustomIcons';

export default function ClubSessionHeaderSelector() {
  const { sessions = [], activeSession, setActiveSession, dbAvailable } = useClub();
  const [isOpen, setIsOpen] = useState(false);

  if (!dbAvailable) return null;

  return (
    <div id="club-session-selector-wrapper" style={{ position: 'relative' }}>
      <div
        id="club-session-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        className="event-selector-btn"
      >
        <IconUsers size={15} color="var(--accent-primary)" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.5 }}>
            Buổi sinh hoạt
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeSession ? activeSession.title : 'Chưa chọn buổi'}
          </span>
        </div>
        {activeSession?.status === 'open' && (
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 6px #10b981',
          }} title="Đang mở điểm danh" />
        )}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>▼</span>
      </div>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 999,
              width: 320,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
              padding: 10,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>CHỌN BUỔI SINH HOẠT CLB</span>
              <span style={{ fontSize: 11, color: 'var(--accent-primary)' }}>{sessions.length} buổi</span>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sessions.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Chưa có buổi sinh hoạt nào
                </div>
              ) : (
                sessions.map(s => {
                  const isSelected = activeSession?.id === s.id;
                  const isOpenStatus = s.status === 'open';

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveSession(s);
                        setIsOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: isSelected ? 'var(--accent-primary-alpha)' : 'transparent',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: 13,
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isOpenStatus ? '#10b981' : (s.status === 'scheduled' ? '#3b82f6' : '#64748b'),
                            flexShrink: 0,
                          }} />
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.title}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {s.session_date ? new Date(s.session_date).toLocaleDateString('vi-VN') : 'Chưa định ngày'} • {s.start_time || '08:00'}
                        </span>
                      </div>
                      {isSelected && <IconCheck size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
