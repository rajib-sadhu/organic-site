import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthCard, TextLink, safeNext } from "@/components/account/ui";
import { LoginForm } from "@/components/account/LoginForm";
import { getAccountMode, getPasswordMode, getCustomerSession } from "@/server/lib/customer-auth";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const mode = await getAccountMode();
  if (mode === "OFF") notFound();
  const pwMode = await getPasswordMode();
  const next = safeNext((await searchParams).next);
  if (await getCustomerSession()) redirect(next);

  return (
    <AuthCard
      title="Log in"
      subtitle={mode === "REQUIRED" ? "Log in or create an account to place your order." : "See your orders, saved address and wishlist."}
      footer={<>New here? <TextLink href={`/account/register?next=${encodeURIComponent(next)}`}>Create an account</TextLink></>}
    >
      <LoginForm next={next} passwordMode={pwMode} />
    </AuthCard>
  );
}
