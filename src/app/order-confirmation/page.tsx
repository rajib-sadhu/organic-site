"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CreateAccountFromOrder } from "@/components/account/CreateAccountFromOrder";

function ConfirmationContent() {
  const params = useSearchParams();
  const orderNo = params.get("orderNo");
  const token = params.get("token");
  const method = params.get("method");

  if (!orderNo) {
    return (
      <Container>
        <div className="flex flex-col items-center py-24 text-center">
          <h1 className="font-display text-3xl text-forest-dark">No order found</h1>
          <p className="mt-2 text-muted">This page is shown after a successful checkout.</p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 text-sm font-medium text-cream hover:bg-forest-dark"
          >
            Browse products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    );
  }

  const isPaid = method === "razorpay";

  return (
    <Container>
      <div className="mx-auto max-w-lg py-16 text-center sm:py-24">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-soft text-forest">
          <CheckCircle className="h-10 w-10" />
        </span>

        <h1 className="mt-8 font-display text-4xl text-forest-dark sm:text-5xl">Order placed!</h1>
        <p className="mt-3 text-lg text-muted">
          Thank you for your order. We&apos;ll start preparing it right away.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-cream p-6 text-left">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Order number</dt>
              <dd className="font-semibold text-forest-dark">{orderNo}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Payment</dt>
              <dd className="font-medium text-ink">{isPaid ? "Paid online" : "Cash on Delivery"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Status</dt>
              <dd className="inline-flex items-center gap-1.5 font-medium text-forest">
                <Package className="h-4 w-4" /> Confirmed
              </dd>
            </div>
          </dl>
        </div>

        <p className="mt-6 text-sm text-muted">
          A confirmation email with your invoice will be sent shortly.
          {token && " You can track your order using the link in the email."}
        </p>

        {token && <CreateAccountFromOrder token={token} />}

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {token && (
            <Link
              href={`/order/${token}`}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-forest/30 px-7 text-sm font-medium text-forest hover:bg-leaf-soft"
            >
              Track order
            </Link>
          )}
          <Link
            href="/products"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 text-sm font-medium text-cream hover:bg-forest-dark"
          >
            Continue shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Container>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <Container>
          <div className="py-24 text-center text-muted">Loading…</div>
        </Container>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
