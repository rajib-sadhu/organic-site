"use client";

import Link from "next/link";
import { User, UserCheck } from "lucide-react";
import { useAccount } from "@/store/account";

export function AccountNavButton() {
  const loaded = useAccount((s) => s.loaded);
  const mode = useAccount((s) => s.mode);
  const customer = useAccount((s) => s.customer);
  if (!loaded || mode === "OFF") return null;

  const Icon = customer ? UserCheck : User;
  return (
    <Link
      href={customer ? "/account" : "/account/login"}
      aria-label={customer ? "My account" : "Log in"}
      title={customer ? "My account" : "Log in"}
      className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-sand"
    >
      <Icon className="h-5 w-5" />
    </Link>
  );
}
