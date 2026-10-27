import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function Input({ label, error, hint, id, ...rest }: Props) {
  const inputId = id ?? rest.name;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`block min-h-11 w-full rounded-lg border bg-white px-3 text-base text-slate-900 ${
          error ? "border-red-600" : "border-slate-300"
        }`}
      />
      {error ? (
        <p id={`${inputId}-err`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-sm text-slate-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
