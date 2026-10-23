import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { forgotPasswordSchema } from "@/schema/account";
import { requestPasswordReset } from "@/server/services/account";
import { requireAccountsEnabled, requirePasswordEnabled } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    await requirePasswordEnabled();
    const { email } = await parseBody(req, forgotPasswordSchema);
    await requestPasswordReset(email);
    return NextResponse.json({ success: true });
  });
}
