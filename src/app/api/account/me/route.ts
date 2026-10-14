import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountMode, getCustomerSession } from "@/server/lib/customer-auth";

/** Account mode + the logged-in customer (or null). Never cached: it reads the session cookie. */
export async function GET() {
  const mode = await getAccountMode();
  const session = mode === "OFF" ? null : await getCustomerSession();
  if (!session) return NextResponse.json({ mode, customer: null });

  const c = await prisma.customer.findUniqueOrThrow({ where: { id: session.id } });
  return NextResponse.json({
    mode,
    customer: {
      email: c.email,
      name: c.name,
      phone: c.phone,
      verified: !!c.emailVerifiedAt,
      hasPassword: !!c.passwordHash,
      address: c.shipLine1
        ? { shipName: c.shipName, shipLine1: c.shipLine1, shipLine2: c.shipLine2, shipCity: c.shipCity, shipState: c.shipState, shipPincode: c.shipPincode }
        : null,
    },
  });
}
