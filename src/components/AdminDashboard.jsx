import { useState } from 'react';
import { useEvents } from '../contexts/EventContext';
import { useSettings } from '../contexts/SettingsContext';
import AttendeeTable from './AttendeeTable';
import AddAttendeeForm from './AddAttendeeForm';
import EventManagerModal from './EventManagerModal';
import EventStoryModal from './EventStoryModal';
import DefaultViewSettingsModal from './DefaultViewSettingsModal';
import {
  IconDashboard,
  IconCalendar,
  IconUsers,
  IconPlus,
  IconCamera,
  IconSettings,
} from './common/CustomIcons';

export default function AdminDashboard() {
  const { selectedEvent } = useEvents();
  const { defaultLandingView } = useSettings();
  const [tab, setTab] = useState('list'); // 'list' | 'add'
  const [count, setCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showDefaultViewModal, setShowDefaultViewModal] = useState(false);

  const handleAdded = () => {
    setTab('list');
    setRefreshKey(k => k + 1);
  };

  return (
    <div>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconDashboard size={22} color="var(--accent-primary)" /> Admin Dashboard — {selectedEvent ? selectedEvent.name : 'Tất cả sự kiện'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Quản lý danh sách khách mời, tạo sự kiện, xuất ảnh Story 9:16 và import file Excel
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selectedEvent && (
            <button
              id="btn-export-story-dashboard"
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 12px rgba(236,72,153,0.25)',
              }}
              onClick={() => setShowStoryModal(true)}
            >
              <IconCamera size={14} /> Xuất Story 9:16
            </button>
          )}

          <button
            id="btn-manage-events-dashboard"
            className="btn btn-secondary"
            onClick={() => setShowEventModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <IconCalendar size={16} /> Quản lý sự kiện
          </button>

          <button
            id="btn-default-view-dashboard"
            className="btn btn-secondary"
            onClick={() => setShowDefaultViewModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            title="Cài đặt giao diện mở mặc định khi vào web"
          >
            <IconSettings size={16} color="var(--accent-primary)" /> Cài đặt mặc định ({defaultLandingView === 'event' ? 'Sự Kiện' : defaultLandingView === 'club' ? 'CLB' : 'Tự động'})
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="section-tabs">
        <button
          id="admin-tab-list"
          className={`section-tab ${tab === 'list' ? 'active' : ''}`}
          onClick={() => setTab('list')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconUsers size={15} /> Danh sách khách mời
        </button>
        <button
          id="admin-tab-add"
          className={`section-tab ${tab === 'add' ? 'active' : ''}`}
          onClick={() => setTab('add')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <IconPlus size={15} /> Thêm / Import Excel
        </button>
      </div>

      {/* Content */}
      <div className="card">
        {tab === 'list' && (
          <AttendeeTable
            key={refreshKey}
            onCountChange={setCount}
          />
        )}
        {tab === 'add' && (
          <AddAttendeeForm
            onAdded={handleAdded}
            currentCount={count}
          />
        )}
      </div>

      {/* Event Management Modal */}
      <EventManagerModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
      />

      {/* Story 9:16 Modal */}
      {selectedEvent && (
        <EventStoryModal
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
          event={selectedEvent}
        />
      )}

      {/* Default View Settings Modal */}
      <DefaultViewSettingsModal
        isOpen={showDefaultViewModal}
        onClose={() => setShowDefaultViewModal(false)}
      />
    </div>
  );
}
