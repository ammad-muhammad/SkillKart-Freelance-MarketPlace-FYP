import axios from 'axios';
import { showSafeToast } from '../utils/safeToast';
import { tokenManager } from '../utils/tokenManager';
import { extractApiError } from '../utils/apiError';
import { log } from "../utils/logger";
import { getRecaptchaToken } from "../utils/recaptcha";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Consistent, user-facing copy shown whenever AI is unavailable — devs recognize
// this string and know the AI provider chain is down (rate-limited / timed out /
// unreachable), not a random app bug.
const AI_OUT_OF_SERVICE_MSG = 'AI is temporarily out of service. Please try again in a moment.';

// Is this request an AI request? (any /ai/* or /matchmaking endpoint)
const isAiRequest = (config) => {
  const url = config?.url || '';
  return /(^|\/)ai(\/|$)/.test(url) || url.includes('/matchmaking');
};

// Did this failure come from the AI subsystem? True for AI endpoints, and for
// any 503 (our backend returns 503 when every AI provider is down), and for
// timeouts on AI calls (the long-running provider chain can time out).
const isAiFailure = (error) => {
  const cfg = error?.config;
  if (isAiRequest(cfg)) return true;
  if (error?.response?.status === 503) return true;
  return false;
};

const showToast = (message) => {
  // Uses the dependency-free safeToast (see utils/safeToast.js). It de-dups
  // identical messages internally and can never crash the app the way
  // react-toastify@9 does when it renders under React 19.
  showSafeToast(message, 'error');
};
const toastApiError = (error) => {
  // AI failures always get the single, recognizable "out of service" message,
  // regardless of the raw backend/timeout/network detail.
  if (isAiFailure(error)) {
    showToast(AI_OUT_OF_SERVICE_MSG);
    return;
  }
  const { message } = extractApiError(error);
  showToast(message);
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

/**
 * Endpoints gated by reCAPTCHA v3, mapped to the action the backend expects.
 * Keys are matched against the request path; the action name MUST match the
 * server's verifyRecaptcha(action) or the token is rejected as a replay.
 */
const RECAPTCHA_ACTIONS = {
  '/auth/login': 'login',
  '/auth/register/user': 'register',
  '/public/contact': 'contact',
  '/public/newsletter': 'newsletter'
};

const recaptchaActionFor = (config) => {
  if ((config.method || 'get').toLowerCase() !== 'post') return null;
  const url = config.url || '';
  const match = Object.keys(RECAPTCHA_ACTIONS).find((path) => url.includes(path));
  return match ? RECAPTCHA_ACTIONS[match] : null;
};

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Mint a fresh captcha token per protected submit — v3 tokens are single-use
    // and expire in ~2min, so they can't be cached. Resolves to null (and the
    // backend fails open) if reCAPTCHA is unconfigured or blocked.
    const action = recaptchaActionFor(config);
    if (action) {
      const captcha = await getRecaptchaToken(action);
      if (captcha) config.headers['x-recaptcha-token'] = captcha;
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
      const apiError = extractApiError(error);
      const isBlockedError = apiError.message && apiError.message.toLowerCase().includes('blocked');
      
      if (isBlockedError) {
        window.dispatchEvent(new CustomEvent('account-blocked', { detail: apiError.message }));
      }

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
      if (import.meta.env.DEV) log(`[API Client] Deduplicating in-flight request: ${finalConfig.url}`);
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