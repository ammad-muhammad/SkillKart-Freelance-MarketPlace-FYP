import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import './PaymentConfirm.css';

/**
 * Stripe Checkout's cancel redirect (?job=&phase=). Nothing was charged. A
 * gig order stays saved as "awaiting payment" — the client can pay or cancel
 * it from My Projects — so just say that instead of landing on a 404.
 */
export default function PaymentCancel() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const phase = params.get('phase');

  return (
    <div className="pay-confirm">
      <div className="pay-confirm__card">
        <XCircle size={56} className="pay-confirm__err" />
        <h1>Payment Cancelled</h1>
        <p>
          {phase === 'final'
            ? 'You weren\u2019t charged. The delivery is still waiting for your review in My Projects.'
            : 'You weren\u2019t charged. Your order is saved as \u201cawaiting payment\u201d \u2014 pay the deposit or cancel it from My Projects.'}
        </p>
        <button className="pay-confirm__btn" onClick={() => navigate('/client/projects')}>
          Back to My Projects
        </button>
      </div>
    </div>
  );
}
