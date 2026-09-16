import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession, COOKIE_NAME } from "./auth";
import { requireSetup } from "./config";

export async function requireOwner(): Promise<void> {
  requireSetup();
  const jar = await cookies();
  if (!verifySession(jar.get(COOKIE_NAME)?.value)) throw new Error("unauthorized");
}

export function json(value: unknown, status = 200): NextResponse {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function errorResponse(error: unknown): NextResponse {
  const code = error instanceof Error ? error.message : "";
  if (error instanceof Error && error.name === "VercelOidcContextError") return json({ error: "oidc_unavailable", missing: ["Enable OIDC in the project Security settings, then redeploy."] }, 503);
  if (code === "unauthorized") return json({ error: "unauthorized" }, 401);
  if (code === "invalid_origin") return json({ error: "invalid_origin" }, 403);
  if (code === "launcher_setup_incomplete") return json({ error: "setup_incomplete" }, 503);
  if (code === "operation_in_progress" || code === "state_conflict") return json({ error: "operation_in_progress" }, 409);
  if (code === "invalid_request") return json({ error: "invalid_request" }, 400);
  return json({ error: "request_failed" }, 500);
}
