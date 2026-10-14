import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { resetPasswordSchema } from "@/schema/account";
import { resetPassword } from "@/server/services/account";
import { requireAccountsEnabled, requirePasswordEnabled, startCustomerSession } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    await requirePasswordEnabled();
    const { token, password } = await parseBody(req, resetPasswordSchema);
    const customer = await resetPassword(token, password);
    await startCustomerSession(customer);
    return NextResponse.json({ success: true });
  });
}
