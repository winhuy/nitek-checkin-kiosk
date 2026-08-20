import { useState } from 'react';
import {
  UserGroupIcon,
  Squares2X2Icon,
  CalendarIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

export default function SidebarNav({ activeTab = 'psychologists', onTabChange }) {
  const [collapsed, setCollapsed] = useState(false);

  const mainNavItems = [
    { id: 'psychologists', label: 'Psychologists', icon: UserGroupIcon },
    { id: 'dashboard', label: 'Dashboard', icon: Squares2X2Icon },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'education', label: 'Education', icon: AcademicCapIcon },
    { id: 'blog', label: 'Blog', icon: DocumentTextIcon },
  ];

  const toolNavItems = [
    { id: 'chat', label: 'Chat', icon: ChatBubbleLeftRightIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <aside
      aria-label="Sidebar Navigation"
      style={{
        width: collapsed ? 80 : 250,
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        minHeight: '100vh',
        zIndex: 10,
        position: 'sticky',
        top: 0,
      }}
    >
      <div>
        {/* Brand Logo & Collapse Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, paddingLeft: 8 }}>
          {!collapsed && (
            <a href="#home" style={{ textDecoration: 'none', color: '#2563eb', fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>
              Mentalthy<span style={{ color: '#2563eb' }}>.</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            <ChevronLeftIcon style={{ width: 16, height: 16, transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav aria-label="Main Navigation">
          {/* Section: General */}
          <div style={{ marginBottom: 28 }}>
            {!collapsed && (
              <h2 style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, paddingLeft: 12 }}>
                General
              </h2>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mainNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onTabChange?.(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: collapsed ? '12px' : '12px 16px',
                        borderRadius: 14,
                        border: 'none',
                        backgroundColor: isActive ? '#eff6ff' : 'transparent',
                        color: isActive ? '#2563eb' : '#64748b',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon style={{ width: 20, height: 20, color: isActive ? '#2563eb' : '#64748b', strokeWidth: isActive ? 2.2 : 1.8 }} />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Section: Tools */}
          <div>
            {!collapsed && (
              <h2 style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, paddingLeft: 12 }}>
                Tools
              </h2>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {toolNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onTabChange?.(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: collapsed ? '12px' : '12px 16px',
                        borderRadius: 14,
                        border: 'none',
                        backgroundColor: isActive ? '#eff6ff' : 'transparent',
                        color: isActive ? '#2563eb' : '#64748b',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: 14,
                        cursor: 'pointer',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon style={{ width: 20, height: 20, color: isActive ? '#2563eb' : '#64748b', strokeWidth: isActive ? 2.2 : 1.8 }} />
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>

      {/* Log out Footer */}
      <div>
        <button
          type="button"
          onClick={() => alert('Logged out successfully!')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: collapsed ? '12px' : '12px 16px',
            borderRadius: 14,
            border: 'none',
            backgroundColor: 'transparent',
            color: '#64748b',
            fontWeight: 500,
            fontSize: 14,
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'color 0.15s ease',
          }}
        >
          <ArrowRightOnRectangleIcon style={{ width: 20, height: 20, color: '#64748b', strokeWidth: 1.8 }} />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
