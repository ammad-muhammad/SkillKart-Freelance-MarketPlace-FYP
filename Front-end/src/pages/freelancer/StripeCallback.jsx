import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsAPI } from '../../api/payments';
import { safeToast as toast } from '../../utils/safeToast';

export default function StripeCallback() {
  const navigate = useNavigate();
  const [status] = useState('Verifying your Stripe account...');

  useEffect(() => {
    const verifyStripe = async () => {
      try {
        const res = await paymentsAPI.stripeCallback();
        if (res.data?.data?.stripeOnboardingComplete) {
          toast.success('Stripe account successfully connected!');
        } else {
          toast('Stripe onboarding incomplete. You can try again from your wallet.');
        }
        navigate('/freelancer/wallet', { replace: true });
      } catch (err) {
        console.error('Stripe callback error:', err);
        toast.error('Failed to verify Stripe connection.');
        navigate('/freelancer/wallet', { replace: true });
      }
    };

    verifyStripe();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(183, 201, 226, 0.35)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
      <h2>{status}</h2>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
