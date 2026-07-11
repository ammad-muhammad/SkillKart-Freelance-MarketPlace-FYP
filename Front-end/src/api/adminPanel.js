import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE = `${API_URL}/admin-panel`;

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,   // sends admin_token cookie automatically
  headers: { 'Content-Type': 'application/json' }
});

// ─── Interceptors ──────────────────────────────────────────────────────────────

// Response: normalise error and bubble up 401 for session expiry
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status  = err.response?.status;
    const code    = err.response?.data?.code;
    const message = err.response?.data?.message || 'Network error';

    // On session expiry/inactivity → redirect to admin login
    if (status === 401) {
      const isLoginPage = window.location.pathname === '/admin-panel/login';
      if (!isLoginPage) {
        window.location.href = `/admin-panel/login?reason=${code || 'session_expired'}`;
      }
    }

    return Promise.reject({ status, code, message, raw: err.response?.data });
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const adminAuth = {
  login:          (data)      => api.post('/auth/login', data),
  verifyOtp:      (data)      => api.post('/auth/verify-otp', data),
  logout:         ()          => api.post('/auth/logout'),
  getSession:     ()          => api.get('/auth/session'),
  getSessions:    ()          => api.get('/auth/sessions'),
  forceLogout:    (sessionId) => api.post(`/auth/force-logout/${sessionId}`)
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const adminDashboard = {
  getStats:          ()       => api.get('/dashboard/stats'),
  getToday:          ()       => api.get('/dashboard/today'),
  getRecentActivity: ()       => api.get('/dashboard/recent-activity'),
  getGrowth:         (params) => api.get('/dashboard/growth', { params }),
  getHealth:         ()       => api.get('/dashboard/health')
};

// ─── Search ───────────────────────────────────────────────────────────────────

export const adminSearch = {
  global: (q, types) => api.get('/search', { params: { q, types } })
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const adminUsers = {
  list:            (params)       => api.get('/users', { params }),
  getById:         (id)           => api.get(`/users/${id}`),
  edit:            (id, data)     => api.patch(`/users/${id}`, data),
  suspend:         (id, reason)   => api.patch(`/users/${id}/suspend`, { reason }),
  unsuspend:       (id)           => api.patch(`/users/${id}/unsuspend`),
  delete:          (id)           => api.delete(`/users/${id}`),
  getContracts:    (id)           => api.get(`/users/${id}/contracts`),
  getJobs:         (id)           => api.get(`/users/${id}/jobs`),
  getPayments:     (id)           => api.get(`/users/${id}/payments`),
  getWallet:       (id)           => api.get(`/users/${id}/wallet`),
  getDisputes:     (id)           => api.get(`/users/${id}/disputes`),
  getReports:      (id)           => api.get(`/users/${id}/reports`),
  getActivity:     (id)           => api.get(`/users/${id}/activity`),
  exportUrl:       (params)       => `${BASE}/users/export?${new URLSearchParams(params)}`
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const adminJobs = {
  list:      (params)   => api.get('/jobs', { params }),
  getById:   (id)       => api.get(`/jobs/${id}`),
  edit:      (id, data) => api.patch(`/jobs/${id}`, data),
  close:     (id)       => api.patch(`/jobs/${id}/close`),
  reopen:    (id)       => api.patch(`/jobs/${id}/reopen`),
  delete:    (id)       => api.delete(`/jobs/${id}`),
  exportUrl: (params)   => `${BASE}/jobs/export?${new URLSearchParams(params)}`
};

// ─── Contracts ────────────────────────────────────────────────────────────────

export const adminContracts = {
  list:      (params)      => api.get('/contracts', { params }),
  getById:   (id)          => api.get(`/contracts/${id}`),
  addNote:   (id, note)    => api.post(`/contracts/${id}/notes`, { note }),
  exportUrl: (params)      => `${BASE}/contracts/export?${new URLSearchParams(params)}`
};

// ─── Disputes ─────────────────────────────────────────────────────────────────

export const adminDisputes = {
  list:    (params)            => api.get('/disputes', { params }),
  getById: (contractId)        => api.get(`/disputes/${contractId}`),
  resolve: (contractId, data)  => api.post(`/disputes/${contractId}/resolve`, data)
};

// ─── Finance ──────────────────────────────────────────────────────────────────

export const adminPayments = {
  list:       (params)  => api.get('/payments', { params }),
  getSummary: ()        => api.get('/payments/summary'),
  getById:    (id)      => api.get(`/payments/${id}`),
  exportUrl:  (params)  => `${BASE}/payments/export?${new URLSearchParams(params)}`
};

export const adminWallets = {
  list:      (params)         => api.get('/wallets', { params }),
  getByUser: (userId)         => api.get(`/wallets/${userId}`),
  adjust:    (userId, data)   => api.patch(`/wallets/${userId}/adjust`, data),
  freeze:    (userId, reason) => api.patch(`/wallets/${userId}/freeze`, { reason }),
  unfreeze:  (userId)         => api.patch(`/wallets/${userId}/unfreeze`)
};

export const adminWithdrawals = {
  list:      (params)          => api.get('/withdrawals', { params }),
  approve:   (id)              => api.patch(`/withdrawals/${id}/approve`),
  reject:    (id, reason)      => api.patch(`/withdrawals/${id}/reject`, { reason }),
  complete:  (id, referenceId) => api.patch(`/withdrawals/${id}/complete`, { referenceId }),
  exportUrl: (params)          => `${BASE}/withdrawals/export?${new URLSearchParams(params)}`
};

export const adminTransactions = {
  list:      (params)  => api.get('/transactions', { params }),
  exportUrl: (params)  => `${BASE}/transactions/export?${new URLSearchParams(params)}`
};

// ─── Moderation ───────────────────────────────────────────────────────────────

export const adminChat = {
  list:        (params)           => api.get('/chat', { params }),
  getMessages: (conversationId)   => api.get(`/chat/${conversationId}/messages`)
};

export const adminReviews = {
  list:    (params)          => api.get('/reviews', { params }),
  hide:    (id, reason)      => api.patch(`/reviews/${id}/hide`, { reason }),
  restore: (id)              => api.patch(`/reviews/${id}/restore`),
  delete:  (id)              => api.delete(`/reviews/${id}`)
};

export const adminNotifications = {
  broadcast: (data) => api.post('/notifications/broadcast', data)
};

export const adminReports = {
  list:    (params)      => api.get('/reports', { params }),
  getById: (id)          => api.get(`/reports/${id}`),
  assign:  (id)          => api.patch(`/reports/${id}/assign`),
  resolve: (id, data)    => api.patch(`/reports/${id}/resolve`, data),
  dismiss: (id, reason)  => api.patch(`/reports/${id}/dismiss`, { reason })
};

// ─── Monitoring ───────────────────────────────────────────────────────────────

export const adminMonitoring = {
  getSystemLogs: (params) => api.get('/monitoring/system', { params }),
  getEmailLogs:  (params) => api.get('/monitoring/email',  { params }),
  getApiLogs:    (params) => api.get('/monitoring/api',    { params }),
  getErrorLogs:  (params) => api.get('/monitoring/errors', { params }),
  resolveError:  (id)     => api.patch(`/monitoring/errors/${id}/resolve`)
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const adminAuditLogs = {
  list: (params) => api.get('/audit-logs', { params })
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const adminAnalytics = {
  get: (params) => api.get('/analytics', { params })
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const adminSettings = {
  list:   (params)       => api.get('/settings', { params }),
  update: (key, value)   => api.patch(`/settings/${key}`, { value })
};

export default api;
