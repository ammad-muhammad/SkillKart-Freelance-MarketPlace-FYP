import client from './client';

export const authAPI = {
  login: (email, password) => 
    client.post('/auth/login', { email, password }),
  
  register: (userData) =>
    client.post('/auth/register/user', userData),

  supabaseAuth: (supabaseAccessToken, supabaseRefreshToken) => 
    client.post('/auth/supabase-auth', { supabaseAccessToken, supabaseRefreshToken }),
  
  verifyOTP: (email, otp) =>
    client.post('/auth/otp/verify', { email, otp }),

  resendOTP: (email, purpose = 'email_verification') =>
    client.post('/auth/otp/resend', { email, purpose }),
  
  refreshToken: (refreshToken) =>
    client.post('/auth/refresh', { refreshToken }),

  getCurrentUser: () =>
    client.get('/auth/me'),
  
  logout: () =>
    client.post('/auth/logout'),
  
  changePassword: (currentPassword, newPassword) =>
    client.post('/auth/password/change', { currentPassword, newPassword }),
  
  requestPasswordReset: (email) =>
    client.post('/auth/password/reset/request', { email }),
  
  resetPassword: (email, otp, newPassword) =>
    client.post('/auth/password/reset', { email, otp, newPassword })
};