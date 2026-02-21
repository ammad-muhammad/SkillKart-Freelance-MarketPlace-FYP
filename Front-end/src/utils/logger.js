import axios from 'axios';

// Check if we are in development
const isDev = import.meta.env.VITE_ENVIONMENT === 'Development';

// Generic log function
export const log = (...args) => {
  if (isDev) console.log(...args);
};

// Check backend health
export const checkBackend = async (backendUrl = import.meta.env.VITE_API_URL.replace('/api/v1','')) => {
  if (!isDev) return false;

  try {
    // Backend health might be at /health (outside /api/v1)
    const res = await axios.get(`${backendUrl}/health`, { timeout: 2000 });
    return res.status === 200;
  } catch (err) {
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
