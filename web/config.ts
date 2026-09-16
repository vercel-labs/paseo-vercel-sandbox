export interface SetupStatus {
  ready: boolean;
  missing: string[];
}

export function setupStatus(env: NodeJS.ProcessEnv = process.env): SetupStatus {
  const missing: string[] = [];
  if (!env.LAUNCHER_SECRET || env.LAUNCHER_SECRET.length < 32) missing.push("LAUNCHER_SECRET");
  if (!env.AI_GATEWAY_API_KEY) missing.push("AI_GATEWAY_API_KEY");
  if (!env.BLOB_STORE_ID && !env.BLOB_READ_WRITE_TOKEN) {
    missing.push("BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN");
  }
  return { ready: missing.length === 0, missing };
}

export function requireSetup(env: NodeJS.ProcessEnv = process.env): void {
  const status = setupStatus(env);
  if (!status.ready) throw new Error("launcher_setup_incomplete");
}
