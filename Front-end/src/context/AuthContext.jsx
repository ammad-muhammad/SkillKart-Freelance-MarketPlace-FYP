import { createContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await authAPI.getCurrentUser();
      setUser(data.data.user);
    } catch (error) {
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      console.log(email, otp)
      const { data } = await authAPI.verifyOTP(email, otp);
      console.log(data)
      // localStorage.setItem('accessToken', data.data.tokens.accessToken);
      // localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
      toast.success('OTP Verifed!');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP Verification Failed');
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await authAPI.login(email, password);
      console.log(data)

      toast.success('Login successful!');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await authAPI.register(userData);

      toast.success('Registration successful!');
      return data;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    toast.info('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      verifyOtp,
      login,
      register,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};