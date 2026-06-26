"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center py-20">
      <div className="mx-auto w-full max-w-lg px-4 text-center">
        <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-honey/15">
          <AlertTriangle className="h-14 w-14 text-honey-dark/60" />
        </div>

        <h1 className="font-display text-3xl text-forest-dark sm:text-4xl">
          Something went wrong
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          We hit an unexpected error. You can try again, or head back to the home page.
        </p>

        {error.digest && (
          <p className="mt-4 text-xs text-muted/60">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-6 text-sm font-medium text-cream transition-colors hover:bg-forest-dark"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-forest/30 px-6 text-sm font-medium text-forest transition-colors hover:bg-leaf-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
