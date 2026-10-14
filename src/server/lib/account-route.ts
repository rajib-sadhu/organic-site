import { NextResponse } from "next/server";
import type { z } from "zod";
import { AccountError } from "@/server/lib/customer-auth";

/** Parse a JSON body against a schema; the first issue becomes a 400 message. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new AccountError(parsed.error.issues[0]?.message ?? "Invalid request.");
  return parsed.data;
}

/** Turn AccountError into a JSON error response; anything else is a 500. */
export async function accountRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AccountError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[account]", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
