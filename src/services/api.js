import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const api = {
    // Test connection
    testConnection: async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000');
            return response.data;
        } catch (error) {
            throw new Error('Backend not responding');
        }
    },

    // Download operations
    startDownload: async (data) => {
        return await apiClient.post('/start_download', data);
    },

    // Process Excel
    processExcel: async (filePath) => {
        return await apiClient.post('/process_excel', { file_path: filePath });
    },

    // Logs
    getLogs: async () => {
        return await apiClient.get('/logs');
    },

    // Settings
    getSettings: async () => {
        return await apiClient.get('/settings');
    },

    saveSettings: async (settings) => {
        return await apiClient.post('/settings', settings);
    },

    // Scheduler
    startScheduler: async () => {
        return await apiClient.post('/scheduler/start');
    },

    stopScheduler: async () => {
        return await apiClient.post('/scheduler/stop');
    },

    // Generic GET method for custom endpoints
    get: async (endpoint, config) => {
        return await axios.get(`http://127.0.0.1:8000${endpoint}`, {
            ...config,
            timeout: 30000
        });
    },

    // Generic POST method
    post: async (endpoint, data) => {
        return await axios.post(`http://127.0.0.1:8000${endpoint}`, data, {
            timeout: 30000
        });
    },

    // Generic DELETE method for custom endpoints
    delete: async (endpoint) => {
        return await axios.delete(`http://127.0.0.1:8000${endpoint}`, {
            timeout: 30000
        });
    },

    // File management methods
    getDownloadedFiles: async () => {
        return await apiClient.get('/files/downloaded');
    },

    getProcessedFiles: async () => {
        return await apiClient.get('/files/processed');
    },

    downloadFile: async (fileType, filename) => {
        return await axios.get(
            `http://127.0.0.1:8000/api/files/download/${fileType}/${filename}`,
            {
                responseType: 'blob',
                timeout: 60000
            }
        );
    },

    deleteFile: async (fileType, filename) => {
        return await axios.delete(
            `http://127.0.0.1:8000/api/files/${fileType}/${filename}`,
            {
                timeout: 30000
            }
        );
    },

    getFilesStats: async () => {
        return await apiClient.get('/files/stats');
    }
};

export default api;
