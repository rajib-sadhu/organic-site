import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Container } from "@/components/ui/Container";

export const inputCn =
  "w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest";

export function AuthCard({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="py-12 sm:py-16">
      <Container className="mx-auto max-w-md">
        <div className="text-center">
          <h1 className="font-display text-4xl text-forest-dark">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        </div>
        <div className="mt-8 rounded-2xl border border-line bg-paper p-6">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </Container>
    </div>
  );
}

export function Field({ label, error, children, hint }: {
  label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-sm font-medium text-ink">
        {label}
        {hint}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-clay">{error}</span>}
    </label>
  );
}

export function SubmitButton({ loading, children, disabled }: { loading: boolean; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-forest text-sm font-medium text-cream transition-colors hover:bg-forest-dark disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="font-medium text-forest hover:text-forest-dark">{children}</Link>;
}

/** Only same-site paths, so ?next= can't send someone to another site after login. */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** POST JSON; returns the parsed body or throws with the server's message. */
export async function postJson<T = Record<string, unknown>>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
  return json as T;
}
