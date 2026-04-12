import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type User = { id: string; name: string; email: string; role?: string; subscription?: any };

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const stored = await AsyncStorage.getItem('auth_token');
      if (stored) {
        const res = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${stored}` } });
        if (res.ok) { const data = await res.json(); setUser(data); setToken(stored); }
        else { await AsyncStorage.removeItem('auth_token'); }
      }
    } catch (e) { console.error('Auth check error:', e); }
    finally { setLoading(false); }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(typeof err.detail === 'string' ? err.detail : 'Login failed'); }
    const data = await res.json();
    await AsyncStorage.setItem('auth_token', data.token); setToken(data.token); setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(typeof err.detail === 'string' ? err.detail : 'Registration failed'); }
    const data = await res.json();
    await AsyncStorage.setItem('auth_token', data.token); setToken(data.token); setUser(data.user);
  };

  const guestLogin = async () => {
    const res = await fetch(`${API_URL}/api/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error('Guest login failed');
    const data = await res.json();
    await AsyncStorage.setItem('auth_token', data.token); setToken(data.token); setUser(data.user);
  };

  const logout = async () => { await AsyncStorage.removeItem('auth_token'); setToken(null); setUser(null); };

  const refreshUser = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const data = await res.json(); setUser(data); }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, guestLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
