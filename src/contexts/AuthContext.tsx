'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (username: string) => Promise<boolean>;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 从 localStorage 和 API 恢复登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedUser = localStorage.getItem('auth_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        // 验证会话是否有效
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUser(data.data);
            localStorage.setItem('auth_user', JSON.stringify(data.data));
          } else {
            setUser(null);
            localStorage.removeItem('auth_user');
          }
        } else if (res.status === 401 && savedUser) {
          // 会话过期，清除状态
          setUser(null);
          localStorage.removeItem('auth_user');
        }
      } catch (e) {
        console.error('Failed to check auth:', e);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const register = useCallback(async (username: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      if (data.success) {
        const userData = { ...data.data, role: data.data.role as 'admin' | 'user' };
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Register failed:', e);
      return false;
    }
  }, []);

  const login = useCallback(async (username: string, password?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: password || '' }),
      });

      const data = await res.json();
      if (data.success) {
        const userData = { ...data.data, role: data.data.role as 'admin' | 'user' };
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login failed:', e);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout failed:', e);
    } finally {
      setUser(null);
      localStorage.removeItem('auth_user');
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    register,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
