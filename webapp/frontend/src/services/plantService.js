import api from './api';

const plantService = {
    getPlants: async () => {
        const response = await api.get('/plants');
        return response.data;
    },

    createPlant: async (plantData) => {
        const response = await api.post('/plants', plantData);
        return response.data;
    },

    deletePlant: async (plantId) => {
        const response = await api.delete(`/plants/${plantId}`);
        return response.data;
    },

    updatePlant: async (plantId, plantData) => {
        const response = await api.put(`/plants/${plantId}`, plantData);
        return response.data;
    },
};

export default plantService;
