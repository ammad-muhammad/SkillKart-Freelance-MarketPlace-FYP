import client from './client';

export const authAPI = {
  login: (email, password) => 
    client.post('/auth/login', { email, password }),
  
  register: (userData) =>
    client.post('/auth/register/step2', userData),
  
  requestOTP: (email) =>
    client.post('/auth/register/step1', { email }),
  
  verifyOTP: (email, otp) =>
    client.post('/auth/verify-otp', { email, otp }),
  
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