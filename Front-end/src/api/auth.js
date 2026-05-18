import client from './client';

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

  updateMe: (userData) =>
    client.put('/auth/me', userData),

  updateRole: (role) =>
    client.put('/auth/role/change', role),

  logout: () =>
    client.post('/auth/logout'),

  changePassword: (data) =>
    client.post('/auth/password/change', data),

  confirmChangePassword: (data) =>
    client.post('/auth/password/change/confirm', data),

  requestPasswordReset: (email) =>
    client.post('/auth/password/reset/request', { email }),

  resetPassword: (email, otp, newPassword) =>
    client.post('/auth/password/reset', { email, otp, newPassword }),

  requestDeactivation: () =>
    client.post('/auth/deactivate/request'),

  confirmDeactivation: (otp) =>
    client.post('/auth/deactivate/confirm', { otp }),

  requestEmailChange: (newEmail) =>
    client.post('/auth/email/change/request', { newEmail }),

  confirmEmailChange: (otp) =>
    client.post('/auth/email/change/confirm', { otp }),

  requestRecoveryEmailChange: (newRecoveryEmail) =>
    client.post('/auth/recovery-email/change/request', { newRecoveryEmail }),

  confirmRecoveryEmailChange: (otp) =>
    client.post('/auth/recovery-email/change/confirm', { otp })
};