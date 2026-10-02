import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = cargando

  useEffect(() => {
    api.get('/session').then(setSession).catch(() => setSession(null));
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/login', { email, password });
    setSession(data);
    return data;
  };

  const logout = async () => {
    await api.post('/logout');
    setSession(null);
  };

  const refresh = () =>
    api.get('/session').then(setSession).catch(() => setSession(null));

  function canDo(action) {
    if (!session?.user) return false;
    const { role, menuPermisos } = session.user;
    if (role === 'admin') return true;
    if (!menuPermisos) return true;
    if (Array.isArray(menuPermisos)) return true; // formato viejo: concede todas las acciones
    return Array.isArray(menuPermisos.acciones) && menuPermisos.acciones.includes(action);
  }

  return (
    <AuthContext.Provider value={{ session, login, logout, refresh, canDo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
