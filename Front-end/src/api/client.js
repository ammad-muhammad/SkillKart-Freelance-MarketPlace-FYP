import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// 🚀 Request Deduplication Layer
// Stores in-flight GET requests to prevent duplicate network calls for identical resources
const pendingRequests = new Map();

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Helper to generate a unique key for a request
const getRequestKey = (config) => {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();
  const params = JSON.stringify(config.params || {});
  return `${method}:${url}:${params}`;
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Safety check for originalRequest
    if (!originalRequest) return Promise.reject(error);

    const isAuthRoute = originalRequest.url?.includes('/auth/login') || 
                        originalRequest.url?.includes('/auth/register') ||
                        originalRequest.url?.includes('/auth/otp') ||
                        originalRequest.url?.includes('/auth/refresh');
    
    if (isAuthRoute) {
      return Promise.reject(error);
    }

    // Network error (no response)
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(error);
    }

    // 401 Unauthorized (token expired)
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
        return axiosInstance(originalRequest);
        
      } catch (refreshError) {
        tokenManager.triggerLogout('Session expired');
        return Promise.reject(refreshError);
      }
    }

    // 403 Forbidden (account disabled/banned)
    if (error.response?.status === 403) {
      tokenManager.triggerLogout('Access forbidden - account may be disabled');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/**
 * 🛡️ Wrapper around axiosInstance to provide automatic request deduplication
 * for in-flight GET requests.
 */
const client = (configOrUrl, config = {}) => {
  // Handle both client(url, config) and client(config) signatures
  const finalConfig = typeof configOrUrl === 'string' 
    ? { ...config, url: configOrUrl } 
    : configOrUrl;

  const method = (finalConfig.method || 'get').toLowerCase();

  // Only deduplicate GET requests
  if (method === 'get') {
    const key = getRequestKey(finalConfig);
    
    if (pendingRequests.has(key)) {
      console.log(`[API Client] Deduplicating in-flight request: ${finalConfig.url}`);
      return pendingRequests.get(key);
    }

    const promise = axiosInstance(finalConfig).finally(() => {
      pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
  }

  return axiosInstance(finalConfig);
};

// Expose standard axios methods
client.get = (url, config) => client({ ...config, url, method: 'get' });
client.post = (url, data, config) => client({ ...config, url, data, method: 'post' });
client.put = (url, data, config) => client({ ...config, url, data, method: 'put' });
client.patch = (url, data, config) => client({ ...config, url, data, method: 'patch' });
client.delete = (url, config) => client({ ...config, url, method: 'delete' });

export default client;