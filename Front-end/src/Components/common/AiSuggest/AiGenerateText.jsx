import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { aiAPI } from '../../../api/ai';
import './AiGenerateText.css';

/**
 * Reusable "✨ Generate with AI" button for any description/free-text field
 * (job/gig descriptions, bios, portfolio descriptions, FAQ answers, ...).
 *
 * Drafts from scratch using whatever context the parent form already has
 * (title, category, skills, tier, name, ...) when the field is empty, or
 * expands/polishes the user's own partial draft into full prose when it
 * isn't — the user can always keep typing/editing afterward, AI never locks
 * the field.
 *
 * Not meant for fields that record a real event or a genuine personal
 * account (delivery notes, dispute reasons, reviews) — those need facts the
 * AI can't know, so they intentionally don't use this component.
 *
 * Props:
 *  - fieldLabel: string             — human description of the field, sent to
 *                                      the AI as part of the prompt (e.g.
 *                                      "a freelance web developer's gig description").
 *  - getContext: () => object       — current form context to seed the draft
 *                                      (title, category, skills, tier, name, ...).
 *  - getExistingText: () => string  — current field value (expand vs. draft-fresh).
 *  - onGenerated: (text: string) => void — apply the generated text.
 *  - label?: string                 — button text (default "Generate with AI").
 *  - disabled?: boolean
 *  - className?: string
 */
export default function AiGenerateText({
  fieldLabel,
  getContext,
  getExistingText,
  onGenerated,
  label = 'Generate with AI',
  disabled = false,
  className = '',
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    const context = (typeof getContext === 'function' ? getContext() : {}) || {};
    const existingText = (typeof getExistingText === 'function' ? getExistingText() : '') || '';

    setLoading(true);
    setError('');
    try {
      const { data } = await aiAPI.generateText(fieldLabel, context, existingText);
      const text = data?.data?.text;
      if (text) {
        onGenerated?.(text);
      } else {
        setError('Could not generate text right now. Please try again or write it manually.');
      }
    } catch (err) {
      const aiDown = err.response?.status === 503 || !err.response;
      setError(aiDown
        ? 'AI is temporarily out of service. Please write it manually.'
        : (err.response?.data?.message || 'AI generation is unavailable right now.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ai-gen ${className}`}>
      <button
        type="button"
        className="ai-gen__btn"
        onClick={run}
        disabled={loading || disabled}
      >
        <Sparkles size={13} />
        {loading ? 'Writing…' : label}
      </button>
      {error && <span className="ai-gen__error">{error}</span>}
    </div>
  );
}
