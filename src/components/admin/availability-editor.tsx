"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { updateAvailability } from "@/app/admin/products/actions";
import { SpinnerIcon } from "@/components/icons";

export type AvailabilityRow = { id: string; size: string; quantity: number; held: number };

type Message = { tone: "success" | "danger"; text: string };

const valuesFrom = (rows: AvailabilityRow[]) =>
  Object.fromEntries(rows.map((row) => [row.id, String(row.quantity)]));

/** Identifies the loaded quantities, so a refresh that didn't change them keeps typed edits. */
const snapshotOf = (rows: AvailabilityRow[]) =>
  rows.map((row) => `${row.id}:${row.quantity}`).join(",");

/**
 * Per-size available quantities. Saving sends each changed size with the value
 * it was loaded with; sizes that a checkout changed in the meantime aren't
 * overwritten, and the latest numbers are shown instead.
 */
export function AvailabilityEditor({
  productId,
  rows,
}: {
  productId: string;
  rows: AvailabilityRow[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(() => valuesFrom(rows));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, startTransition] = useTransition();

  // When saved quantities change (after a save here, or stock moved and the page
  // refreshed), start again from them. A refresh that leaves them unchanged, such
  // as saving the product details form below, keeps whatever is typed here.
  const snapshot = snapshotOf(rows);
  const [loadedSnapshot, setLoadedSnapshot] = useState(snapshot);
  if (snapshot !== loadedSnapshot) {
    setLoadedSnapshot(snapshot);
    setValues(valuesFrom(rows));
    setErrors({});
  }

  const changes = rows
    .filter((row) => (values[row.id] ?? "").trim() !== String(row.quantity))
    .map((row) => ({ stockId: row.id, expected: row.quantity, quantity: values[row.id] }));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || changes.length === 0) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await updateAvailability(productId, changes);
        switch (result.status) {
          case "ok": {
            const stale = rows.filter((row) => result.stale.includes(row.id));
            setMessage(
              stale.length > 0
                ? {
                    tone: "danger",
                    text: `${stale.map((row) => row.size).join(", ")} changed while you were editing (a checkout reserved or released units), so ${stale.length === 1 ? "it wasn't" : "they weren't"} saved. The latest quantities are shown; adjust and save again.`,
                  }
                : { tone: "success", text: "Availability saved." },
            );
            router.refresh();
            return;
          }
          case "invalid":
            setErrors(result.errors);
            setMessage({
              tone: "danger",
              text: result.errors.form ?? "Please fix the highlighted quantities.",
            });
            return;
          case "forbidden":
            setMessage({ tone: "danger", text: "Your account no longer has admin access." });
            return;
          default:
            setMessage({ tone: "danger", text: "This product no longer exists." });
        }
      } catch {
        setMessage({
          tone: "danger",
          text: "We couldn't save availability. Check your connection and try again.",
        });
      }
    });
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-busy={pending} className="flex flex-col gap-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-body-sm">
          <thead className="border-b text-ink-muted">
            <tr>
              <th scope="col" className="py-3 pr-6 font-normal">Size</th>
              <th scope="col" className="py-3 pr-6 font-normal">In checkout</th>
              <th scope="col" className="py-3 font-normal">Available to sell</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = `availability-${row.id}`;
              const error = errors[row.id];
              return (
                <tr key={row.id} className="border-b align-top">
                  <th scope="row" className="py-4 pr-6 font-normal">
                    <label htmlFor={id}>{row.size}</label>
                  </th>
                  <td className="py-4 pr-6 tabular-nums text-ink-muted">{row.held}</td>
                  <td className="py-2">
                    <input
                      id={id}
                      name={`quantity-${row.size}`}
                      type="text"
                      inputMode="numeric"
                      value={values[row.id] ?? ""}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? `${id}-error` : undefined}
                      onChange={(event) => {
                        const value = event.target.value;
                        setValues((current) => ({ ...current, [row.id]: value }));
                        setMessage(null);
                      }}
                      className="field max-w-32 tabular-nums"
                    />
                    {error && (
                      <p id={`${id}-error`} className="mt-2 text-caption text-danger">
                        {error}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || changes.length === 0}
          aria-busy={pending}
          className="btn btn-primary btn-sm"
        >
          {pending ? (
            <>
              <SpinnerIcon />
              Saving…
            </>
          ) : (
            "Save availability"
          )}
        </button>
        <button
          type="button"
          disabled={pending || rows.every((row) => values[row.id] === "0")}
          onClick={() => {
            setValues(Object.fromEntries(rows.map((row) => [row.id, "0"])));
            setMessage(null);
          }}
          className="btn btn-secondary btn-sm"
        >
          Set all to 0
        </button>
      </div>
      {message && (
        <p
          role={message.tone === "danger" ? "alert" : "status"}
          className={`text-body-sm ${message.tone === "danger" ? "text-danger" : "text-success"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
