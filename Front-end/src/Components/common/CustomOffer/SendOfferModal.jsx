import { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import { gigsAPI } from '../../../api/gigs';
import { offersAPI } from '../../../api/offers';
import { apiErrorMessage } from '../../../utils/gigOrderCheckout';
import './CustomOffer.css';

const EMPTY = { gigId: '', title: '', description: '', price: '', deliveryDays: '', revisions: '1' };

// Same limits as Backend/src/validators/customOffer.validator.js.
function validate(f) {
  const e = {};
  const title = f.title.trim();
  const desc = f.description.trim();
  if (title.length < 5 || title.length > 100) e.title = 'Title must be 5-100 characters.';
  if (desc.length < 30 || desc.length > 3000) e.description = `Describe the offer in 30-3000 characters (${desc.length}/30).`;
  const price = Number(f.price);
  if (f.price === '' || Number.isNaN(price) || price < 5 || price > 10000000) e.price = 'Price must be between Rs. 5 and Rs. 10,000,000.';
  const days = Number(f.deliveryDays);
  if (f.deliveryDays === '' || !Number.isInteger(days) || days < 1 || days > 365) e.deliveryDays = 'Delivery must be 1-365 days.';
  const rev = Number(f.revisions);
  if (f.revisions !== '' && (!Number.isInteger(rev) || rev < 0 || rev > 20)) e.revisions = 'Revisions must be 0-20.';
  return e;
}

/**
 * Freelancer's "Send Custom Offer" form, opened from a chat with a client.
 * Optionally based on one of their gigs (prefills the title, and the order
 * inherits that gig's category/skills). On success the offer appears in the
 * chat as a card — `onSent` lets the parent refresh the feed.
 */
export default function SendOfferModal({ open, conversationId, clientName, onClose, onSent, showToast }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [gigs, setGigs] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setErrors({});
    let active = true;
    gigsAPI.listMyGigs({ limit: 50 })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        if (active) setGigs(list.filter((g) => g.status === 'active'));
      })
      .catch(() => { if (active) setGigs([]); });
    return () => { active = false; };
  }, [open]);

  const set = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const pickGig = (gigId) => {
    const gig = gigs.find((g) => g._id === gigId);
    set({
      gigId,
      // Only fill blanks — never overwrite what they've typed.
      title: form.title || (gig ? gig.title.slice(0, 100) : ''),
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    try {
      await offersAPI.create({
        conversationId,
        gigId: form.gigId || undefined,
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        deliveryDays: Number(form.deliveryDays),
        revisions: form.revisions === '' ? 0 : Number(form.revisions),
      });
      showToast?.('Custom offer sent!', 'success');
      onSent?.();
      onClose?.();
    } catch (err) {
      showToast?.(apiErrorMessage(err, 'Could not send the offer.'), 'error');
    } finally {
      setSending(false);
    }
  };

  const price = Number(form.price) || 0;

  return (
    <Modal open={open} size="md" title={`Send a custom offer${clientName ? ` to ${clientName}` : ''}`} onClose={sending ? () => {} : onClose}>
      <form className="co-form" onSubmit={submit} noValidate>
        <p className="co-form__intro">
          Agreed on something different from your packages? Send it as an offer — if the client accepts,
          it becomes an order at this price and they pay 50% upfront into escrow.
        </p>

        {gigs.length > 0 && (
          <label className="co-field">
            <span className="co-field__label">Based on a gig <em>(optional)</em></span>
            <select className="co-input" value={form.gigId} onChange={(e) => pickGig(e.target.value)} disabled={sending}>
              <option value="">— Not linked to a gig —</option>
              {gigs.map((g) => <option key={g._id} value={g._id}>{g.title}</option>)}
            </select>
          </label>
        )}

        <label className="co-field">
          <span className="co-field__label">Offer title</span>
          <input className={`co-input${errors.title ? ' co-input--error' : ''}`} maxLength={100} value={form.title}
            onChange={(e) => set({ title: e.target.value })} placeholder="e.g. 5-page React website with admin panel" disabled={sending} />
          {errors.title && <span className="co-field__error">{errors.title}</span>}
        </label>

        <label className="co-field">
          <span className="co-field__label">What's included</span>
          <textarea className={`co-input co-textarea${errors.description ? ' co-input--error' : ''}`} rows={5} maxLength={3000}
            value={form.description} onChange={(e) => set({ description: e.target.value })}
            placeholder="List exactly what you'll deliver — pages, features, files, anything agreed in chat." disabled={sending} />
          {errors.description
            ? <span className="co-field__error">{errors.description}</span>
            : <span className="co-field__hint">{form.description.trim().length}/3000 — no emails or phone numbers.</span>}
        </label>

        <div className="co-form__row">
          <label className="co-field">
            <span className="co-field__label">Price (Rs.)</span>
            <input type="number" inputMode="decimal" min="5" className={`co-input${errors.price ? ' co-input--error' : ''}`}
              value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="3000" disabled={sending} />
            {errors.price && <span className="co-field__error">{errors.price}</span>}
          </label>
          <label className="co-field">
            <span className="co-field__label">Delivery (days)</span>
            <input type="number" inputMode="numeric" min="1" step="1" className={`co-input${errors.deliveryDays ? ' co-input--error' : ''}`}
              value={form.deliveryDays} onChange={(e) => set({ deliveryDays: e.target.value })} placeholder="7" disabled={sending} />
            {errors.deliveryDays && <span className="co-field__error">{errors.deliveryDays}</span>}
          </label>
          <label className="co-field">
            <span className="co-field__label">Revisions</span>
            <input type="number" inputMode="numeric" min="0" step="1" className={`co-input${errors.revisions ? ' co-input--error' : ''}`}
              value={form.revisions} onChange={(e) => set({ revisions: e.target.value })} placeholder="1" disabled={sending} />
            {errors.revisions && <span className="co-field__error">{errors.revisions}</span>}
          </label>
        </div>

        {price > 0 && (
          <p className="co-form__hint">The client pays Rs. {(Math.round(price / 2 * 100) / 100).toLocaleString()} upfront; the offer expires in 7 days if not answered.</p>
        )}

        <div className="co-form__actions">
          <Button type="submit" loading={sending}>Send Offer</Button>
          <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
