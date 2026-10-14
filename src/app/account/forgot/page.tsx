import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthCard, TextLink } from "@/components/account/ui";
import { ForgotForm } from "@/components/account/ForgotForm";
import { getAccountMode } from "@/server/lib/customer-auth";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };
// The OFF check reads settings, so this must render per request, not at build time.
export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  if ((await getAccountMode()) === "OFF") notFound();
  return (
    <AuthCard
      title="Forgot password?"
      subtitle="We'll email you a link to choose a new one."
      footer={<>Remembered it? <TextLink href="/account/login">Log in</TextLink></>}
    >
      <ForgotForm />
    </AuthCard>
  );
}
