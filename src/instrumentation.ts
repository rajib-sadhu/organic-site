// Runs once per Next.js server instance, before it accepts requests.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  await import("./instrumentation-node");
}
