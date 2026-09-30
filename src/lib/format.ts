export type StockState = {
  status: "in-stock" | "low-stock" | "out-of-stock";
  label: string;
};

const priceFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(cents: number) {
  return priceFormat.format(cents / 100);
}

const orderDateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

export function formatOrderDate(date: Date) {
  return orderDateFormat.format(date);
}

/** Short, customer-facing order reference derived from the order id. */
export function formatOrderNumber(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

const LOW_STOCK_THRESHOLD = 3;

export function getStockState(stock: number): StockState {
  if (stock <= 0) return { status: "out-of-stock", label: "Out of stock" };
  if (stock <= LOW_STOCK_THRESHOLD) {
    return { status: "low-stock", label: `Only ${stock} left` };
  }
  return { status: "in-stock", label: "In stock" };
}
