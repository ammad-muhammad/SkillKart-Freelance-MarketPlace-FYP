import { useState, useRef, useEffect, useCallback } from 'react';
import './CustomSelect.css';

/**
 * CustomSelect – a fully styled, accessible select replacement.
 *
 * Props:
 *   options   – array of { value, label } OR plain strings
 *   value     – currently selected value (string)
 *   onChange  – (value) => void
 *   placeholder – string shown when nothing is selected (default: 'Select…')
 *   compact   – bool – smaller trigger (for toolbar sort)
 *   className – extra class on the root .csel wrapper
 *   id        – id forwarded to the trigger for <label htmlFor>
 */
export default function CustomSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Select…',
    compact = false,
    className = '',
    id,
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    /* normalise options → [{value, label}] */
    const items = options.map(o =>
        typeof o === 'string' ? { value: o, label: o } : o
    );

    const selected = items.find(o => o.value === value);

    /* close on outside click */
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    /* close on Escape */
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    const pick = useCallback((val) => {
        onChange(val);
        setOpen(false);
    }, [onChange]);

    return (
        <div
            ref={rootRef}
            className={`csel${open ? ' csel--open' : ''}${compact ? ' csel--compact' : ''}${className ? ` ${className}` : ''}`}
        >
            {/* Trigger */}
            <button
                id={id}
                type="button"
                className="csel__trigger"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={`csel__value${!selected ? ' csel__value--placeholder' : ''}`}>
                    {selected ? selected.label : placeholder}
                </span>
                <svg className="csel__chevron" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="csel__menu" role="listbox">
                    {items.map(item => (
                        <div
                            key={item.value}
                            role="option"
                            aria-selected={item.value === value}
                            className={`csel__option${item.value === value ? ' csel__option--selected' : ''}`}
                            onClick={() => pick(item.value)}
                        >
                            {item.label}
                            <svg className="csel__check" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
