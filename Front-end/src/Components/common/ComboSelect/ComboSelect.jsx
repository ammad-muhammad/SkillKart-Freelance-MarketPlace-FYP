import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import './ComboSelect.css';

/**
 * ComboSelect — an editable, typeahead single-select dropdown.
 *
 * Drop-in replacement for CustomSelect on fixed-list fields (category,
 * subcategory, experience level) that should be *typeable*: the user types to
 * filter the list instantly, then clicks an option (or presses Enter) to
 * select. Single-select by design — the chosen value is a plain string, so no
 * data-model change. (Multi-select lists like skills already use TagInput.)
 *
 * Props:
 *   options     – array of { value, label } OR plain strings
 *   value       – currently selected value (string)
 *   onChange    – (value) => void
 *   placeholder – shown when nothing is selected (default 'Select…')
 *   id          – forwarded to the input for <label htmlFor>
 *   disabled    – bool
 *   className   – extra class on the root wrapper
 *   allowFreeText – if true, Enter on a non-matching value selects it as typed
 *                   (default false: only values from the list are selectable)
 */
export default function ComboSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  id,
  disabled = false,
  className = '',
  allowFreeText = false,
  searchable = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0); // highlighted option index
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  /* normalise options → [{value, label}] */
  const items = useMemo(
    () => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options]
  );

  const selected = items.find((o) => o.value === value) || (allowFreeText && value ? { value, label: value } : undefined);

  // When closed or not searchable, the input shows the selected label.
  const inputText = (open && searchable) ? query : selected?.label || '';

  const filtered = useMemo(() => {
    if (!searchable) return items;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((o) => o.label.toLowerCase().includes(q));
  }, [items, query, searchable]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Keep the highlighted row valid as the filtered list changes.
  useEffect(() => { setActive(0); }, [query, open]);

  const toggleMenu = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
    setQuery('');
  };

  const pick = (val) => {
    onChange(val);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const commitTyped = () => {
    if (filtered.length > 0) {
      pick(filtered[Math.min(active, filtered.length - 1)].value);
      return;
    }
    const typed = query.trim();
    if (allowFreeText && typed) pick(typed);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); commitTyped(); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  return (
    <div
      ref={rootRef}
      className={`cmbo${open ? ' cmbo--open' : ''}${disabled ? ' cmbo--disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <div className="cmbo__control" onClick={toggleMenu} style={{ cursor: 'pointer' }}>
        {searchable && open && <Search size={15} className="cmbo__search-icon" />}
        <input
          id={id}
          ref={inputRef}
          type="text"
          readOnly={!searchable}
          className={`cmbo__input${!selected && !open ? ' cmbo__input--placeholder' : ''}`}
          value={inputText}
          placeholder={selected ? selected.label : placeholder}
          onChange={(e) => {
            if (!searchable) return;
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          style={{ cursor: searchable ? 'text' : 'pointer' }}
        />
        <ChevronDown size={16} className="cmbo__chevron" />
      </div>

      {open && (
        <div className="cmbo__menu" id={id ? `${id}-listbox` : undefined} role="listbox">
          {filtered.length === 0 ? (
            <div className="cmbo__empty">
              {allowFreeText && query.trim()
                ? <>Press <strong>Enter</strong> to use “{query.trim()}”</>
                : 'No matches'}
            </div>
          ) : (
            filtered.map((item, i) => (
              <div
                key={item.value}
                role="option"
                aria-selected={item.value === value}
                className={`cmbo__option${item.value === value ? ' cmbo__option--selected' : ''}${i === active ? ' cmbo__option--active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(item.value); }}
              >
                <span>{item.label}</span>
                {item.value === value && <Check size={15} className="cmbo__check" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
