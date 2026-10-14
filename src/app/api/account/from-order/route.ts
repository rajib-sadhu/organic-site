import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { registerFromOrderSchema } from "@/schema/account";
import { registerFromOrder } from "@/server/services/account";
import { requireAccountsEnabled, startCustomerSession } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    const { token, password } = await parseBody(req, registerFromOrderSchema);
    const customer = await registerFromOrder(token, password);
    await startCustomerSession(customer);
    return NextResponse.json({ success: true });
  });
}
