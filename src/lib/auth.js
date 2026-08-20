import { supabase } from './supabaseClient';

const SESSION_KEY = 'nitek_checkin_session';

// ─── SHA-256 using Web Crypto API ─────────────────────────────────────
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Login ────────────────────────────────────────────────────────────
export async function login(username, password) {
  const hash = await hashPassword(password);

  const { data, error } = await supabase
    .from('app_users')
    .select('id, username, role')
    .eq('username', username.trim().toLowerCase())
    .eq('password_hash', hash)
    .limit(1);

  if (error) throw new Error('Lỗi kết nối: ' + error.message);
  if (!data || data.length === 0) throw new Error('Sai tên đăng nhập hoặc mật khẩu');

  const user = data[0];
  const session = {
    id: user.id,
    username: user.username,
    role: user.role,
    loginAt: new Date().toISOString(),
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

// ─── Logout ───────────────────────────────────────────────────────────
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// ─── Get current session ──────────────────────────────────────────────
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Role helpers ─────────────────────────────────────────────────────
export const ROLES = { ADMIN: 'admin', RECEPTION: 'reception' };

export function isAdmin(session) {
  return session?.role === ROLES.ADMIN;
}

export function isReception(session) {
  return session?.role === ROLES.RECEPTION || session?.role === ROLES.ADMIN;
}
