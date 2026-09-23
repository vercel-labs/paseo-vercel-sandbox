import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { AGENT_IDS, type AgentId } from "../shared/agents.js";
import { atomicWrite, ConflictError, digest, withExclusiveLock } from "./fs.js";
import type { SlotRecord } from "./types.js";

export { ConflictError };

export interface StoredSlot {
  value: SlotRecord | null;
  digest: string;
}

export function agentIsValid(value: string): value is AgentId {
  return (AGENT_IDS as readonly string[]).includes(value);
}

async function readRaw(path: string, agent: AgentId): Promise<StoredSlot> {
  try {
    const fs = await import("node:fs/promises");
    const text = await fs.readFile(path, "utf8");
    const value = JSON.parse(text) as SlotRecord;
    if (value.schema !== 1 || value.agent !== agent) throw new Error("invalid_stored_state");
    return { value, digest: digest(text) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { value: null, digest: "MISSING" };
    throw error;
  }
}

export class SlotStore {
  private root: string;

  constructor(root: string) {
    this.root = root;
  }

  path(agent: AgentId): string {
    return join(this.root, "slots", `${agent}.json`);
  }

  async read(agent: AgentId): Promise<StoredSlot> {
    return withExclusiveLock(this.path(agent), () => readRaw(this.path(agent), agent));
  }

  async write(agent: AgentId, value: SlotRecord, expected: string): Promise<string> {
    const path = this.path(agent);
    return withExclusiveLock(path, async () => {
      const current = await readRaw(path, agent);
      if (current.digest !== expected) throw new ConflictError();
      return atomicWrite(path, JSON.stringify(value, null, 2) + "\n", expected);
    });
  }

  async update(agent: AgentId, mutate: (record: SlotRecord | null) => SlotRecord | Promise<SlotRecord>): Promise<SlotRecord> {
    const path = this.path(agent);
    return withExclusiveLock(path, async () => {
      const current = await readRaw(path, agent);
    const value = await mutate(current.value ? structuredClone(current.value) : null);
      const next = digest(JSON.stringify(value, null, 2) + "\n");
      await atomicWrite(path, JSON.stringify(value, null, 2) + "\n", current.digest);
      return value;
    });
  }
}

export function newOperationId(): string {
  return randomUUID();
}
