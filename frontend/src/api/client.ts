import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach Bearer token if stored
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cinego_token') || localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to normalize FastAPI error responses
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string | Array<{ loc: string[]; msg: string; type: string }> }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cinego_token');
      localStorage.removeItem('access_token');
      // If unauthorized, redirect to /login only if not already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        // Optional redirect: window.location.href = '/login';
      }
    }

    let errorMessage = 'An unexpected error occurred';
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((err) => `${err.loc.join('.')}: ${err.msg}`).join(', ');
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;
