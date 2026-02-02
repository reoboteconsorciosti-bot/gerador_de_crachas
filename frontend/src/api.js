import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Configure axios with timeout
const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 60000, // 60 seconds max
    headers: {
        'Content-Type': 'application/json'
    }
});

export const checkHealth = async () => {
    try {
        const res = await apiClient.get('/health');
        return res.data;
    } catch (error) {
        console.error("Health check failed", error);
        return null;
    }
};

export const generateBatch = async (names, elements) => {
    const res = await apiClient.post('/generate-batch', { names, elements }, {
        responseType: 'blob',
        timeout: 120000 // Longer timeout for batch processing
    });
    return res.data;
};
