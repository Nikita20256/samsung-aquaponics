/*
 * Контекст авторизации с поддержкой isAdmin
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import adminService from '../services/adminService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setTokenState] = useState(() => authService.getToken());
    const [deviceId, setDeviceId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Загрузка device_id и проверка isAdmin при наличии токена
    useEffect(() => {
        const fetchUserData = async () => {
            if (!token) {
                setLoading(false);
                setIsAdmin(false);
                return;
            }

            try {
                // Получаем данные устройства
                const data = await authService.getDevice();
                setDeviceId(data.device_id);
                setError(null);

                // Проверяем права админа
                try {
                    const adminCheck = await adminService.checkAdmin();
                    setIsAdmin(adminCheck.isAdmin);
                } catch {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error('Failed to fetch user data:', err);
                setError('Не удалось получить данные пользователя');
                if (err.response?.status === 401 || err.response?.status === 403) {
                    logout();
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [token]);

    const setToken = useCallback((newToken) => {
        if (newToken) {
            authService.setToken(newToken);
        } else {
            authService.removeToken();
        }
        setTokenState(newToken);
    }, []);

    const login = useCallback(async (username, password) => {
        setLoading(true);
        setError(null);
        try {
            const data = await authService.login(username, password);
            setToken(data.token);
            return { success: true };
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Ошибка входа';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [setToken]);

    const register = useCallback(async (username, password, deviceSecret, email = null) => {
        setLoading(true);
        setError(null);
        try {
            await authService.register(username, password, deviceSecret, email);
            return { success: true };
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Ошибка регистрации';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setDeviceId(null);
        setIsAdmin(false);
        setError(null);
    }, [setToken]);

    const value = {
        token,
        deviceId,
        isAdmin,
        loading,
        error,
        isAuthenticated: !!token,
        setToken,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
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

export default AuthContext;
