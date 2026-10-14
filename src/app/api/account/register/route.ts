import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { registerSchema } from "@/schema/account";
import { register } from "@/server/services/account";
import { requireAccountsEnabled, startCustomerSession } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    const input = await parseBody(req, registerSchema);
    const customer = await register(input);
    await startCustomerSession(customer);
    return NextResponse.json({ success: true });
  });
}
