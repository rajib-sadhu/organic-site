import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthCard } from "@/components/account/ui";
import { ResetForm } from "@/components/account/ResetForm";
import { getAccountMode, getPasswordMode } from "@/server/lib/customer-auth";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  if ((await getAccountMode()) === "OFF") notFound();
  if ((await getPasswordMode()) === "OFF") notFound();
  const { token } = await params;
  return (
    <AuthCard title="Choose a new password" subtitle="This logs you out on every other device.">
      <ResetForm token={token} />
    </AuthCard>
  );
}
