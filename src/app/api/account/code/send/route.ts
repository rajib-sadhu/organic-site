import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { codeRequestSchema } from "@/schema/account";
import { sendLoginCode } from "@/server/services/account";
import { requireAccountsEnabled } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    const { email } = await parseBody(req, codeRequestSchema);
    return NextResponse.json(await sendLoginCode(email));
  });
}
