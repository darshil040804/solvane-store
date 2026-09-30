"use client";

import { MinusIcon, PlusIcon } from "@/components/icons";

/** − value + control. The server re-checks every change; `max` only shapes the UI. */
export function QuantityStepper({
  label,
  value,
  max,
  disabled = false,
  onChange,
  describedBy,
}: {
  /** Names the product, e.g. "Satin Bomber Jacket". */
  label: string;
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  describedBy?: string;
}) {
  return (
    <div
      role="group"
      aria-label={`Quantity for ${label}`}
      aria-describedby={describedBy}
      className="inline-flex h-10 items-center rounded-control border"
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label={`Decrease quantity of ${label}`}
        className="btn-icon h-full rounded-control disabled:cursor-default disabled:text-ink-subtle disabled:hover:bg-transparent"
      >
        <MinusIcon />
      </button>
      <output aria-live="polite" className="min-w-8 text-center text-body-sm tabular-nums">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={`Increase quantity of ${label}`}
        className="btn-icon h-full rounded-control disabled:cursor-default disabled:text-ink-subtle disabled:hover:bg-transparent"
      >
        <PlusIcon />
      </button>
    </div>
  );
}
