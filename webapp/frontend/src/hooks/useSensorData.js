/**
 * Хук для работы с данными датчиков
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import sensorService from '../services/sensorService';
import config from '../config/api';

export function useSensorData(deviceId) {
    const [currentData, setCurrentData] = useState({
        humidity: null,
        light: null,
        temperature: null,
        water: null,
        lightSwitches: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);

    const fetchCurrentData = useCallback(async () => {
        if (!deviceId) return;

        try {
            const data = await sensorService.getAllCurrent(deviceId);
            setCurrentData({
                humidity: data.humidity ?? null,
                light: data.light ?? null,
                temperature: data.temperature ?? null,
                water: data.water ?? 0,
                lightSwitches: data.lightSwitches ?? 0,
            });
            setError(null);
        } catch (err) {
            console.error('Failed to fetch sensor data:', err);
            setError('Не удалось получить данные датчиков');
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    // Первоначальная загрузка и интервал обновления
    useEffect(() => {
        if (!deviceId) {
            setLoading(false);
            return;
        }

        fetchCurrentData();
        intervalRef.current = setInterval(fetchCurrentData, config.refreshInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [deviceId, fetchCurrentData]);

    const refresh = useCallback(() => {
        fetchCurrentData();
    }, [fetchCurrentData]);

    return {
        ...currentData,
        loading,
        error,
        refresh,
    };
}

export function useHistoricalData(deviceId, startDate, endDate) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!deviceId) return;

        setLoading(true);
        try {
            const result = await sensorService.getAllHistory(deviceId, startDate, endDate);
            setData(result);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch historical data:', err);
            setError('Не удалось загрузить исторические данные');
        } finally {
            setLoading(false);
        }
    }, [deviceId, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refresh: fetchData,
    };
}

export function useControlModes(deviceId) {
    const [modes, setModes] = useState({ light: 'auto', aeration: 'auto' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchModes = useCallback(async () => {
        if (!deviceId) return;

        try {
            const data = await sensorService.getControlModes(deviceId);
            setModes(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch control modes:', err);
            setError('Не удалось получить режимы управления');
        } finally {
            setLoading(false);
        }
    }, [deviceId]);

    useEffect(() => {
        fetchModes();
    }, [fetchModes]);

    const setLightMode = useCallback(async (mode) => {
        try {
            const result = await sensorService.setLightMode(deviceId, mode);
            setModes(result.modes);
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Не удалось изменить режим' };
        }
    }, [deviceId]);

    const setAerationMode = useCallback(async (mode) => {
        try {
            const result = await sensorService.setAerationMode(deviceId, mode);
            setModes(result.modes);
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Не удалось изменить режим' };
        }
    }, [deviceId]);

    return {
        modes,
        loading,
        error,
        setLightMode,
        setAerationMode,
        refresh: fetchModes,
    };
}
