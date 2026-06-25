import axios from 'axios';
import { toast } from 'react-toastify';
import { tokenManager } from '../utils/tokenManager';
import { extractApiError } from '../utils/apiError';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Global error-toast de-dup: avoid showing the same message twice when a form
// also surfaces it. Tracks the last toasted message + timestamp.
let lastToast = { msg: '', at: 0 };
const toastApiError = (error) => {
  const { message } = extractApiError(error);
  if (!message) return;
  const now = Date.now();
  if (message === lastToast.msg && now - lastToast.at < 2000) return;
  lastToast = { msg: message, at: now };
  toast.error(message);
};

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

    // Auth routes own their UX (the login/register forms render their own
    // errors); don't double-toast those.
    if (isAuthRoute) {
      return Promise.reject(error);
    }

    // Opt-out: a caller can set { suppressErrorToast: true } to handle the
    // error entirely on its own (e.g. live skill-validate typeahead).
    const suppress = originalRequest.suppressErrorToast;

    // Network error (no response)
    if (!error.response) {
      console.error('Network error:', error.message);
      if (!suppress) toastApiError(error);
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

    // 403 Forbidden — the user IS authenticated but not allowed THIS resource.
    // This must NOT log the user out: a single forbidden sub-resource (e.g. an
    // endpoint guarded for a different role) should not destroy a valid session.
    // Let the calling code handle the 403 locally. We only end the session on a
    // genuine auth failure (401 with a failed refresh, handled above).
    // Note: skill-gating 403s carry their own UX (a "take the test" prompt), so
    // we don't toast those generically — the caller handles them.
    if (error.response?.status === 403) {
      const gated = error.response?.data?.errors?.skillTestRequired;
      if (!suppress && !gated) toastApiError(error);
      return Promise.reject(error);
    }

    // Everything else (400/404/409/422/429/5xx): surface the backend message.
    if (!suppress) toastApiError(error);
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
      if (import.meta.env.DEV) console.log(`[API Client] Deduplicating in-flight request: ${finalConfig.url}`);
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