import { NextResponse } from "next/server";
import { endCustomerSession } from "@/server/lib/customer-auth";

export async function POST() {
  await endCustomerSession();
  return NextResponse.json({ success: true });
}
