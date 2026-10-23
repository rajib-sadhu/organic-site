import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { changePasswordSchema } from "@/schema/account";
import { changePassword } from "@/server/services/account";
import { requireCustomer, requirePasswordEnabled, startCustomerSession } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requirePasswordEnabled();
    const session = await requireCustomer();
    const { currentPassword, newPassword } = await parseBody(req, changePasswordSchema);
    const customer = await changePassword(session.id, currentPassword, newPassword);
    await startCustomerSession(customer);
    return NextResponse.json({ success: true });
  });
}
