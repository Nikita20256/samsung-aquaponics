import api from './api';

const adminService = {
    getUsers: async () => {
        const response = await api.get('/admin/users');
        return response.data;
    },

    getDevices: async () => {
        const response = await api.get('/admin/devices');
        return response.data;
    },

    getStats: async () => {
        const response = await api.get('/admin/stats');
        return response.data;
    },

    createDevice: async (deviceId, secret) => {
        const response = await api.post('/admin/devices', { device_id: deviceId, secret });
        return response.data;
    },

    toggleAdmin: async (userId) => {
        const response = await api.post(`/admin/users/${userId}/toggle-admin`);
        return response.data;
    },

    deleteUser: async (userId) => {
        const response = await api.delete(`/admin/users/${userId}`);
        return response.data;
    },

    deleteDevice: async (deviceId) => {
        const response = await api.delete(`/admin/devices/${deviceId}`);
        return response.data;
    },

    unbindDevice: async (deviceId, userId) => {
        const response = await api.delete(`/admin/devices/${deviceId}/users/${userId}`);
        return response.data;
    },

    checkAdmin: async () => {
        const response = await api.get('/admin/check');
        return response.data;
    }
};

export default adminService;
