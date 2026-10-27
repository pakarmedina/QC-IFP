import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string };

export function Textarea({ label, error, id, ...rest }: Props) {
  const areaId = id ?? rest.name;
  return (
    <div>
      <label htmlFor={areaId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={areaId}
        rows={2}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${areaId}-err` : undefined}
        className={`block w-full rounded-lg border bg-white px-3 py-2 text-base text-slate-900 ${
          error ? "border-red-600" : "border-slate-300"
        }`}
      />
      {error && (
        <p id={`${areaId}-err`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
