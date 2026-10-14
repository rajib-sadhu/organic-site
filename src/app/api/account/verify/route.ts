import { NextResponse } from "next/server";
import { z } from "zod";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { verifyEmail } from "@/server/services/account";
import { requireAccountsEnabled } from "@/server/lib/customer-auth";

export function POST(req: Request) {
  return accountRoute(async () => {
    await requireAccountsEnabled();
    const { token } = await parseBody(req, z.object({ token: z.string().min(20).max(200) }));
    await verifyEmail(token);
    return NextResponse.json({ success: true });
  });
}
