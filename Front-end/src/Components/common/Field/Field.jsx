import React from 'react';
import './Field.css';

/**
 * Robust, indestructible Field system that guarantees proper label placement,
 * sizing, focus states, prefix adornments, and action chips across all viewports.
 */
export function Field({
  id,
  label,
  required = false,
  counter = null,
  icon = null,
  helper = null,
  helperText = null,
  error = null,
  prefix = null,
  action = null,
  actionChip = null,
  className = '',
  children,
}) {
  const resolvedHelper = helper || helperText;
  const resolvedAction = action || actionChip;
  return (
    <div className={`sk-field ${className}`}>
      {(label || counter != null || icon) && (
        <div className="sk-field__label-row">
          <label
            className={`sk-field__label ${required ? 'sk-field__label--required' : ''}`}
            htmlFor={id}
          >
            {icon && <span className="sk-field__label-icon">{icon}</span>}
            <span>{label}</span>
          </label>
          {counter != null && <span className="sk-field__counter">{counter}</span>}
        </div>
      )}

      {prefix ? (
        <div className="sk-field__prefix-wrap">
          <span className="sk-field__prefix">{prefix}</span>
          {children}
        </div>
      ) : (
        children
      )}

      {(resolvedHelper || error) && (
        <div className="sk-field__meta-row">
          {error ? (
            <span className="sk-field__error">{error}</span>
          ) : (
            <span className="sk-field__helper">{resolvedHelper}</span>
          )}
        </div>
      )}

      {resolvedAction && <div className="sk-field__action-row">{resolvedAction}</div>}
    </div>
  );
}

export const Input = React.forwardRef(function Input(
  { className = '', hasPrefix = false, type = 'text', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={`sk-field__input ${hasPrefix ? 'sk-field__input--has-prefix' : ''} ${className}`}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef(function Textarea(
  { className = '', rows, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`sk-field__textarea ${className}`}
      {...props}
    />
  );
});

export const Select = React.forwardRef(function Select(
  { className = '', children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={`sk-field__select ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

export default Field;
