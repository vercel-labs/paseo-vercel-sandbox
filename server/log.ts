import { redactText } from "./providers.js";

// One JSON line per event on stdout, which Paseo exposes through `paseo plugin logs vercel-sandbox`.
// Every line passes through redactText so a Gateway key, token, or pairing offer never reaches the log.
export function logEvent(event: string, fields: Record<string, unknown>, secret?: string): void {
  const line = JSON.stringify({ plugin: "vercel-sandbox", event, ...fields, at: new Date().toISOString() });
  console.log(redactText(line, secret));
}
