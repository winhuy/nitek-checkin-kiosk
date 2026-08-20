import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { IconLock, IconKey, IconShield } from './common/CustomIcons';

export default function LoginPage({ onSuccess }) {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    try {
      await login(username, password);
      onSuccess?.(); // notify parent to hide login page
    } catch {
      // error handled by context
    }
  };


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src="/logo.jpg"
            alt="NITEK Logo"
            style={{
              width: 84, height: 84,
              borderRadius: '50%', margin: '0 auto 16px',
              objectFit: 'cover',
              border: '1px solid var(--border-color)',
              display: 'block',
            }}
          />
          <h1 style={{
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px',
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}>
            NITEK CHECKIN
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Hệ thống check-in sự kiện thời gian thực
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(37,99,235,0.2)',
            marginBottom: 16,
          }}>
            <IconLock size={32} color="var(--accent-primary)" />
          </div>
          <h2 style={{
            fontSize: 22, fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 6px 0',
          }}>
            ĐĂNG NHẬP HỆ THỐNG
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Dành cho Quản trị viên & Nhân viên Lễ tân NITEK
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">
                Tên đăng nhập
              </label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="admin hoặc reception"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Mật khẩu
              </label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: 13,
                color: 'var(--accent-danger)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !username.trim() || !password.trim()}
              style={{ width: '100%', marginTop: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading
                ? <><span className="loading-spinner" /> Đang đăng nhập…</>
                : <><IconLock size={16} /> Đăng nhập</>
              }
            </button>
          </div>
        </form>
      </div>

      {/* Role info */}
      <div style={{
        marginTop: 24,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        {[
          { role: 'ADMIN', icon: IconKey, desc: 'Quản lý khách mời + Quét QR', color: 'var(--accent-primary)' },
          { role: 'RECEPTION', icon: IconShield, desc: 'Quét QR Check-in', color: 'var(--accent-primary)' },
        ].map(r => {
          const RoleIcon = r.icon;
          return (
            <div key={r.role} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ marginBottom: 4 }}><RoleIcon size={20} color={r.color} /></div>
              <div style={{ fontSize: 12, fontWeight: 700, color: r.color, marginBottom: 2 }}>{r.role}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
}
