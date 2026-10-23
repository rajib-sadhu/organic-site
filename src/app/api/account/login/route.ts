import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { passwordLoginSchema } from "@/schema/account";
import { loginWithPassword } from "@/server/services/account";
import { requireAccountsEnabled, requirePasswordEnabled, startCustomerSession } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    await requirePasswordEnabled();
    const { email, password } = await parseBody(req, passwordLoginSchema);
    const customer = await loginWithPassword(email, password);
    await startCustomerSession(customer);
    return NextResponse.json({ success: true });
  });
}
