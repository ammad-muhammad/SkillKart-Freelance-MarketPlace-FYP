import { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, Plus } from 'lucide-react';
import '../TagInput/TagInput.css';

const INDUSTRY_KEYWORDS = {
  'Accounting & Finance': ['finance', 'accounting', 'tax', 'audit', 'money', 'bookkeeping'],
  'Advertising & PR': ['ad', 'advertising', 'pr', 'public relations', 'marketing', 'media'],
  'Architecture & Design': ['design', 'architecture', 'creative', 'interior', 'cad'],
  'Automotive': ['car', 'auto', 'vehicle', 'automotive', 'motor'],
  'Aviation & Aerospace': ['aviation', 'aerospace', 'plane', 'space', 'satellite'],
  'Banking': ['bank', 'finance', 'money', 'investment'],
  'Biotechnology': ['bio', 'biotech', 'science', 'pharma', 'laboratory'],
  'Construction': ['build', 'construction', 'engineering', 'real estate'],
  'Consulting': ['consulting', 'advisory', 'strategy', 'business'],
  'E-commerce': ['ecommerce', 'e-commerce', 'shop', 'retail', 'sales', 'store', 'shopify'],
  'Education & EdTech': ['education', 'edtech', 'school', 'learn', 'course', 'teaching'],
  'Energy & Utilities': ['energy', 'utility', 'solar', 'oil', 'gas', 'power'],
  'Entertainment & Media': ['media', 'entertainment', 'video', 'movie', 'music', 'tv'],
  'FinTech': ['fintech', 'crypto', 'blockchain', 'payments', 'finance'],
  'Food & Beverage': ['food', 'beverage', 'restaurant', 'cafe', 'drink'],
  'Gaming': ['game', 'gaming', 'unity', 'unreal', 'play'],
  'Government & Public Sector': ['government', 'public', 'civic', 'municipal'],
  'Healthcare & HealthTech': ['health', 'healthcare', 'healthtech', 'medical', 'clinic', 'doctor'],
  'Hospitality & Tourism': ['hotel', 'tourism', 'travel', 'hospitality'],
  'Human Resources': ['hr', 'recruiting', 'staffing', 'talent', 'human resources'],
  'Insurance': ['insurance', 'insurtech', 'claim'],
  'Legal': ['legal', 'law', 'lawyer', 'compliance'],
  'Logistics & Supply Chain': ['shipping', 'logistics', 'supply chain', 'transport', 'warehouse'],
  'Manufacturing': ['factory', 'manufacturing', 'production', 'industrial'],
  'Marketing': ['marketing', 'seo', 'social media', 'growth', 'brand'],
  'NGO & Non-profit': ['ngo', 'nonprofit', 'charity', 'foundation'],
  'Real Estate & PropTech': ['real estate', 'proptech', 'property', 'housing'],
  'Retail': ['retail', 'shop', 'store', 'sales'],
  'Software & IT Services': ['software', 'it', 'tech', 'saas', 'app', 'ai', 'cloud', 'developer', 'web', 'programming'],
  'Telecommunications': ['telecom', 'phone', 'network', 'telecommunications', 'mobile']
};

