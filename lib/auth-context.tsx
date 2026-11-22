'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, TOKEN_KEY } from './api';
import type { AuthResponse, Profile, User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ambil data user dari token yang tersimpan
  const loadProfile = useCallback(async () => {
    try {
      const profile = await api.get<Profile>('/auth/profile');
      setUser({ id: profile.id, email: profile.email });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  // Saat aplikasi pertama dibuka: kalau ada token, coba pulihkan sesi
  useEffect(() => {
    async function init() {
      if (localStorage.getItem(TOKEN_KEY)) {
        await loadProfile();
      }
      setLoading(false);
    }
    init();
  }, [loadProfile]);

  // Logout / login di tab lain: token di localStorage berubah -> samakan tab ini
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== TOKEN_KEY) return;
      if (!e.newValue) setUser(null);
      else loadProfile();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadProfile]);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.access_token);
    await loadProfile();
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/register', { name, email, password });
    localStorage.setItem(TOKEN_KEY, res.access_token);
    await loadProfile();
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}
