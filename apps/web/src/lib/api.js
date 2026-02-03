import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle global errors here (e.g., 401 unauthorized redirect)
        if (error.response?.status === 401) {
            // Logic to handle token expiration or redirect to login could go here
            // But typically Better Auth handles session state
        }
        return Promise.reject(error);
    }
);

export default api;
