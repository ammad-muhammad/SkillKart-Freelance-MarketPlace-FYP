import axios from 'axios';

// Primary signal is Vite's built-in DEV boolean (true during `vite dev`, false in
// production builds) rather than a custom env var that may be unset/misspelled.
// VITE_ENVIRONMENT=production is honoured as an explicit force-silence override,
// so a prod-like build can be muted without changing the build mode.
const forceProd = String(import.meta.env.VITE_ENVIRONMENT).toLowerCase() === 'production';
const isDev = import.meta.env.DEV && !forceProd;

/**
 * Dev-only logging. Errors are intentionally NOT gated — they must always surface,
 * in every environment, so real failures stay diagnosable in production.
 *
 * Use these instead of bare console.* in app code:
 *   log/info/debug → silent in production
 *   warn           → silent in production
 *   error          → always printed
 */
export const log = (...args) => {
  if (isDev) console.log(...args);
};

export const info = (...args) => {
  if (isDev) console.info(...args);
};

export const debug = (...args) => {
  if (isDev) console.debug(...args);
};

export const warn = (...args) => {
  if (isDev) console.warn(...args);
};

// Always logged, in every environment.
export const error = (...args) => {
  console.error(...args);
};

export const isDevMode = isDev;

// Check backend health
export const checkBackend = async (backendUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace('/api/v1','')) => {
  if (!isDev) return false;

  try {
    // Backend health might be at /health (outside /api/v1)
    const res = await axios.get(`${backendUrl}/health`, { timeout: 2000 });
    return res.status === 200;
  } catch {
    return false;
  }
};

// Dynamic dev status logger
export const logStatus = async ({
  debugMode = true,       // Set based on your app state
  hotReloadWorking = true // Can be toggled
} = {}) => {
  if (!isDev) return;

  const backendConnected = await checkBackend();

  const messages = [
    backendConnected ? '🟢 Backend connected!' : '❌ Backend NOT connected!',
    debugMode ? '🔧 Debug mode ON' : '⚠️ Debug mode OFF',
    hotReloadWorking ? '⚡ Hot reload activated' : '⚠️ Hot reload NOT working',
    backendConnected && debugMode && hotReloadWorking
      ? '🚀 App running smoothly'
      : '⚠️ App has some issues',
    '💡 Tip: Keep console open for dev info!'
  ];

  messages.forEach(msg => console.log(msg));
};
