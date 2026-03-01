import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser as apiLogin, registerUser as apiRegister, getMe } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('voraz_token');
    if (token) {
      getMe(token)
        .then(userData => {
          if (userData) setUser(userData);
          else localStorage.removeItem('voraz_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = async (email, password) => {
    try {
      setError(null);
      const data = await apiLogin({ email, password });
      localStorage.setItem('voraz_token', data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      return false;
    }
  };

  const registerUser = async (payload) => {
    try {
      setError(null);
      const data = await apiRegister(payload);
      localStorage.setItem('voraz_token', data.token);
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.message || 'Error al registrarse');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('voraz_token');
    setUser(null);
  };

  const getToken = () => localStorage.getItem('voraz_token');

  const refreshUser = async () => {
    const token = localStorage.getItem('voraz_token');
    if (!token) return;
    const userData = await getMe(token);
    if (userData) setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, registerUser, logout, loading, error, setError, getToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
