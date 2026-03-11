// src/pages/AuthConsent.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'react-toastify';

const AuthConsent = () => {
  const navigate = useNavigate();
  const { handleSupabaseOAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasProcessed = useRef(false); // ✅ Prevent multiple calls

  useEffect(() => {
    // ✅ Skip if already processed
    if (hasProcessed.current) {
      return;
    }

    const processOAuthCallback = async () => {
      try {
        console.log('🔐 Processing OAuth callback...');

        // Extract tokens from URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');

        // Handle errors
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          setError(errorDescription || 'Authentication failed');
          toast.error(errorDescription || 'Login failed');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Validate tokens
        if (!accessToken) {
          console.error('No access token received');
          setError('No access token received');
          toast.error('Authentication failed - no token received');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        console.log('✅ Tokens received from Supabase');

        // Decode and log user info
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          // console.log('👤 User email:', payload.email);
          // console.log('🔑 Provider:', payload.app_metadata?.provider);
        } catch (e) {
          console.warn('Could not decode token:', e);
        }

        // ✅ Mark as processed BEFORE making API call
        hasProcessed.current = true;

        // ✅ Clear the hash to prevent re-processing
        window.history.replaceState(null, '', window.location.pathname);

        // Send to backend
        const response = await handleSupabaseOAuth(accessToken, refreshToken);

        console.log('✅ Authentication successful', response?.user);

        const userRole = response?.data?.user?.role;
        const isOnboardingcompleted = response?.data?.user?.isOnBoardingCompleted

        // Navigate to different routes
        if (userRole == "publicviewer") {
          navigate('/role', { replace: true });
        } else if (userRole == "client") {
          isOnboardingcompleted ? navigate('/client/dashboard') : navigate('/client/onboarding')
        } else if (userRole == "freelancer") {
          isOnboardingcompleted ? navigate('/freelancer/dashboard') : navigate('/freelancer/onboarding')
        }else{
          navigate('/', { replace: true });
        }

      } catch (error) {
        console.error('❌ OAuth callback error:', error);

        // Show detailed error message
        const errorMessage = error.response?.data?.message || error.message || 'Authentication failed';
        setError(errorMessage);
        toast.error(`Login failed: ${errorMessage}`);

        setTimeout(() => navigate('/login'), 2000);
      } finally {
        setLoading(false);
      }
    };

    processOAuthCallback();
  }, []); // ✅ Empty dependency array

  // ... rest of your component (loading, error, success states)
};

export default AuthConsent;