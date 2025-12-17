import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    }
});

export const api = {
    testConnection: async () => {
        try {
            const response = await axios.get('http://127.0.0.1:8000/');
            return response.data;
        } catch (error) {
            throw new Error('Backend not responding');
        }
    },

    startDownload: async (data) => {
        return await apiClient.post('/start_download', data);
    },

    processExcel: async (filePath) => {
        return await apiClient.post('/process_excel', { file_path: filePath });
    },

    getLogs: async () => {
        return await apiClient.get('/logs');
    },

    getSettings: async () => {
        return await apiClient.get('/settings');
    },

    saveSettings: async (settings) => {
        return await apiClient.post('/settings', settings);
    },

    startScheduler: async () => {
        return await apiClient.post('/scheduler/start');
    },

    stopScheduler: async () => {
        return await apiClient.post('/scheduler/stop');
    },

    // ===== ADD THESE NEW METHODS FOR FILE MANAGEMENT =====

    // Generic GET method for custom endpoints
    get: async (endpoint, config = {}) => {
        return await axios.get(`http://127.0.0.1:8000${endpoint}`, {
            ...config,
            timeout: 30000
        });
    },

    // Generic DELETE method for custom endpoints
    delete: async (endpoint) => {
        return await axios.delete(`http://127.0.0.1:8000${endpoint}`, {
            timeout: 30000
        });
    },

    // Specific file management methods (optional but cleaner)
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
            { timeout: 30000 }
        );
    },

    getFilesStats: async () => {
        return await apiClient.get('/files/stats');
    }
};

export default api;
