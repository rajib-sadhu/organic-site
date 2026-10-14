import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/schema/account";
import { requireCustomer } from "@/server/lib/customer-auth";

export function PATCH(req: Request) {
  return accountRoute(async () => {
    const session = await requireCustomer();
    const { name, phone, address } = await parseBody(req, profileSchema);
    await prisma.customer.update({
      where: { id: session.id },
      data: {
        name,
        phone: phone || null,
        shipName: address?.shipName ?? null,
        shipLine1: address?.shipLine1 ?? null,
        shipLine2: address?.shipLine2 || null,
        shipCity: address?.shipCity ?? null,
        shipState: address?.shipState ?? null,
        shipPincode: address?.shipPincode ?? null,
      },
    });
    return NextResponse.json({ success: true });
  });
}
