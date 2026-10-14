import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthCard, TextLink } from "@/components/account/ui";
import { ForgotForm } from "@/components/account/ForgotForm";
import { getAccountMode, getPasswordMode } from "@/server/lib/customer-auth";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  if ((await getAccountMode()) === "OFF") notFound();
  if ((await getPasswordMode()) === "OFF") notFound();
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
