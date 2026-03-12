import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import "./FilterSelect.css";

/**
 * FilterSelect — fully custom styled dropdown
 * Props:
 *   options  : [{ value, label }]
 *   value    : current selected value
 *   onChange : (value) => void
 *   isActive : boolean — highlight when non-default option is selected
 */
export default function FilterSelect({ options, value, onChange, isActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value) || options[0];

  const handleKeyDown = (e) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" || e.key === " ") setOpen((o) => !o);
  };

  return (
    <div
      ref={ref}
      className={`fsel${open ? " fsel--open" : ""}${isActive ? " fsel--active" : ""}`}
    >
      {/* Trigger */}
      <button
        type="button"
        className="fsel__trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="fsel__label">{selected.label}</span>
        <ChevronDown size={14} className="fsel__chevron" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <ul className="fsel__panel" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={`fsel__option${isSelected ? " fsel__option--selected" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} className="fsel__check" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
