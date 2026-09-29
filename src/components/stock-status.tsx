import { getStockState } from "@/lib/format";

const dotColor = {
  "in-stock": "bg-success",
  "low-stock": "bg-danger",
  "out-of-stock": "bg-ink-subtle",
} as const;

export function StockStatus({ stock }: { stock: number }) {
  const { status, label } = getStockState(stock);

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
