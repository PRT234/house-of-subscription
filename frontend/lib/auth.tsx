'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from './api';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  auth_provider: string;
  date_joined: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('hos_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await api.get<User>('/api/auth/me');
        setUser(currentUser);
        localStorage.setItem('hos_user', JSON.stringify(currentUser));
      } catch (err) {
        console.error('Failed to restore user session:', err);
        localStorage.removeItem('hos_token');
        localStorage.removeItem('hos_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/api/auth/login', { email, password });
    localStorage.setItem('hos_token', res.access_token);
    localStorage.setItem('hos_user', JSON.stringify(res.user));
    if (typeof document !== 'undefined') {
      document.cookie = `hos_token=${res.access_token}; path=/; max-age=86400; SameSite=Lax`;
    }
    setUser(res.user);
    router.push('/dashboard');
  };

  const signup = async (email: string, password: string, displayName: string) => {
    const res = await api.post<AuthResponse>('/api/auth/signup', {
      email,
      password,
      display_name: displayName,
    });
    localStorage.setItem('hos_token', res.access_token);
    localStorage.setItem('hos_user', JSON.stringify(res.user));
    if (typeof document !== 'undefined') {
      document.cookie = `hos_token=${res.access_token}; path=/; max-age=86400; SameSite=Lax`;
    }
    setUser(res.user);
    router.push('/dashboard');
  };

  const googleLogin = async (idToken: string) => {
    const res = await api.post<AuthResponse>('/api/auth/google', { id_token: idToken });
    localStorage.setItem('hos_token', res.access_token);
    localStorage.setItem('hos_user', JSON.stringify(res.user));
    if (typeof document !== 'undefined') {
      document.cookie = `hos_token=${res.access_token}; path=/; max-age=86400; SameSite=Lax`;
    }
    setUser(res.user);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('hos_token');
    localStorage.removeItem('hos_user');
    if (typeof document !== 'undefined') {
      document.cookie = 'hos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
