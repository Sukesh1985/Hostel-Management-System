import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { ROLES, STAFF_ROLES } from '../lib/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('hms_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('hms_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('hms_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('hms_token');
    setUser(null);
  };

  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const isAdmin = !!user && user.role === ROLES.ADMIN;
  const isStudent = !!user && user.role === ROLES.STUDENT;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isStaff, isAdmin, isStudent, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
