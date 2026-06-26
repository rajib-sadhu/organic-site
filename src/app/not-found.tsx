import Link from "next/link";
import { Leaf, ArrowLeft, Search } from "lucide-react";
import { Container } from "@/components/ui/Container";

export default function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center py-20">
      <Container className="text-center">
        <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-leaf-soft">
          <Leaf className="h-14 w-14 text-forest/40" />
        </div>

        <p className="font-display text-8xl font-bold text-forest/15 sm:text-9xl">404</p>

        <h1 className="mt-2 font-display text-3xl text-forest-dark sm:text-4xl">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved. Let&apos;s
          get you back on track.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-6 text-sm font-medium text-cream transition-colors hover:bg-forest-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Link
            href="/products"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-forest/30 px-6 text-sm font-medium text-forest transition-colors hover:bg-leaf-soft"
          >
            <Search className="h-4 w-4" />
            Browse products
          </Link>
        </div>
      </Container>
    </div>
  );
}
