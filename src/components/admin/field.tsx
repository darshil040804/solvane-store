import type { ReactNode } from "react";

export type ControlProps = {
  id: string;
  name: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

/**
 * Label, control, hint and error in the same structure as the auth form's
 * fields. The control is rendered by `children`, which receives the id and
 * aria attributes to spread onto an input, textarea or select.
 */
export function Field({
  name,
  label,
  hint,
  error,
  className = "",
  children,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = `field-${name.replaceAll(".", "-")}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-body-sm">
        {label}
      </label>
      {children({
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-caption text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
