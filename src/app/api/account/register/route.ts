import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { registerSchema, registerNoPasswordSchema } from "@/schema/account";
import { register } from "@/server/services/account";
import { requireAccountsEnabled, getPasswordMode, startCustomerSession } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    const pwMode = await getPasswordMode();
    const schema = pwMode === "OFF" ? registerNoPasswordSchema : registerSchema;
    const input = await parseBody(req, schema);
    if (pwMode === "REQUIRED" && !("password" in input && input.password)) {
      throw new Error("A password is required to create an account.");
    }
    const customer = await register(input);
    await startCustomerSession(customer);
    return NextResponse.json({ success: true });
  });
}
