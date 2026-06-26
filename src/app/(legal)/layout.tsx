import { Container } from "@/components/ui/Container";

// Shared styling for static policy pages. Descendant variants style the headings,
// paragraphs and lists each page renders — no per-element class repetition.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-14 sm:py-20">
      <Container>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 rounded-xl border border-honey/40 bg-honey/10 px-4 py-3 text-sm text-clay">
            <strong className="font-semibold">Placeholder content.</strong> Replace with
            lawyer-reviewed copy before going live (also required for Razorpay activation).
          </div>
          <article className="leading-relaxed text-muted [&_h1]:font-display [&_h1]:text-4xl [&_h1]:text-forest-dark [&_h1]:mb-2 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-forest-dark [&_h2]:mt-8 [&_h2]:mb-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_li]:marker:text-leaf [&_strong]:text-ink [&_a]:text-forest [&_a]:underline">
            {children}
          </article>
        </div>
      </Container>
    </div>
  );
}
