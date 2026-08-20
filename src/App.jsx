import { Component, useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EventProvider } from './contexts/EventContext';
import { ClubProvider } from './contexts/ClubContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { isConfigured } from './lib/supabaseClient';
import AdminDashboard from './components/AdminDashboard';
import ScannerView from './components/ScannerView';
import StatsWidget from './components/StatsWidget';
import LoginPage from './components/LoginPage';
import PublicView from './components/PublicView';
import EventSelector from './components/EventSelector';
import EventManagerModal from './components/EventManagerModal';
import ClubDashboard from './components/club/ClubDashboard';
import ClubStatsWidget from './components/club/ClubStatsWidget';
import ClubSessionHeaderSelector from './components/club/ClubSessionHeaderSelector';
import KioskScanner from './components/kiosk/KioskScanner';
import ThemePullCord from './components/ThemePullCord';
import {
  IconGlobe,
  IconScanner,
  IconUsers,
  IconDashboard,
  IconKey,
  IconShield,
  IconLock,
  IconLogout,
  IconClock,
  IconAlertTriangle,
  IconRefresh,
  IconSettings,
  IconX,
} from './components/common/CustomIcons';
import MentalthyDashboard from './components/mentalthy/MentalthyDashboard';

// ─── Error Boundary Safeguard ──────────────────────────────────────────
class ComponentErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ComponentErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 32, textAlign: 'center', background: 'var(--bg-card)',
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)',
          margin: '24px 0',
        }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <IconAlertTriangle size={40} color="#ef4444" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
            Đã xảy ra lỗi khi hiển thị giao diện ({this.props.name || 'Module'})
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
            {this.state.error?.message || 'Lỗi không xác định'}
          </p>
          <button
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            <IconRefresh size={16} /> Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Setup Screen (no .env) ────────────────────────────────────────────
function SetupScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '48px 40px', maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <IconSettings size={56} color="var(--accent-primary)" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>NITEK CHECKIN — Cần cấu hình</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 14, lineHeight: 1.6 }}>
          Ứng dụng cần kết nối Supabase để hoạt động.<br />Tạo file <code>.env</code> theo hướng dẫn bên dưới.
        </p>
        <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'rgba(79,156,249,0.07)', border: '1px solid rgba(79,156,249,0.2)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--accent-primary)' }}>Tạo file .env</div>
            <pre style={{ fontSize: 12, color: '#4ade80', background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: 8, overflowX: 'auto', margin: 0 }}>
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
            </pre>
          </div>
        </div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 6 }} className="btn btn-primary btn-lg" id="btn-refresh-app">
          <IconRefresh size={18} /> Reload
        </button>
      </div>
    </div>
  );
}

// ─── Realtime Clock Component ─────────────────────────────────────────
// ─── useWindowSize Hook ───────────────────────────────────────────────
function useWindowSize() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

function RealtimeClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  let timeStr = '';
  let dateStr = '';
  try {
    timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    dateStr = time.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  } catch (_e) {
    const now = new Date();
    timeStr = now.toTimeString().split(' ')[0] || '';
    dateStr = now.toLocaleDateString() || '';
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      padding: '4px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
      whiteSpace: 'nowrap', flexShrink: 0,
      boxShadow: 'var(--shadow-sm)',
    }} title="Thời gian thực của hệ thống">
      <IconClock size={14} color="var(--accent-primary)" />
      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: 0.5 }}>
        {timeStr}
      </span>
      <span style={{ color: 'var(--border-color)', fontSize: 10 }}>|</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
        {dateStr}
      </span>
    </div>
  );
}

