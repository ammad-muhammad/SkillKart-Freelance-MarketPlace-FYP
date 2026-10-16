import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Globe, Plus, Sparkles, X } from 'lucide-react';
import Loader from '../Loader/Loader';
import { skillsAPI } from '../../../api/skills';
import './TagInput.css';

const TagInput = ({
  tags = [],
  onChange,
  placeholder = 'Add (e.g. React, UI Design)...',
  options = null, // If provided, use static list instead of AI
  showHint = true,
  maxTags = null,
  hintText = null,
  allowCustom = true,
  validateFn = null,
}) => {
  // Stable identity so the suggestion effect doesn't re-fire every render.
  const validateSkill = useCallback(
    (value) => (validateFn || skillsAPI.validate)(value),
    [validateFn]
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);
  const debounceTimer = useRef(null);

  const isStatic = Array.isArray(options);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Suggestions logic
  useEffect(() => {
    if (isStatic && input.trim().length === 0 && showSuggestions) {
      const currentTagNames = tags.map(t => (typeof t === 'string' ? t : (t?.name || t?.language || '')).toLowerCase());
      const filtered = options.filter(opt => !currentTagNames.includes(opt.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      return;
    }

    if (input.trim().length < 1) {
      setSuggestions([]);
      if (!isStatic) setShowSuggestions(false);
      return;
    }

    if (isStatic) {
      // Static local filtering
      const currentTagNames = tags.map(t => (typeof t === 'string' ? t : (t?.name || t?.language || '')).toLowerCase());
      const filtered = options.filter(opt => 
        opt.toLowerCase().includes(input.toLowerCase()) && 
        !currentTagNames.includes(opt.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 10));
      setShowSuggestions(filtered.length > 0);
    } else {
      // Graph-aware debounced fetching
      if (input.trim().length < 2) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(async () => {
        try {
          const res = await skillsAPI.expand(input);
          if (res.data?.data?.terms) {
            const currentTagNames = tags.map(t => (typeof t === 'string' ? t : (t?.name || '')).toLowerCase());
            const newSuggestions = res.data.data.terms.filter(s => !currentTagNames.includes(s.toLowerCase()));
            setSuggestions(newSuggestions);
            if (newSuggestions.length > 0) setShowSuggestions(true);
          }
        } catch (err) {
          console.error("Failed to fetch graph suggestions:", err);
        }
      }, 300); // Fast 300ms debounce since it's cached in Mongo
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [input, tags, options, isStatic, showSuggestions, validateSkill]);

  const addTag = async (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    const currentTagNames = tags.map(t => (typeof t === 'string' ? t : (t?.name || t?.language || '')).toLowerCase());
    
    // Check if already exists
    if (currentTagNames.includes(trimmed.toLowerCase())) {
      setInput('');
      setShowSuggestions(false);
      return;
    }

    if (isStatic) {
      const matched = options.find(opt => opt.toLowerCase() === trimmed.toLowerCase());
      const finalVal = matched || (allowCustom !== false ? trimmed : null);
      if (finalVal) {
        const next = maxTags === 1 ? [finalVal] : [...tags, finalVal];
        onChange(next);
        setInput('');
        setShowSuggestions(false);
        setError(null);
      } else {
        setError(`Please select a valid option from the list.`);
      }
      return;
    }

    // AI validation mode
    setLoading(true);
    setError(null);

    try {
      const res = await validateSkill(trimmed);
      const result = res.data.data;

      if (result.valid) {
        const normalizedSkill = result.skill || trimmed;
        if (!currentTagNames.includes(normalizedSkill.toLowerCase())) {
          const next = maxTags === 1 ? [normalizedSkill] : [...tags, normalizedSkill];
          onChange(next);
        }
        setInput('');
        setShowSuggestions(false);
        setSuggestions([]);
      } else {
        setError(result.message || "Invalid input.");
        setSuggestions(result.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      // AI validator is down (503/timeout/network). Don't block the user — accept
      // the raw input as a tag so they can keep working, and note that AI is off.
      const aiDown = err?.response?.status === 503 || !err?.response;
      if (aiDown) {
        if (!currentTagNames.includes(trimmed.toLowerCase())) {
          const next = maxTags === 1 ? [trimmed] : [...tags, trimmed];
          onChange(next);
        }
        setInput('');
        setShowSuggestions(false);
        setSuggestions([]);
        setError('AI check is temporarily off — added without verification.');
      } else {
        setError('Validation failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="fl-tag-container">
      <div className={`fl-tag-input-wrapper ${error ? 'fl-tag-input--error' : ''} ${loading ? 'fl-tag-input--loading' : ''}`}>
        <div className="fl-tag-list">
          {tags.map((tag, idx) => {
            if (!tag) return null;
            const name = typeof tag === 'string' ? tag : (tag?.name || tag?.language || '');
            return (
              <span key={`${name}-${idx}`} className="fl-tag-chip">
                {name}
                <button type="button" onClick={() => removeTag(tag)} className="fl-tag-chip__remove" aria-label={`Remove ${name}`}>
                  <X size={12} />
                </button>
              </span>
            );
          })}
          
          <div className="fl-tag-field-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => isStatic && setShowSuggestions(true)}
              onClick={() => isStatic && setShowSuggestions(true)}
              placeholder={tags.length === 0 || maxTags !== 1 ? placeholder : 'Change category…'}
              className="fl-tag-input__field"
              disabled={loading}
              autoComplete="off"
            />
            {loading && <Loader size="sm" text="" />}
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="fl-tag-dropdown" ref={dropdownRef}>
            <div className="fl-tag-dropdown__header">
              <span className="fl-tag-header-icon">
                {isStatic ? <Globe size={14} /> : <Sparkles size={14} />}
              </span>
              <span className="fl-tag-header-title">
                {isStatic ? 'Select from list' : 'AI Suggestions'}
              </span>
            </div>
            <div className="fl-tag-dropdown__list">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="fl-tag-suggestion"
                  onClick={() => addTag(s)}
                >
                  <span className="fl-tag-suggestion-icon">
                    <Plus size={13} strokeWidth={2.5} />
                  </span>
                  <span className="fl-tag-suggestion-label">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="fl-tag-error">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      
      {showHint && (
        <p className="fl-tag-hint">
          {hintText || (isStatic 
            ? 'Type to filter, then pick from the list or press Enter.' 
            : <span>Type a skill and press <strong>Enter</strong>. AI will validate and suggest related skills.</span>
          )}
        </p>
      )}
    </div>
  );
};

export default TagInput;
