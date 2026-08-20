import { useState } from 'react';
import { useEvents, isEventArchived, getEventStatusInfo } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import {
  IconCalendar,
  IconGlobe,
  IconMapPin,
  IconPlus,
  IconCheck,
} from './common/CustomIcons';

export default function EventSelector({ onOpenCreateModal }) {
  const { events, selectedEventId, setSelectedEventId, sqlMigrationNeeded } = useEvents();
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const activeEvents = (Array.isArray(events) ? events : []).filter(e => !isEventArchived(e));
  const selectedEvent = activeEvents.find(e => e.id === selectedEventId);

  return (
    <div id="event-selector-wrapper" style={{ position: 'relative' }}>
      <div
        id="event-selector-button"
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
        <IconCalendar size={15} color="var(--accent-primary)" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 0.5 }}>
            Sự kiện
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedEventId === 'all' ? 'Tất cả sự kiện' : (selectedEvent?.name || 'Chọn sự kiện')}
          </span>
        </div>
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
              <span>CHỌN SỰ KIỆN HOẠT ĐỘNG</span>
              {sqlMigrationNeeded && (
                <span title="Chạy SQL Migration để cập nhật bảng database" style={{ color: '#f59e0b', fontSize: 10 }}>Cần SQL Migration</span>
              )}
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Option: All Events */}
              <button
                id="event-opt-all"
                type="button"
                onClick={() => { setSelectedEventId('all'); setIsOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: selectedEventId === 'all' ? 'var(--accent-primary-alpha)' : 'transparent',
                  color: selectedEventId === 'all' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: selectedEventId === 'all' ? 600 : 400,
                  fontSize: 13,
                  width: '100%',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <IconGlobe size={14} /> Tất cả sự kiện ({activeEvents.length})
                </span>
                {selectedEventId === 'all' && <IconCheck size={14} color="var(--accent-primary)" />}
              </button>

              {/* Event items */}
              {activeEvents.map(evt => {
                const isSelected = selectedEventId === evt.id;
                const statusInfo = getEventStatusInfo(evt);

                return (
                  <button
                    key={evt.id}
                    id={`event-opt-${evt.id}`}
                    type="button"
                    onClick={() => { setSelectedEventId(evt.id); setIsOpen(false); }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: isSelected ? 'rgba(37,99,235,0.12)' : 'transparent',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {evt.name}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 10,
                        background: statusInfo.bg,
                        color: statusInfo.color,
                      }}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {evt.location && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconMapPin size={11} /> {evt.location}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 8, paddingTop: 8 }}>
                <button
                  id="btn-create-event-header"
                  type="button"
                  onClick={() => { setIsOpen(false); onOpenCreateModal?.(); }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--accent-primary)',
                    background: 'transparent',
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <IconPlus size={14} /> Tạo sự kiện mới
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
