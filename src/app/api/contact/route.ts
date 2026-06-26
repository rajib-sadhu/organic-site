import { NextResponse } from "next/server";
import { contactSchema } from "@/schema/contact";

// Contact form handler. Validation is server-authoritative (never trust the client).
// Phase 3 will send this via Resend / persist it; for now it validates and acks.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // TODO (Phase 3): send via Resend + optionally persist as a lead.
  console.log("[contact] new message from", parsed.data.email);

  return NextResponse.json({ ok: true });
}
