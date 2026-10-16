import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminSearch } from '../../api/adminPanel';
import Loader from '../common/Loader/Loader';

const TYPE_ICON = {
  user: '👤', job: '💼', contract: '📋',
  payment: '💳', withdrawal: '💸', report: '🚩', review: '⭐'
};

const STATUS_COLOR = {
  active:   '#4ade80', suspended: '#f87171', pending: '#fbbf24',
  released: '#4ade80', refunded:  '#94a3b8', resolved: '#4ade80',
  hidden:   '#fb923c', visible:   '#4ade80'
};

let debounceTimer = null;

const GlobalSearch = () => {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const inputRef                = useRef(null);
  const wrapRef                 = useRef(null);
  const navigate                = useNavigate();

  // Debounced search
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await adminSearch.global(q);
      setResults(res?.results || {});
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(q), 320);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleItemClick = (item) => {
    navigate(item.link);
    setOpen(false);
    setQuery('');
    setResults(null);
  };

  const hasResults = results && Object.values(results).some(arr => arr?.length > 0);

  return (
    <div className="ap-global-search" ref={wrapRef}>
      <span className="ap-search-icon">🔍</span>
      <input
        ref={inputRef}
        type="text"
        className="ap-search-input"
        placeholder="Search users, jobs, contracts… (Ctrl+K)"
        value={query}
        onChange={onChange}
        onFocus={() => results && setOpen(true)}
        autoComplete="off"
      />

      {open && (
        <div className="ap-search-results">
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <Loader size="sm" text="Searching" />
            </div>
          )}

          {!loading && !hasResults && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ap-text-muted)', fontSize: '0.85rem' }}>
              No results for "<strong>{query}</strong>"
            </div>
          )}

          {!loading && results && Object.entries(results).map(([type, items]) => {
            if (!items?.length) return null;
            return (
              <div key={type}>
                <div className="ap-search-category">{type}</div>
                {items.map(item => (
                  <div
                    key={item._id}
                    className="ap-search-item"
                    onClick={() => handleItemClick(item)}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{TYPE_ICON[item.type] || '•'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ap-search-item-label">{item.label}</div>
                      <div className="ap-search-item-sub">{item.sublabel}</div>
                    </div>
                    {item.status && (
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                        background: STATUS_COLOR[item.status] || 'var(--ap-text-muted)'
                      }} />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
