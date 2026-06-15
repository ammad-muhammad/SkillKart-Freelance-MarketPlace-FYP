import { useState, useEffect } from 'react';
import { Star, Quote } from 'lucide-react';
import { testimonialsAPI } from '../../../api/testimonials';
import { toast } from 'react-toastify';

const MAX = 600;

/**
 * Freelancer dashboard card: submit / edit your success story. Once approved it
 * appears on the public homepage "Students Who Changed Their Life" section.
 */
export default function ShareStory() {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    testimonialsAPI.getMine()
      .then((res) => {
        if (!active) return;
        const t = res.data?.data?.testimonial;
        if (t) { setExisting(t); setText(t.text); setRating(t.rating || 5); }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const submit = async () => {
    if (text.trim().length < 20) { toast.error('Please write at least 20 characters.'); return; }
    setSaving(true);
    try {
      const res = await testimonialsAPI.submit(text.trim(), rating);
      setExisting(res.data?.data?.testimonial || { text: text.trim(), rating });
      toast.success(existing ? 'Your story was updated! ✨' : 'Thanks for sharing your story! ✨');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save your story.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await testimonialsAPI.deleteMine();
      setExisting(null); setText(''); setRating(5);
      toast.info('Your story was removed.');
    } catch {
      toast.error('Could not remove your story.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="fl-card" style={{ marginBottom: '1.5rem' }}>
      <h3 className="fl-section-title">
        <Quote size={16} style={{ display: 'inline', verticalAlign: 'middle', color: '#1a6fa8' }} /> Share Your Success Story
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-mid)', marginBottom: '0.85rem' }}>
        {existing
          ? 'Your story is live on the SkillKart homepage. You can edit it anytime.'
          : 'Tell future students how SkillKart helped you — it may be featured on our homepage.'}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-mid)', fontWeight: 600 }}>Your rating:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star size={20} fill={n <= rating ? '#facc15' : 'none'} color={n <= rating ? '#facc15' : '#cbd5e1'} />
          </button>
        ))}
      </div>

      <textarea
        className="fl-input"
        style={{ minHeight: 90, resize: 'vertical', width: '100%' }}
        placeholder="e.g. SkillKart's AI verification gave me instant credibility — I landed my first project within a week…"
        value={text}
        maxLength={MAX}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{text.length}/{MAX}</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {existing && (
            <button className="fl-btn fl-btn--ghost fl-btn--sm" onClick={remove} disabled={saving}>Remove</button>
          )}
          <button className={`fl-btn fl-btn--primary fl-btn--sm${saving ? ' fl-btn--loading' : ''}`} onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Update Story' : 'Share Story'}
          </button>
        </div>
      </div>
    </div>
  );
}
