import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { atomicWrite, digest, withExclusiveLock } from "./fs.js";

export interface VercelCredentials {
  token: string;
  teamId: string;
  projectId: string;
}

export interface CredentialContext extends VercelCredentials {
  id: string;
  gatewayKey: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredCredentials {
  schema: 1;
  activeContextId: string;
  contexts: CredentialContext[];
}

export interface StoredCredentialsRecord {
  value: StoredCredentials | null;
  digest: string;
}

export function pluginStateRoot(): string {
  return process.env.PASEO_VERCEL_SANDBOX_STATE_DIR ?? join(process.env.PASEO_HOME ?? join(homedir(), ".paseo"), "vercel-sandbox-state");
}

async function readRaw(path: string): Promise<StoredCredentialsRecord> {
  try {
    const text = await import("node:fs/promises").then((fs) => fs.readFile(path, "utf8"));
    const value = JSON.parse(text) as StoredCredentials;
    if (value.schema !== 1 || !Array.isArray(value.contexts) || !value.contexts.length) throw new Error("invalid_credentials");
    if (!value.contexts.some((context) => context.id === value.activeContextId)) throw new Error("invalid_credentials");
    return { value, digest: digest(text) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { value: null, digest: "MISSING" };
    throw error;
  }
}

export class CredentialsStore {
  private root: string;

  constructor(root = pluginStateRoot()) {
    this.root = root;
  }

  private get path(): string {
    return join(this.root, "credentials.json");
  }

  async read(): Promise<StoredCredentialsRecord> {
    return withExclusiveLock(this.path, () => readRaw(this.path));
  }

  async readActive(): Promise<CredentialContext> {
    const record = await this.read();
    const context = record.value?.contexts.find((item) => item.id === record.value?.activeContextId);
    if (!context) throw new Error("credentials_missing");
    return context;
  }

  async readContext(id: string): Promise<CredentialContext> {
    const record = await this.read();
    const context = record.value?.contexts.find((item) => item.id === id);
    if (!context) throw new Error("credential_context_missing");
    return context;
  }

  async save(input: {
    teamId: string;
    projectId: string;
    vercelToken?: string;
    gatewayKey?: string;
    replaceVercelToken: boolean;
    replaceGatewayKey: boolean;
    preserveContextIds?: readonly string[];
    expectedDigest?: string;
  }): Promise<string> {
    return withExclusiveLock(this.path, async () => {
      const current = await readRaw(this.path);
      if (input.expectedDigest !== undefined && current.digest !== input.expectedDigest) throw new Error("state_conflict");
      const previous = current.value?.contexts.find((item) => item.id === current.value?.activeContextId);
      if (!previous && (!input.vercelToken || !input.gatewayKey)) throw new Error("credentials_missing_fields");
      if (previous && input.replaceVercelToken && !input.vercelToken) throw new Error("vercel_token_missing");
      if (previous && input.replaceGatewayKey && !input.gatewayKey) throw new Error("gateway_key_missing");

      const now = new Date().toISOString();
      const active: CredentialContext = {
        id: randomUUID(),
        token: input.replaceVercelToken && input.vercelToken ? input.vercelToken : previous?.token ?? input.vercelToken ?? "",
        teamId: input.teamId,
        projectId: input.projectId,
        gatewayKey: input.replaceGatewayKey && input.gatewayKey ? input.gatewayKey : previous?.gatewayKey ?? input.gatewayKey ?? "",
        createdAt: now,
        updatedAt: now,
      };
      if (!active.token || !active.gatewayKey) throw new Error("credentials_missing_fields");
      const preserve = new Set(input.preserveContextIds ?? []);
      const contexts = [...(current.value?.contexts ?? []).filter((item) => preserve.has(item.id)), active];
      const value: StoredCredentials = { schema: 1, activeContextId: active.id, contexts };
      const next = JSON.stringify(value, null, 2) + "\n";
      await atomicWrite(this.path, next, input.expectedDigest ?? current.digest);
      return active.id;
    });
  }

  async remove(expectedDigest?: string): Promise<void> {
    return withExclusiveLock(this.path, async () => {
      const current = await readRaw(this.path);
      if (expectedDigest !== undefined && current.digest !== expectedDigest) throw new Error("state_conflict");
      if (!current.value) return;
      const fs = await import("node:fs/promises");
      await fs.unlink(this.path);
    });
  }
}
