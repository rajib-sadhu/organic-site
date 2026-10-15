import { NextResponse } from "next/server";
import { checkHealth } from "@/server/services/health";

// Always live — a cached health check is worse than none.
export const dynamic = "force-dynamic";

// 200 when healthy, 503 otherwise, so uptime monitors can alert on status alone.
export async function GET() {
  const report = await checkHealth();
  return NextResponse.json(report, {
    status: report.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
