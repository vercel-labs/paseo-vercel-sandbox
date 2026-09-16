import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "paseo_launcher";
const SESSION_SECONDS = 12 * 60 * 60;

function secret(env: NodeJS.ProcessEnv): string {
  const value = env.LAUNCHER_SECRET;
  if (!value || value.length < 32) throw new Error("launcher_setup_incomplete");
  return value;
}

function equal(a: string, b: string): boolean {
  const left = createHmac("sha256", "paseo-input").update(a).digest();
  const right = createHmac("sha256", "paseo-input").update(b).digest();
  return timingSafeEqual(left, right);
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function verifyOwnerKey(candidate: unknown, env: NodeJS.ProcessEnv = process.env): boolean {
  return typeof candidate === "string" && candidate.length <= 256 && equal(candidate, secret(env));
}

export function createSession(now = Date.now(), env: NodeJS.ProcessEnv = process.env): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_SECONDS }))
    .toString("base64url");
  return `${payload}.${sign(payload, secret(env))}`;
}

export function verifySession(value: string | undefined, now = Date.now(), env: NodeJS.ProcessEnv = process.env): boolean {
  if (!value || value.length > 512) return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !equal(signature, sign(payload, secret(env)))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof parsed.exp === "number" && parsed.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export function assertOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new Error("invalid_origin");
}

export function cookieOptions(request: Request) {
  const local = new URL(request.url).hostname === "localhost";
  return { httpOnly: true, secure: !local, sameSite: "strict" as const, path: "/", maxAge: SESSION_SECONDS };
}
