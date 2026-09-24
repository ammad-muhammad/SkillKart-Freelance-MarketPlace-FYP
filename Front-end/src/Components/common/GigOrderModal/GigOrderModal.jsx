import { useEffect, useState } from 'react';
import { Clock, RefreshCw, MessageCircle, ShieldCheck } from 'lucide-react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import {
  REQUIREMENTS_MIN,
  REQUIREMENTS_MAX,
  MAX_REFERENCE_LINKS,
  parseReferenceLinks,
  formatDeliveryTime,
} from '../../../utils/gigOrderCheckout';
import './GigOrderModal.css';

const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`;

/**
 * The step between "Order" and paying the 50% deposit — collects what the
 * client actually wants built, so the freelancer isn't left with just a
 * package name.
 *
 * mode 'package' — ordering a gig tier: requirements are mandatory
 *   (min 30 chars, same rule as the backend).
 * mode 'offer'   — accepting a custom offer: its description is already the
 *   agreed scope, so extra notes are optional.
 *
 * summary: { title, label, price, deliveryDays, revisions }
 * onSubmit({ description, referenceLinks }) — the caller places the order
 * and starts the deposit; keep `submitting` true meanwhile.
 */
export default function GigOrderModal({
  open,
  mode = 'package',
  summary = {},
  submitting = false,
  onSubmit,
  onClose,
  onContact,
}) {
  const [description, setDescription] = useState('');
  const [linksText, setLinksText] = useState('');
  const [touched, setTouched] = useState(false);

  // Fresh form every time it opens (a different tier may have been picked).
  useEffect(() => {
    if (open) {
      setDescription('');
      setLinksText('');
      setTouched(false);
    }
  }, [open]);

  const isPackage = mode === 'package';
  const trimmedLength = description.trim().length;
  const descError = isPackage && trimmedLength < REQUIREMENTS_MIN
    ? `Please describe what you need in at least ${REQUIREMENTS_MIN} characters (${trimmedLength}/${REQUIREMENTS_MIN}).`
    : null;
  const { links, error: linksError } = parseReferenceLinks(linksText);
  const canSubmit = !descError && !linksError && trimmedLength <= REQUIREMENTS_MAX;

  const price = Number(summary.price) || 0;
  const deposit = Math.round((price / 2) * 100) / 100;
  const remaining = Math.round((price - deposit) * 100) / 100;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit || submitting) return;
    onSubmit?.({ description: description.trim(), referenceLinks: links });
  };

  return (
    <Modal
      open={open}
      size="md"
      title={isPackage ? 'Before we start — tell us your requirements' : 'Accept custom offer'}
      onClose={submitting ? () => {} : onClose}
    >
      <form className="gom" onSubmit={handleSubmit} noValidate>
        <div className="gom-summary">
          <div className="gom-summary__head">
            <div>
              {summary.label && <span className="gom-summary__label">{summary.label}</span>}
              <h4 className="gom-summary__title">{summary.title}</h4>
            </div>
            <span className="gom-summary__price">Rs. {price.toLocaleString()}</span>
          </div>
          <div className="gom-summary__meta">
            {summary.deliveryDays != null && summary.deliveryDays !== '' && (
              <span><Clock size={14} /> {formatDeliveryTime(summary.deliveryDays)} delivery</span>
            )}
            {summary.revisions != null && summary.revisions !== '' && (
              <span><RefreshCw size={14} /> {plural(summary.revisions, 'revision')}</span>
            )}
          </div>
          <p className="gom-summary__split">
            <ShieldCheck size={14} /> You pay <strong>Rs. {deposit.toLocaleString()}</strong> (50%) now into escrow.
            The remaining Rs. {remaining.toLocaleString()} is paid when you accept the delivery.
          </p>
        </div>

        <label className="gom-field">
          <span className="gom-field__label">
            {isPackage ? 'What exactly do you need?' : 'Anything else the freelancer should know?'}
            {!isPackage && <em> (optional)</em>}
          </span>
          <textarea
            className={`gom-input gom-textarea${touched && descError ? ' gom-input--error' : ''}`}
            rows={6}
            maxLength={REQUIREMENTS_MAX}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={isPackage
              ? 'e.g. A React web app for my bakery: 5 pages (home, menu, about, contact, order), an admin panel to edit the menu, and login for staff.'
              : 'e.g. Please use our brand colours (#042E4C) and send a first draft by Friday.'}
            disabled={submitting}
          />
          <span className={`gom-field__hint${touched && descError ? ' gom-field__hint--error' : ''}`}>
            {touched && descError
              ? descError
              : isPackage
                ? `${trimmedLength}/${REQUIREMENTS_MIN} characters minimum — the more detail, the better the result.`
                : `${trimmedLength}/${REQUIREMENTS_MAX}`}
          </span>
        </label>

        <label className="gom-field">
          <span className="gom-field__label">Reference links or examples <em>(optional)</em></span>
          <textarea
            className={`gom-input gom-textarea gom-textarea--short${linksError ? ' gom-input--error' : ''}`}
            rows={2}
            value={linksText}
            onChange={(e) => setLinksText(e.target.value)}
            placeholder={'https://example.com/a-site-i-like\nhttps://drive.google.com/…'}
            disabled={submitting}
          />
          <span className={`gom-field__hint${linksError ? ' gom-field__hint--error' : ''}`}>
            {linksError || `One link per line, up to ${MAX_REFERENCE_LINKS}.`}
          </span>
        </label>

        {isPackage && onContact && (
          <p className="gom-contact">
            Not sure this package fits? <button type="button" onClick={onContact} disabled={submitting}>
              <MessageCircle size={14} /> Message the freelancer first
            </button> — they can send you a custom offer.
          </p>
        )}

        <div className="gom-actions">
          <Button type="submit" loading={submitting} disabled={touched && !canSubmit}>
            {isPackage ? `Place order & pay Rs. ${deposit.toLocaleString()}` : `Accept & pay Rs. ${deposit.toLocaleString()}`}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
