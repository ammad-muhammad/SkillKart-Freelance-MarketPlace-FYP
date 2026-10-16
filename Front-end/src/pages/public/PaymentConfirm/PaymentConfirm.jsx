import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { paymentsAPI } from '../../../api/payments';
import Loader from '../../../Components/common/Loader/Loader';
import './PaymentConfirm.css';

/**
 * Payment confirmation landing — Stripe Checkout (and the simulated fallback)
 * redirects here on success with ?job=&phase=&session=. We confirm the session
 * with the backend, which advances the escrow (deposit_paid, or released +
 * project completed for the final payment).
 */
export default function PaymentConfirm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const jobId = params.get('job');
  const phase = params.get('phase');
  const session = params.get('session');

  const [state, setState] = useState('confirming'); // confirming | success | error
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (!jobId || !phase) {
        setState('error');
        setMessage('Missing payment details.');
        return;
      }
      try {
        const { data } = await paymentsAPI.confirm(jobId, phase, session);
        setState('success');
        setMessage(data?.message || 'Payment confirmed.');
      } catch (err) {
        setState('error');
        setMessage(err.response?.data?.message || 'We could not confirm this payment.');
      }
    })();
  }, [jobId, phase, session]);

  return (
    <div className="pay-confirm">
      <div className="pay-confirm__card">
        {state === 'confirming' && (
          <div style={{ padding: '24px 0' }}>
            <Loader size="md" text="Processing" />
            <p style={{ marginTop: '16px', color: 'var(--color-text-mid)' }}>Please wait while we verify the transaction.</p>
          </div>
        )}
        {state === 'success' && (
          <>
            <CheckCircle2 size={56} className="pay-confirm__ok" />
            <h1>{phase === 'final' ? 'Payment Complete' : 'Deposit Funded'}</h1>
            <p>{message}</p>
            <button className="pay-confirm__btn" onClick={() => navigate('/client/projects')}>
              Back to My Projects
            </button>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle size={56} className="pay-confirm__err" />
            <h1>Payment Not Confirmed</h1>
            <p>{message}</p>
            <button className="pay-confirm__btn" onClick={() => navigate('/client/projects')}>
              Back to My Projects
            </button>
          </>
        )}
      </div>
    </div>
  );
}
