import { NextResponse } from "next/server";
import { accountRoute } from "@/server/lib/account-route";
import { sendVerificationEmail } from "@/server/services/account";
import { requireCustomer } from "@/server/lib/customer-auth";

export function POST() {
  return accountRoute(async () => {
    const session = await requireCustomer();
    await sendVerificationEmail(session.id);
    return NextResponse.json({ success: true });
  });
}
