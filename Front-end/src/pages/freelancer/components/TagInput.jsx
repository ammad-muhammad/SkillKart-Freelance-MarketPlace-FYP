import { useState } from 'react';
import './TagInput.css';

const TagInput = ({ tags = [], onChange, placeholder = 'Add tag...' }) => {
  const [input, setInput] = useState('');

  const addTag = (val) => {
    const trimmed = val.trim();
    if (trimmed && !tags.some(t => {
      if (!t) return false;
      const name = typeof t === 'string' ? t : t.name;
      return name?.toLowerCase() === trimmed.toLowerCase();
    })) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="fl-tag-input">
      {tags.map((tag, idx) => {
        if (!tag) return null;
        const name = typeof tag === 'string' ? tag : tag.name;
        return (
          <span key={`${name}-${idx}`} className="fl-tag">
            {name}
            <button type="button" onClick={() => removeTag(tag)} className="fl-tag__remove">✕</button>
          </span>
        );
      })}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="fl-tag-input__field"
      />
    </div>
  );
};

export default TagInput;
