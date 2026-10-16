import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsAPI } from '../../api/payments';
import { safeToast as toast } from '../../utils/safeToast';
import Loader from '../../Components/common/Loader/Loader';

export default function StripeCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const verifyStripe = async () => {
      try {
        const res = await paymentsAPI.stripeCallback();
        if (res.data?.data?.stripeOnboardingComplete) {
          toast.success('Stripe account successfully connected!');
        } else {
          toast.info('Stripe onboarding incomplete. You can try again from your wallet.');
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

  return <Loader fullScreen text="Verifying" />;
}
