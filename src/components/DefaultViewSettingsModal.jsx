import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../contexts/SettingsContext';
import {
  IconSettings,
  IconX,
  IconCheck,
  IconTicket,
  IconUsers,
  IconZap,
  IconSparkles,
} from './common/CustomIcons';

export default function DefaultViewSettingsModal({ isOpen, onClose }) {
  const { defaultLandingView, setDefaultLandingView } = useSettings();
  const [selectedView, setSelectedView] = useState(defaultLandingView);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (view) => {
    setSelectedView(view);
    setSaving(true);
    try {
      await setDefaultLandingView(view);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const options = [
    {
      id: 'auto',
      title: 'Tự động thông minh',
      badge: 'Khuyên Dùng',
      badgeColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeBorder: 'rgba(16, 185, 129, 0.3)',
      icon: IconZap,
      iconColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      description: 'Ưu tiên hiển thị Sự Kiện khi có sự kiện đang/sắp diễn ra; nếu không có sự kiện sẽ tự động chuyển sang CLB & Sinh Hoạt.',
    },
    {
      id: 'event',
      title: 'Sự Kiện & Khách Mời',
      badge: 'Chế độ Event',
      badgeColor: '#3b82f6',
      badgeBg: 'rgba(59, 130, 246, 0.15)',
      badgeBorder: 'rgba(59, 130, 246, 0.3)',
      icon: IconTicket,
      iconColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      description: 'Luôn mặc định mở giao diện Sự Kiện & Khách Mời khi bất kỳ ai truy cập vào trang web.',
    },
    {
      id: 'club',
      title: 'CLB & Sinh Hoạt',
      badge: 'Chế độ CLB',
      badgeColor: '#8b5cf6',
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      badgeBorder: 'rgba(139, 92, 246, 0.3)',
      icon: IconUsers,
      iconColor: '#8b5cf6',
      iconBg: 'rgba(139, 92, 246, 0.15)',
      description: 'Luôn mặc định mở giao diện CLB & Sinh Hoạt (danh sách thành viên, điểm danh) khi truy cập web.',
    },
  ];

  return createPortal(
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 580,
          width: '100%',
          boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <IconSettings size={22} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Cài Đặt Màn Hình Mặc Định
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Chọn giao diện hiển thị đầu tiên khi mở trang web
              </p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: '50%', padding: 0 }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {savedSuccess && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#34d399',
                fontSize: 13,
                fontWeight: 600,
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <IconCheck size={16} color="#34d399" />
              Đã cập nhật cài đặt mặc định thành công!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {options.map((opt) => {
              const IconComp = opt.icon;
              const isSelected = selectedView === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  style={{
                    padding: 16,
                    borderRadius: 'var(--radius-lg)',
                    border: isSelected
                      ? '2px solid var(--accent-primary)'
                      : '1px solid var(--border-color)',
                    background: isSelected
                      ? 'rgba(59, 130, 246, 0.08)'
                      : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                  }}
                  className="settings-option-item"
                >
                  {/* Option Icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: opt.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <IconComp size={22} color={opt.iconColor} />
                  </div>

                  {/* Option Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {opt.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: opt.badgeBg,
                          color: opt.badgeColor,
                          border: `1px solid ${opt.badgeBorder}`,
                        }}
                      >
                        {opt.badge}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#10b981',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <IconCheck size={14} color="#10b981" /> Đang áp dụng
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {opt.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 4,
              padding: '10px 14px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <IconSparkles size={16} color="var(--accent-primary)" />
            <span>
              Cài đặt này sẽ được áp dụng tự động cho tất cả người dùng và khách khi truy cập ứng dụng.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            background: 'rgba(255,255,255,0.01)',
          }}
        >
          <button className="btn btn-primary" onClick={onClose}>
            Xong
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