// ─── Role Badge ────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    admin:     { label: 'ADMIN',     color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',     icon: IconKey },
    reception: { label: 'RECEPTION', color: '#0284c7', bg: 'rgba(2,132,199,0.15)',     icon: IconShield },
  };
  const cfg = map[role];
  if (!cfg) return null;
  const IconComp = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20, fontSize: 11,
      fontWeight: 700, letterSpacing: 1,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}40`,
    }}>
      <IconComp size={14} color={cfg.color} /> {cfg.label}
    </span>
  );
}

// ─── Main App Shell (after auth check) ────────────────────────────────
function AppShell() {
  const { session, isAdmin, isReception, isGuest, logout, role } = useAuth();
  const [activeTab, setActiveTab] = useState('public');
  const [showLogin, setShowLogin] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'kiosk' || params.get('kiosk') === 'true';
    } catch (_) {
      return false;
    }
  });

  const windowWidth = useWindowSize();
  const isSmallMobile = windowWidth <= 480;
  const isMobile = windowWidth <= 768;

  // Available tabs based on role with custom vector icons
  const tabs = [
    { id: 'public',    label: 'Trang Công Khai',  icon: IconGlobe, always: true },
    { id: 'scanner',   label: 'Soát Vé Event',    icon: IconScanner, show: isReception },
    { id: 'club',      label: 'CLB Điểm Danh',    icon: IconUsers, show: isReception },
    { id: 'admin',     label: 'Quản Lý',          icon: IconDashboard, show: isAdmin },
  ].filter(t => t.always || t.show);

  // Reset tab if no longer accessible
  const validTab = tabs.find(t => t.id === activeTab) ? activeTab : 'public';

  // Hide login page after successful login
  const handleLogout = () => { logout(); setShowLogin(false); setActiveTab('public'); };

  // If in dedicated Kiosk Mode (for reTerminal DM / Fullscreen Wall Panel)
  if (isKioskMode) {
    return <KioskScanner onExitKiosk={() => setIsKioskMode(false)} />;
  }

  return (
    <div className="app-layout">
      {/* ── Liquid Ambient Backdrop (GPU Composited) ── */}
      <div className="liquid-ambient-backdrop" aria-hidden="true" />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          {/* Brand */}
          <div className="header-brand">
            <img
              src="/logo.jpg"
              alt="NITEK Logo"
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--border-color)',
              }}
            />
            <div className="header-brand-text">
              <h1>NITEK CHECKIN</h1>
              <span>Robotics & IoT Club</span>
            </div>
          </div>

          {/* Navigation — rendered only when there are multiple tabs */}
          {tabs.length > 1 && (
            <nav className="nav-tabs" role="tablist">
              {tabs.map(tab => {
                const TabIcon = tab.icon;
                const isActive = validTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    aria-selected={isActive}
                    className={`nav-tab ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <TabIcon size={16} color={isActive ? '#ffffff' : 'var(--text-secondary)'} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Event selector or Club Session selector + Realtime Clock + Right side: role + auth */}
          <div className="header-controls">
            {validTab === 'club' ? (
              <ClubSessionHeaderSelector />
            ) : (
              <EventSelector onOpenCreateModal={() => setShowEventModal(true)} />
            )}
            {!isSmallMobile && <RealtimeClock />}
            {!isMobile && <span className="realtime-dot header-hide-mobile">LIVE</span>}
            {isGuest ? (
              <button
                id="btn-header-login"
                className="btn btn-primary btn-sm"
                onClick={() => setShowLogin(s => !s)}
              >
                {showLogin ? <><IconX size={14} /> Đóng</> : <><IconLock size={14} /> Đăng nhập</>}
              </button>
            ) : (
              <div className="header-user-badge">
                <RoleBadge role={role} />
                <span className="header-username header-hide-mobile">
                  {session.username}
                </span>
                <button
                  id="btn-logout"
                  className="btn btn-secondary btn-sm"
                  onClick={handleLogout}
                  title="Đăng xuất"
                >
                  <IconLogout size={14} /> <span className="header-hide-mobile">Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="app-main">
        {/* Login Page — slides in when guest clicks Đăng nhập */}
        {showLogin && isGuest && (
          <LoginPage onSuccess={() => setShowLogin(false)} />
        )}

        {/* Main app content */}
        {!(showLogin && isGuest) && (
          <ComponentErrorBoundary name="Chính">
            {/* Stats row: Club attendance stats in CLB tab, Event stats in other tabs */}
            {!isGuest && (
              validTab === 'club' ? <ClubStatsWidget /> : <StatsWidget />
            )}

            {/* Public view: checked-in list */}
            <div hidden={validTab !== 'public'}>
              <PublicView />
            </div>

            {/* Scanner: reception + admin */}
            {isReception && (
              <div hidden={validTab !== 'scanner'}>
                <ScannerView isActive={validTab === 'scanner'} />
              </div>
            )}

            {/* CLB Attendance: reception + admin */}
            {isReception && (
              <div hidden={validTab !== 'club'}>
                <ClubDashboard isActive={validTab === 'club'} />
              </div>
            )}

            {/* Admin dashboard */}
            {isAdmin && (
              <div hidden={validTab !== 'admin'}>
                <AdminDashboard />
              </div>
            )}
          </ComponentErrorBoundary>
        )}
      </main>

      {/* Theme Toggle Pull Cord */}
      <ThemePullCord />

      {/* Global Event Manager Modal */}
      <EventManagerModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        initialMode="create"
      />
    </div>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────
export default function App() {
  if (!isConfigured) return <SetupScreen />;

  return (
    <ComponentErrorBoundary name="Hệ Thống">
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <EventProvider>
              <ClubProvider>
                <AppShell />
              </ClubProvider>
            </EventProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ComponentErrorBoundary>
  );
}
