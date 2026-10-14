import { siteConfig } from "@/lib/site";

/** Structured data for search engines. `<` is escaped so stored content can't close the script tag (XSS). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Schema.org requires absolute URLs; uploads are stored as site-relative paths. */
export function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${siteConfig.url}${path}`;
}
