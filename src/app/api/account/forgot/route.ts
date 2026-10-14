import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { forgotPasswordSchema } from "@/schema/account";
import { requestPasswordReset } from "@/server/services/account";
import { requireAccountsEnabled } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    const { email } = await parseBody(req, forgotPasswordSchema);
    await requestPasswordReset(email);
    // Same answer whether or not the account exists.
    return NextResponse.json({ success: true });
  });
}
