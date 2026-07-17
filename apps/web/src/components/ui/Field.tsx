import { useId } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldChrome {
  label?: string;
  error?: string;
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldChrome;
type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldChrome;

/** Labeled text input with error slot. Renders bare input when no label/error given. */
export function Input({ label, error, id, className, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const input = (
    <input
      id={inputId}
      className={className ? `dark-input ${className}` : 'dark-input'}
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  );
  if (!label && !error) return input;
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {input}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

/** Labeled multiline input with error slot. */
export function TextArea({ label, error, id, className, ...rest }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const textarea = (
    <textarea
      id={inputId}
      className={className ? `dark-input ${className}` : 'dark-input'}
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  );
  if (!label && !error) return textarea;
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {textarea}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
