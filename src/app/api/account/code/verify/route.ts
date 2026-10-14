import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { codeLoginSchema } from "@/schema/account";
import { loginWithCode } from "@/server/services/account";
import { requireAccountsEnabled, startCustomerSession } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    const { email, code } = await parseBody(req, codeLoginSchema);
    const { customer, created } = await loginWithCode(email, code);
    await startCustomerSession(customer);
    return NextResponse.json({ success: true, created });
  });
}
