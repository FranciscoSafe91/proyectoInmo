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

  return (
    <AuthContext.Provider value={{ session, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
