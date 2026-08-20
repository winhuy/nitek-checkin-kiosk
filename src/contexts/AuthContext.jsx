import { createContext, useContext, useState, useCallback } from 'react';
import { login as doLogin, logout as doLogout, getSession, isAdmin, isReception } from '../lib/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const s = await doLogin(username, password);
      setSession(s);
      return s;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setSession(null);
  }, []);

  const value = {
    session,
    loading,
    error,
    login,
    logout,
    isAdmin: isAdmin(session),
    isReception: isReception(session),
    isGuest: !session,
    role: session?.role ?? 'guest',
    username: session?.username ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
