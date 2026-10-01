import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSitePage, sitePages } from "@/lib/site-pages";

// Every content page in src/lib/site-pages.ts (services, help, about, legal).
// Specific routes always win over this catch-all; unknown paths are 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return sitePages.map((page) => ({ page: page.path.slice(1).split("/") }));
}

async function pageFrom(props: PageProps<"/[...page]">) {
  const { page } = await props.params;
  return getSitePage(`/${page.join("/")}`);
}

export async function generateMetadata(props: PageProps<"/[...page]">): Promise<Metadata> {
  const page = await pageFrom(props);
  return page ? { title: `${page.title} | Solvane`, description: page.description } : {};
}

export default async function ContentPage(props: PageProps<"/[...page]">) {
  const page = await pageFrom(props);
  if (!page) notFound();

  return (
    <main className="flex-1">
      <nav aria-label="Breadcrumb" className="container-page py-4">
        <ol className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <li>
            <Link href="/" className="link-quiet">
              Home
            </Link>
          </li>
          {page.parent && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={page.parent.href} className="link-quiet">
                  {page.parent.label}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {page.title}
          </li>
        </ol>
      </nav>

      <article className="container-narrow flex flex-col gap-10 pt-6 pb-section md:pt-10">
        <header className="flex flex-col gap-3">
          <p className="eyebrow text-ink-muted">{page.eyebrow}</p>
          <h1 className="text-display">{page.title}</h1>
          <p className="text-body-lg text-ink-muted">{page.description}</p>
        </header>

        <div className="flex flex-col border-t">
          {page.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-3 border-b py-6">
              <h2 className="text-title">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="text-body text-ink-muted">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body text-ink-muted">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {page.related && page.related.length > 0 && (
          <nav aria-label="Related pages" className="flex flex-col gap-3">
            <p className="eyebrow text-ink-muted">See also</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {page.related
                .filter((link) => link.href !== page.path)
                .map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="link-cta text-body-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        )}
      </article>
    </main>
  );
}
