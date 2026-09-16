import { cookies } from "next/headers";
import { assertOrigin, COOKIE_NAME, cookieOptions, createSession, verifyOwnerKey } from "@/web/auth";
import { setupStatus } from "@/web/config";
import { errorResponse, json } from "@/web/http";
import { parseObject } from "@/web/body";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const setup = setupStatus();
    if (!setup.ready) return json({ error: "setup_incomplete", missing: setup.missing }, 503);
    const body = await parseObject(request, 512);
    if (!verifyOwnerKey(body.key)) return json({ error: "invalid_key" }, 401);
    const jar = await cookies();
    jar.set(COOKIE_NAME, createSession(), cookieOptions(request));
    return json({ authenticated: true });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    const jar = await cookies();
    jar.set(COOKIE_NAME, "", { ...cookieOptions(request), maxAge: 0 });
    return json({ authenticated: false });
  } catch (error) { return errorResponse(error); }
}
