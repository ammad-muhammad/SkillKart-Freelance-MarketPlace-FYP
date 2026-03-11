import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // ✅ 30 second timeout
});

client.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    const isAuthRoute = originalRequest.url?.includes('/auth/login') || 
                        originalRequest.url?.includes('/auth/register') ||
                        originalRequest.url?.includes('/auth/otp') ||
                        originalRequest.url?.includes('/auth/refresh');
    
    if (isAuthRoute) {
      return Promise.reject(error);
    }

    // ✅ CASE 9: Network error (no response)
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(error);
    }

    // ✅ CASE 10: 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        tokenManager.triggerLogout('Session expired');
        return Promise.reject(error);
      }
      
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        });
        
        tokenManager.setTokens(
          data.data.accessToken,
          refreshToken
        );
        
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return client(originalRequest);
        
      } catch (refreshError) {
        tokenManager.triggerLogout('Session expired');
        return Promise.reject(refreshError);
      }
    }

    // ✅ CASE 11: 403 Forbidden (account disabled/banned)
    if (error.response?.status === 403) {
      tokenManager.triggerLogout('Access forbidden - account may be disabled');
      return Promise.reject(error);
    }

    // ✅ CASE 12: 429 Too Many Requests
    if (error.response?.status === 429) {
      console.error('Too many requests - rate limited');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default client;