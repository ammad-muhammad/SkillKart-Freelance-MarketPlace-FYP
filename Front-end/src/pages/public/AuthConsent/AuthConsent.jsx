// src/pages/AuthConsent.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'react-toastify';
import { log } from "../../../utils/logger";

const AuthConsent = () => {
  const navigate = useNavigate();
  const { handleSupabaseOAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasProcessed = useRef(false); // Prevent multiple call

  useEffect(() => {
    // Skip if already processed
    if (hasProcessed.current) {
      return;
    }

    const processOAuthCallback = async () => {
      try {
        log('🔐 Processing OAuth callback...');

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

        log('✅ Tokens received from Supabase');

        // ✅ Mark as processed BEFORE making API call
        hasProcessed.current = true;

        // ✅ Clear the hash to prevent re-processing
        window.history.replaceState(null, '', window.location.pathname);

        // Send to backend
        const response = await handleSupabaseOAuth(accessToken, refreshToken);

        log('✅ Authentication successful. User:', response?.data?.user);
        
        const user = response?.data?.user;
        const userRole = user?.role;
        const isOnboardingCompleted = user?.isOnBoardingCompleted;

        log(`🧭 Redirecting: Role=${userRole}, OnboardingCompleted=${isOnboardingCompleted}`);

        // Navigate to the right destination. Always use `replace: true` so the
        // OAuth callback screen is removed from history (prevents the back
        // button — and any re-mount — from re-landing on /auth/consent). The
        // session is already persisted via handleSupabaseOAuth above, so a
        // reload of the destination will rehydrate correctly.
        if (userRole === "publicviewer") {
          navigate('/role', { replace: true });
        } else if (userRole === "client") {
          navigate(isOnboardingCompleted ? '/client/dashboard' : '/client/onboarding', { replace: true });
        } else if (userRole === "freelancer") {
          navigate(isOnboardingCompleted ? '/freelancer/dashboard' : '/freelancer/onboarding', { replace: true });
        } else {
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

  // A component MUST return valid JSX. Previously this returned `undefined`,
  // which throws during render and breaks the OAuth callback screen.
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      {error ? (
        <>
          <div style={{ fontSize: '2.5rem' }}>⚠️</div>
          <h2 style={{ margin: 0 }}>Sign-in failed</h2>
          <p style={{ color: 'var(--color-text-light, #64748b)', maxWidth: 420 }}>{error}</p>
          <p style={{ color: 'var(--color-text-light, #94a3b8)', fontSize: '0.875rem' }}>
            Redirecting you to the login page…
          </p>
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              border: '3px solid #e2e8f0',
              borderTopColor: 'var(--color-primary, #6366f1)',
              borderRadius: '50%',
              animation: 'ac-spin 0.8s linear infinite',
            }}
          />
          <h2 style={{ margin: 0 }}>Finishing sign-in…</h2>
          <p style={{ color: 'var(--color-text-light, #64748b)' }}>
            {loading ? 'Securely verifying your account.' : 'Almost there…'}
          </p>
        </>
      )}
      <style>{`@keyframes ac-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AuthConsent;