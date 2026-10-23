import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthCard, TextLink, safeNext } from "@/components/account/ui";
import { RegisterForm } from "@/components/account/RegisterForm";
import { getAccountMode, getPasswordMode, getCustomerSession } from "@/server/lib/customer-auth";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if ((await getAccountMode()) === "OFF") notFound();
  const pwMode = await getPasswordMode();
  const next = safeNext((await searchParams).next);
  if (await getCustomerSession()) redirect(next);

  return (
    <AuthCard
      title="Create an account"
      subtitle="Track orders, save your address and keep your wishlist on every device."
      footer={<>Already have an account? <TextLink href={`/account/login?next=${encodeURIComponent(next)}`}>Log in</TextLink></>}
    >
      <RegisterForm next={next} passwordMode={pwMode} />
    </AuthCard>
  );
}
