import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const authError = params.get('auth_error');

        if (token) {
            localStorage.setItem('voraz_token', token);
            window.history.replaceState({}, '', '/');
        }
        if (authError) {
            window.history.replaceState({}, '', '/');
        }

        const storedToken = localStorage.getItem('voraz_token');
        if (storedToken) {
            getMe(storedToken)
                .then(userData => {
                    if (userData) setUser(userData);
                    else localStorage.removeItem('voraz_token');
                })
                .finally(() => setLoadingAuth(false));
        } else {
            setLoadingAuth(false);
        }
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('voraz_token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('voraz_token');
        setUser(null);
    };

    const refreshUser = async () => {
        const token = localStorage.getItem('voraz_token');
        if (!token) return;
        const userData = await getMe(token);
        if (userData) setUser(userData);
    };

    const getToken = () => localStorage.getItem('voraz_token');

    return (
        <AuthContext.Provider value={{ user, loadingAuth, login, logout, refreshUser, getToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
