import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag } from 'lucide-react';
import Modal from '../Modal/Modal';
import { useAuth } from '../../../hooks/useAuth';
import { reportsAPI } from '../../../api/reports';
import { safeToast as toast } from '../../../utils/safeToast';
import './ReportButton.css';

// Matches Backend/src/validators/report.validator.js (REPORT_CATEGORIES).
const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'fraud', label: 'Scam or fraud' },
  { value: 'harassment', label: 'Harassment or threats' },
  { value: 'abuse', label: 'Abusive or hateful content' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
];

const NOUN = { profile: 'profile', job: 'job', gig: 'gig', review: 'review' };

/**
 * A small "Report" control for a profile, job, gig or review. Opens a dialog,
 * sends the report to POST /reports, and it lands in the admin panel's Reports
 * queue. The reported user is worked out by the server from the item, so the
 * page only passes what it is looking at.
 *
 * Props: itemType ('profile' | 'job' | 'gig' | 'review'), itemId, label (optional).
 */
export default function ReportButton({ itemType, itemId, label = 'Report' }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!itemId) return null;

  const start = () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to report this.');
      navigate('/login');
      return;
    }
    setOpen(true);
  };

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setCategory('');
    setDescription('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!category) { toast.error('Please choose a reason.'); return; }
    if (description.trim().length < 10) { toast.error('Please describe the problem (at least 10 characters).'); return; }
    setSubmitting(true);
    try {
      const res = await reportsAPI.create({ itemType, itemId, category, description: description.trim() });
      toast.success(res?.message || 'Thank you — your report was sent to our moderation team.');
      setSubmitting(false);
      setOpen(false);
      setCategory('');
      setDescription('');
    } catch (err) {
      setSubmitting(false);
      toast.error(err.response?.data?.message || 'Could not send your report. Please try again.');
    }
  };

  return (
    <>
      <button type="button" className="rb-trigger" onClick={start} aria-haspopup="dialog">
        <Flag size={14} aria-hidden="true" /> {label}
      </button>

      <Modal open={open} onClose={close} title={`Report this ${NOUN[itemType] || 'item'}`}>
        <form className="rb-form" onSubmit={submit}>
          <p className="rb-hint">
            Tell us what is wrong. Our moderators review every report; the person you report is not told who sent it.
          </p>

          <fieldset className="rb-reasons" disabled={submitting}>
            <legend className="rb-label">Reason</legend>
            {REASONS.map((r) => (
              <label key={r.value} className={`rb-reason${category === r.value ? ' rb-reason--on' : ''}`}>
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={category === r.value}
                  onChange={() => setCategory(r.value)}
                />
                {r.label}
              </label>
            ))}
          </fieldset>

          <label className="rb-label" htmlFor="report-description">What happened?</label>
          <textarea
            id="report-description"
            className="rb-textarea"
            rows={4}
            maxLength={1000}
            placeholder="Describe the problem so we can look into it (10–1000 characters)."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
          <div className="rb-count">{description.trim().length}/1000</div>

          <div className="rb-footer">
            <button type="button" className="rb-btn rb-btn--ghost" onClick={close} disabled={submitting}>Cancel</button>
            <button type="submit" className="rb-btn rb-btn--primary" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send report'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
