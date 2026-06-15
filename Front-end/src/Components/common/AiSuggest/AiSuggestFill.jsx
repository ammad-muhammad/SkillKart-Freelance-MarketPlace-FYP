import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { aiAPI } from '../../../api/ai';
import './AiSuggestFill.css';

/**
 * Reusable "✨ AI suggest & fill" button for gig / project forms.
 *
 * Reads a free-text title + description, calls the real AI brief endpoint
 * (Gemini→Groq→Claude router) and fills the form's category + skills via the
 * callbacks the parent passes. Mirrors the onboarding suggest pattern so every
 * create/edit form behaves the same way.
 *
 * Props:
 *  - getContext: () => ({ title, description, skills }) — current form values.
 *  - onCategory: (category: string) => void   — apply the suggested category.
 *  - onSkills:   (skills: string[]) => void    — apply suggested skills (merged
 *                                                with existing by the parent).
 *  - onExperience?: (level: string) => void    — apply inferred experience level
 *                                                ("Entry"|"Intermediate"|"Expert").
 *  - allowedCategories?: string[]  — restrict the applied category to this list.
 *  - existingSkills?: string[]     — current skills, so we only surface NEW ones.
 *  - label?: string                — button text (default "AI suggest").
 *  - disabled?: boolean
 *  - className?: string            — extra class on the wrapper.
 */
export default function AiSuggestFill({
  getContext,
  onCategory,
  onSkills,
  onExperience,
  allowedCategories,
  existingSkills = [],
  label = 'AI suggest',
  disabled = false,
  className = '',
}) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');     // small status line under the button
  const [error, setError] = useState('');
  // Extra skills the AI proposed that the user hasn't accepted yet.
  const [skillChips, setSkillChips] = useState([]);

  const run = async () => {
    const { title = '', description = '', skills = [] } =
      (typeof getContext === 'function' ? getContext() : {}) || {};
    const desc = String(description || '').trim();
    const titl = String(title || '').trim();

    if (!desc && !titl) {
      setError('Add a title or description first, then let AI fill the rest.');
      setNote('');
      return;
    }

    setLoading(true);
    setError('');
    setNote('');
    try {
      // suggestBrief needs a description; fall back to the title when empty.
      const { data } = await aiAPI.suggestBrief(desc || titl, titl);
      const s = data?.data || {};

      const applied = [];

      // Category — only apply when it's in the allowed taxonomy (if provided).
      if (s.category && onCategory) {
        const ok = !allowedCategories || allowedCategories.includes(s.category);
        if (ok) { onCategory(s.category); applied.push('category'); }
      }

      // Skills — surface only the ones not already present.
      const have = new Set((existingSkills.length ? existingSkills : skills).map((x) => String(x).toLowerCase()));
      const fresh = (Array.isArray(s.skills) ? s.skills : [])
        .filter((sk) => sk && !have.has(String(sk).toLowerCase()));

      if (fresh.length && onSkills) {
        onSkills(fresh);                 // parent merges into its skills array
        setSkillChips(fresh);            // also show them as quick re-add chips
        applied.push(`${fresh.length} skill${fresh.length === 1 ? '' : 's'}`);
      }

      // Experience level — applied only when the parent opts in.
      if (s.experienceLevel && onExperience) {
        onExperience(s.experienceLevel);
        applied.push('experience level');
      }

      setNote(applied.length ? `Filled ${applied.join(' & ')} — tweak as needed.` : 'No new suggestions to add.');
    } catch (err) {
      setError(err.response?.data?.message || 'AI suggestions are unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ai-suggest ${className}`}>
      <button
        type="button"
        className="ai-suggest__btn"
        onClick={run}
        disabled={loading || disabled}
      >
        <Sparkles size={14} />
        {loading ? 'Analyzing…' : label}
      </button>

      {note && <span className="ai-suggest__note">{note}</span>}
      {error && <span className="ai-suggest__error">{error}</span>}

      {skillChips.length > 0 && (
        <div className="ai-suggest__chips">
          <span className="ai-suggest__chips-label">Suggested skills:</span>
          {skillChips.map((sk) => (
            <button
              key={sk}
              type="button"
              className="ai-suggest__chip"
              onClick={() => onSkills && onSkills([sk])}
              title="Add this skill"
            >
              + {sk}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
