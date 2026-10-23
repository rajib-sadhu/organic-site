import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { registerFromOrderSchema, registerFromOrderNoPasswordSchema } from "@/schema/account";
import { registerFromOrder } from "@/server/services/account";
import { requireAccountsEnabled, getPasswordMode, startCustomerSession } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    const pwMode = await getPasswordMode();
    const schema = pwMode === "OFF" ? registerFromOrderNoPasswordSchema : registerFromOrderSchema;
    const input = await parseBody(req, schema);
    const password = "password" in input ? (input as { password: string }).password : undefined;
    const customer = await registerFromOrder(input.token, password);
    await startCustomerSession(customer);
    return NextResponse.json({ success: true });
  });
}
