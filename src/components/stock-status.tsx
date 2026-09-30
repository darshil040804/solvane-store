import { getStockState } from "@/lib/format";

const dotColor = {
  "in-stock": "bg-success",
  "low-stock": "bg-danger",
  "out-of-stock": "bg-ink-subtle",
} as const;

/** Stock dot and label; `label` replaces the standard wording (e.g. to name a size). */
export function StockStatus({ stock, label: customLabel }: { stock: number; label?: string }) {
  const { status, label: stateLabel } = getStockState(stock);
  const label = customLabel ?? stateLabel;

  return (
    <p
      className={`flex items-center gap-2 text-body-sm ${
        status === "out-of-stock" ? "text-ink-muted" : "text-ink"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-pill ${dotColor[status]}`}
      />
      {label}
    </p>
  );
}
