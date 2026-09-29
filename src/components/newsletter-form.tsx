"use client";

import { useState } from "react";

// TODO: not connected to a mailing list yet; submitting only shows the confirmation.
export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <p role="status" className="text-body text-ink-muted">
        Thank you. You&apos;ll hear from us soon.
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
      className="flex w-full flex-col gap-3 sm:flex-row"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email address"
        className="field"
      />
      <button type="submit" className="btn btn-primary shrink-0">
        Subscribe
      </button>
    </form>
  );
}
