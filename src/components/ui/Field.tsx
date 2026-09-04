import type React from 'react'

/**
 * A labelled text input with hint and inline, announced error. Shared by the
 * site's forms (contact, corporate enquiry) so field markup, error wiring and
 * accessibility stay identical rather than drifting per form.
 */
export function Field({
  label,
  name,
  error,
  hint,
  type = 'text',
  ...props
}: {
  label: string
  name: string
  error?: string
  hint?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [hint ? `${name}-hint` : null, error ? `${name}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-navy">
        {label}
        {props.required ? <span className="text-red"> *</span> : null}
      </label>
      {hint ? (
        <p id={`${name}-hint`} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      <input
        id={name}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`mt-2 w-full border bg-white px-3 py-2 text-base ${
          error ? 'border-red' : 'border-rule'
        }`}
        {...props}
      />
      {error ? <FieldError id={`${name}-error`} message={error} /> : null}
    </div>
  )
}

export function FieldError({ message, id }: { message: string; id?: string }) {
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-red">
      {message}
    </p>
  )
}
