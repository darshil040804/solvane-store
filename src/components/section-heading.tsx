import Link from "next/link";

export function SectionHeading({
  id,
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="container-page mb-8 flex items-end justify-between gap-6 md:mb-10">
      <div className="flex flex-col gap-2">
        <p className="eyebrow text-ink-muted">{eyebrow}</p>
        <h2 id={id} className="text-heading">
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href} className="link-cta shrink-0 text-body-sm">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
