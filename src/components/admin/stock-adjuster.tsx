"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { adjustStock } from "@/app/admin/inventory/actions";
import { SpinnerIcon } from "@/components/icons";

type Message = { tone: "success" | "danger"; text: string };

/**
 * Adds or removes units for one size. The amount is relative ("+5", "-2"), so
 * it applies on top of whatever checkouts have done since the page loaded.
 */
export function StockAdjuster({ stockId, label }: { stockId: string; label: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, startTransition] = useTransition();
  const id = `adjust-${stockId}`;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !value.trim()) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await adjustStock(stockId, value);
        switch (result.status) {
          case "ok":
            setValue("");
            setMessage({ tone: "success", text: `Saved. ${result.quantity} available.` });
            router.refresh();
            return;
          case "invalid":
            setMessage({
              tone: "danger",
              text: result.errors.delta ?? "Enter a whole number of units, like +5 or -2.",
            });
            return;
          case "conflict":
            setMessage({ tone: "danger", text: result.message });
            router.refresh();
            return;
          case "forbidden":
            setMessage({ tone: "danger", text: "Your account no longer has admin access." });
            return;
          case "not-found":
            setMessage({ tone: "danger", text: "This size no longer exists." });
            router.refresh();
            return;
        }
      } catch {
        setMessage({
          tone: "danger",
          text: "We couldn't save that change. Check your connection and try again.",
        });
      }
    });
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-busy={pending} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="sr-only">
          Adjust {label}
        </label>
        <input
          id={id}
          type="text"
          autoComplete="off"
          placeholder="+5 or -2"
          value={value}
          aria-invalid={message?.tone === "danger" ? true : undefined}
          aria-describedby={message ? `${id}-message` : undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setMessage(null);
          }}
          className="field w-28 tabular-nums"
        />
        <button
          type="submit"
          disabled={pending || !value.trim()}
          aria-busy={pending}
          className="btn btn-secondary btn-sm"
        >
          {pending ? <SpinnerIcon /> : null}
          Apply
          <span className="sr-only"> to {label}</span>
        </button>
      </div>
      {message && (
        <p
          id={`${id}-message`}
          role={message.tone === "danger" ? "alert" : "status"}
          className={`max-w-56 text-caption ${message.tone === "danger" ? "text-danger" : "text-success"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
