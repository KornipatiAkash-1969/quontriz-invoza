import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [tokenExpiry, setTokenExpiry] = useState(() => {
    const saved = localStorage.getItem('tokenExpiry');
    return saved ? Number(saved) : null;
  });
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  // Safe global fallback for any cached bundles
  if (typeof window !== 'undefined') {
    window.setSessionExpiredNotice = setSessionExpiredNotice;
  }

  const logout = useCallback(() => {
    // Clear cookie on server
    authApi.logout().catch(() => {});
    setToken(null);
    setUser(null);
    setTokenExpiry(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
  }, []);

  // Periodic check for daily midnight (12:00 AM) token expiration
  useEffect(() => {
    const checkExpiration = () => {
      const expiry = localStorage.getItem('tokenExpiry');
      if (expiry && Date.now() >= Number(expiry)) {
        console.warn('[AuthContext] Daily midnight 12:00 AM reached. Session expired. Automatically logging out.');
        logout('midnight_expired');
      }
    };

    // Check immediately
    checkExpiration();

    // Check every 10 seconds for real-time midnight logout
    const interval = setInterval(checkExpiration, 10000);
    return () => clearInterval(interval);
  }, [logout]);

  // Listen to 401 unauthorized events from Axios interceptor
  useEffect(() => {
    const handleUnauthorized = (e) => {
      console.warn('[AuthContext] Received unauthorized event:', e.detail?.message);
      logout('unauthorized');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [logout]);

  // Validate session on boot with backend (via cookie / localStorage)
  useEffect(() => {
    async function verifySession() {
      const currentToken = localStorage.getItem('token');
      const currentExpiry = localStorage.getItem('tokenExpiry');

      if (currentExpiry && Date.now() >= Number(currentExpiry)) {
        logout('expired');
        setLoading(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (res && res.user) {
          setUser(res.user);
          localStorage.setItem('user', JSON.stringify(res.user));
          if (res.expiresAt) {
            setTokenExpiry(res.expiresAt);
            localStorage.setItem('tokenExpiry', String(res.expiresAt));
          }
          if (!currentToken) {
            setToken('cookie-session');
          }
        } else {
          if (currentToken) logout('expired');
        }
      } catch (err) {
        if (currentToken) {
          console.warn('[AuthContext] Server rejected session token:', err.message);
          logout('expired');
        }
      } finally {
        setLoading(false);
      }
    }
    verifySession();
  }, [logout]);

  const handleAuthSuccess = (res) => {
    const { token: newToken, user: newUser } = res;
    const nextMidnightTime = (() => {
      const now = new Date();
      const m = new Date(now);
      m.setDate(m.getDate() + 1);
      m.setHours(0, 0, 0, 0);
      return m.getTime();
    })();
    const expiresAt = res.expiresAt || nextMidnightTime;

    setToken(newToken);
    setUser(newUser);
    setTokenExpiry(expiresAt);
    setSessionExpiredNotice(false);

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('tokenExpiry', String(expiresAt));

    return newUser;
  };

  const login = async (email, password, portalRole = null, otp = null) => {
    const res = await authApi.login({ email, password, portalRole, otp });
    if (res && res.requiresOtp) {
      return res;
    }
    return handleAuthSuccess(res);
  };

  const loginWithOtp = async (email, otp, portalRole = null) => {
    const res = await authApi.verifyLoginOtp({ email, otp, portalRole });
    return handleAuthSuccess(res);
  };

  const registerWithOtp = async (formData) => {
    const res = await authApi.verifyRegisterOtp(formData);
    return handleAuthSuccess(res);
  };

  const isOwner = user?.role === 'owner';
  const isStaff = user?.role === 'staff' || user?.role === 'employee';
  const isEmployee = isStaff;
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        tokenExpiry,
        loading,
        isAuthenticated,
        isOwner,
        isStaff,
        isEmployee,
        login,
        loginWithOtp,
        registerWithOtp,
        logout,
        sessionExpiredNotice,
        setSessionExpiredNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