const FRIENDLY_SUGGESTIONS_LIST = [
  // Standard Categories
  { label: 'Accounting & Finance', value: 'Accounting & Finance' },
  { label: 'Advertising & PR', value: 'Advertising & PR' },
  { label: 'Architecture & Design', value: 'Architecture & Design' },
  { label: 'Automotive', value: 'Automotive' },
  { label: 'Aviation & Aerospace', value: 'Aviation & Aerospace' },
  { label: 'Banking', value: 'Banking' },
  { label: 'Biotechnology', value: 'Biotechnology' },
  { label: 'Construction', value: 'Construction' },
  { label: 'Consulting', value: 'Consulting' },
  { label: 'E-commerce', value: 'E-commerce' },
  { label: 'Education & EdTech', value: 'Education & EdTech' },
  { label: 'Energy & Utilities', value: 'Energy & Utilities' },
  { label: 'Entertainment & Media', value: 'Entertainment & Media' },
  { label: 'FinTech', value: 'FinTech' },
  { label: 'Food & Beverage', value: 'Food & Beverage' },
  { label: 'Gaming', value: 'Gaming' },
  { label: 'Government & Public Sector', value: 'Government & Public Sector' },
  { label: 'Healthcare & HealthTech', value: 'Healthcare & HealthTech' },
  { label: 'Hospitality & Tourism', value: 'Hospitality & Tourism' },
  { label: 'Human Resources', value: 'Human Resources' },
  { label: 'Insurance', value: 'Insurance' },
  { label: 'Legal', value: 'Legal' },
  { label: 'Logistics & Supply Chain', value: 'Logistics & Supply Chain' },
  { label: 'Manufacturing', value: 'Manufacturing' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'NGO & Non-profit', value: 'NGO & Non-profit' },
  { label: 'Real Estate & PropTech', value: 'Real Estate & PropTech' },
  { label: 'Retail', value: 'Retail' },
  { label: 'Software & IT Services', value: 'Software & IT Services' },
  { label: 'Telecommunications', value: 'Telecommunications' },

  // Natural language synonym extensions
  { label: 'Software Development', value: 'Software & IT Services' },
  { label: 'SaaS', value: 'Software & IT Services' },
  { label: 'AI & Technology', value: 'Software & IT Services' },
  { label: 'IT Services', value: 'Software & IT Services' },
  { label: 'Web Development', value: 'Software & IT Services' },
  { label: 'Design Agency', value: 'Architecture & Design' },
  { label: 'UI/UX Design', value: 'Architecture & Design' },
  { label: 'Creative Studio', value: 'Architecture & Design' },
  { label: 'Accounting & Audit', value: 'Accounting & Finance' },
  { label: 'FinTech', value: 'FinTech' },
  { label: 'Game Development', value: 'Gaming' },
  { label: 'Audit & Tax', value: 'Accounting & Finance' },
  { label: 'Public Relations', value: 'Advertising & PR' },
  { label: 'Ad Agency', value: 'Advertising & PR' },
  { label: 'Interior Design', value: 'Architecture & Design' },
  { label: 'Car manufacturing', value: 'Automotive' },
  { label: 'Space tech', value: 'Aviation & Aerospace' },
  { label: 'Investment banking', value: 'Banking' },
  { label: 'Pharma', value: 'Biotechnology' },
  { label: 'Civil engineering', value: 'Construction' },
  { label: 'Business Strategy', value: 'Consulting' },
  { label: 'Online shop', value: 'E-commerce' },
  { label: 'Shopify Store', value: 'E-commerce' },
  { label: 'School & Education', value: 'Education & EdTech' },
  { label: 'Solar energy', value: 'Energy & Utilities' },
  { label: 'Video production', value: 'Entertainment & Media' },
  { label: 'Music & Film', value: 'Entertainment & Media' },
  { label: 'Crypto & Blockchain', value: 'FinTech' },
  { label: 'Restaurant & Cafe', value: 'Food & Beverage' },
  { label: 'NGO', value: 'NGO & Non-profit' },
  { label: 'Charity', value: 'NGO & Non-profit' },
  { label: 'Property management', value: 'Real Estate & PropTech' },
  { label: 'Mobile app development', value: 'Software & IT Services' },
  { label: 'Telecom Network', value: 'Telecommunications' }
];

const IndustryInput = ({
  value = [],
  onChange,
  placeholder = 'Type to search industry (e.g. software, design)...'
}) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : [value].filter(Boolean);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const query = input.toLowerCase().trim();
    if (!query) return [];

    return FRIENDLY_SUGGESTIONS_LIST.filter(item => {
      // Exclude already selected values
      if (selectedValues.includes(item.value)) return false;

      const labelMatch = item.label.toLowerCase().includes(query);
      const valueMatch = item.value.toLowerCase().includes(query);
      
      const keywords = INDUSTRY_KEYWORDS[item.value] || [];
      const keywordMatch = keywords.some(kw => kw.includes(query));
      
      return labelMatch || valueMatch || keywordMatch;
    }).slice(0, 8);
  }, [input, selectedValues]);

  const handleSelect = (val) => {
    if (!selectedValues.includes(val)) {
      onChange([...selectedValues, val]);
    }
    setInput('');
    setShowSuggestions(false);
  };

  return (
    <div className="fl-tag-container" ref={containerRef}>
      <div className="fl-tag-input-wrapper">
        <div className="fl-tag-list" style={{ minHeight: '44px', padding: '0.4rem 0.8rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
          {selectedValues.map((val, index) => (
            <span key={index} className="fl-tag-chip" style={{ margin: '0.15rem' }}>
              {val}
              <button
                type="button"
                onClick={() => {
                  const updated = selectedValues.filter((_, idx) => idx !== index);
                  onChange(updated);
                }}
                className="fl-tag-chip__remove"
                aria-label={`Remove ${val}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <div className="fl-tag-field-container" style={{ flex: '1 1 150px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={selectedValues.length === 0 ? placeholder : 'Add another industry...'}
              className="fl-tag-input__field"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="fl-tag-dropdown">
            <div className="fl-tag-dropdown__header">
              <Sparkles size={12} /> Industry Suggestions
            </div>
            <div className="fl-tag-dropdown__list">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="fl-tag-suggestion"
                  onClick={() => handleSelect(item.value)}
                >
                  <Plus size={14} /> 
                  <span style={{ fontWeight: '600' }}>{item.label}</span>
                  {item.label !== item.value && (
                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>
                      maps to: {item.value}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {selectedValues.length === 0 && (
        <p className="fl-tag-hint">
          Type search keywords like <strong>soft</strong>, <strong>design</strong>, or <strong>finance</strong> to search options.
        </p>
      )}
    </div>
  );
};

export default IndustryInput;
