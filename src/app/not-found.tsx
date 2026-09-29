import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-narrow section flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <p className="eyebrow text-ink-muted">Page not found</p>
      <h1 className="text-display">This page is not available</h1>
      <p className="max-w-sm text-body text-ink-muted">
        The page you are looking for may have moved or is coming soon.
      </p>
      <Link href="/" className="btn btn-secondary mt-3">
        Return to the homepage
      </Link>
    </main>
  );
}
