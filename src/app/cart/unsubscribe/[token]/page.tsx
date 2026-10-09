import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { UnsubscribeButton } from "./UnsubscribeButton";

export const metadata: Metadata = {
  title: "Stop cart reminders",
  robots: { index: false, follow: false },
};

// Opt-out needs a click (POST), so link scanners that prefetch email links
// can't unsubscribe people by accident.
export default async function CartUnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <Container>
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="font-display text-3xl text-forest-dark">Stop cart reminders?</h1>
        <p className="mt-3 text-muted">
          We&apos;ll stop emailing you about items left in your cart. Order confirmations are not affected.
        </p>
        <UnsubscribeButton token={token} />
      </div>
    </Container>
  );
}
