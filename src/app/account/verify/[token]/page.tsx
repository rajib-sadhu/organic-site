import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthCard } from "@/components/account/ui";
import { VerifyEmail } from "@/components/account/VerifyEmail";
import { getAccountMode } from "@/server/lib/customer-auth";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  if ((await getAccountMode()) === "OFF") notFound();
  const { token } = await params;
  return (
    <AuthCard title="Confirm your email">
      <VerifyEmail token={token} />
    </AuthCard>
  );
}
