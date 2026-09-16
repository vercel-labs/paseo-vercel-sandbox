import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import type { AgentId, SlotRecord, StoredSlot } from "./types";

export class ConflictError extends Error {
  constructor() { super("state_conflict"); }
}

export interface SlotStore {
  read(agent: AgentId): Promise<StoredSlot>;
  write(agent: AgentId, value: SlotRecord, expectedEtag: string | null): Promise<string>;
}

function pathname(scope: string, agent: AgentId): string {
  return `paseo-launcher/${scope}/${agent}.json`;
}

export class BlobSlotStore implements SlotStore {
  private scope: string;
  constructor(scope: string) { this.scope = scope; }

  async read(agent: AgentId): Promise<StoredSlot> {
    // Compression weakens the HTTP ETag; CAS needs the stored representation.
    const result = await get(pathname(this.scope, agent), { access: "private", useCache: false, headers: { "accept-encoding": "identity" } });
    if (result === null) return { value: null, etag: null };
    if (result.statusCode !== 200) throw new Error("unexpected_blob_response");
    const value = await new Response(result.stream).json() as SlotRecord;
    if (value.schema !== 1 || value.agent !== agent) throw new Error("invalid_stored_state");
    return { value, etag: result.blob.etag };
  }

  async write(agent: AgentId, value: SlotRecord, expectedEtag: string | null): Promise<string> {
    try {
      const result = await put(pathname(this.scope, agent), JSON.stringify(value), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: expectedEtag !== null,
        ...(expectedEtag === null ? {} : { ifMatch: expectedEtag }),
      });
      return result.etag;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) throw new ConflictError();
      if (expectedEtag === null && (await this.read(agent)).value !== null) throw new ConflictError();
      throw error;
    }
  }
}

export function storeScope(projectId: string, env: NodeJS.ProcessEnv = process.env): string {
  const deployment = env.VERCEL_ENV ?? "development";
  return `${projectId}/${deployment}`;
}
