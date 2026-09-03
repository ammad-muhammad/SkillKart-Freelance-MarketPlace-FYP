import client from './client';
import { tokenManager } from '../utils/tokenManager';

export const authAPI = {
  login: (email, password) =>
    client.post('/auth/login', { email, password }),

  register: (userData) =>
    client.post('/auth/register/user', userData),

  supabaseAuth: (supabaseAccessToken, supabaseRefreshToken) =>
    client.post('/auth/supabase-auth', { supabaseAccessToken, supabaseRefreshToken }),

  verifyOTP: (email, otp, purpose) =>
    client.post('/auth/otp/verify', { email, otp, purpose }),

  resendOTP: (email, purpose = 'email_verification') =>
    client.post('/auth/otp/resend', { email, purpose }),

  refreshToken: (refreshToken) =>
    client.post('/auth/refresh', { refreshToken }),

  getCurrentUser: () =>
    client.get('/auth/me'),

  checkUsername: (username) =>
    client.get(`/auth/check-username?username=${encodeURIComponent(username)}`),

  // Callers (ClientContext/FreelancerContext.saveProfile, Client/FreelancerSecurity,
  // Client/FreelancerSettings) already show their own contextual toast —
  // suppress the global auto-toast to avoid double-toasting.
  updateMe: (userData) =>
    client.put('/auth/me', userData, { suppressErrorToast: true }),

  updateRole: (role) =>
    client.put('/auth/role/change', role),

  logout: () =>
    client.post('/auth/logout', { refreshToken: tokenManager.getRefreshToken() }),

  logoutAllDevices: () =>
    client.post('/auth/logout-all', undefined, { suppressErrorToast: true }),

  changePassword: (data) =>
    client.post('/auth/password/change', data, { suppressErrorToast: true }),

  confirmChangePassword: (data) =>
    client.post('/auth/password/change/confirm', data, { suppressErrorToast: true }),

  requestPasswordReset: (email) =>
    client.post('/auth/password/reset/request', { email }, { suppressErrorToast: true }),

  resetPassword: (email, otp, newPassword) =>
    client.post('/auth/password/reset', { email, otp, newPassword }),

  requestDeactivation: () =>
    client.post('/auth/deactivate/request', undefined, { suppressErrorToast: true }),

  confirmDeactivation: (otp) =>
    client.post('/auth/deactivate/confirm', { otp }, { suppressErrorToast: true }),

  requestDeletion: () =>
    client.post('/auth/delete/request', undefined, { suppressErrorToast: true }),

  confirmDeletion: (otp) =>
    client.post('/auth/delete/confirm', { otp }, { suppressErrorToast: true }),

  requestEmailChange: (newEmail) =>
    client.post('/auth/email/change/request', { newEmail }, { suppressErrorToast: true }),

  confirmEmailChange: (otp) =>
    client.post('/auth/email/change/confirm', { otp }, { suppressErrorToast: true }),

  requestRecoveryEmailChange: (newRecoveryEmail) =>
    client.post('/auth/recovery-email/change/request', { newRecoveryEmail }, { suppressErrorToast: true }),

  confirmRecoveryEmailChange: (otp) =>
    client.post('/auth/recovery-email/change/confirm', { otp }, { suppressErrorToast: true })
};