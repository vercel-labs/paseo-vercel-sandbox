import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import process from "node:process";

export class ConflictError extends Error {
  constructor() { super("state_conflict"); }
}

export class StateLockedError extends Error {
  constructor() { super("state_locked"); }
}

export interface ExclusiveLockHandle {
  release(): Promise<void>;
}

export function digest(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: 0o700 });
}

async function lockIsRecoverable(path: string): Promise<boolean> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as { pid?: number; createdAt?: string };
    if (typeof value.pid !== "number" || typeof value.createdAt !== "string") return false;
    if (Date.now() - Date.parse(value.createdAt) < 5_000) return false;
    try {
      process.kill(value.pid, 0);
      return false;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "ESRCH";
    }
  } catch {
    return false;
  }
}

export async function acquireExclusiveLock(target: string): Promise<ExclusiveLockHandle> {
  const lock = `${target}.lock`;
  await ensureDirectory(dirname(target));
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const handle = await open(lock, "wx", 0o600);
      try {
        await writeFile(handle, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
      } finally {
        await handle.close();
      }
      return {
        release: async () => {
          await unlink(lock).catch(() => {});
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await lockIsRecoverable(lock)) {
        await rename(lock, `${lock}.stale-${randomUUID()}`).catch(() => {});
        continue;
      }
      if (attempt === 99) throw new StateLockedError();
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new StateLockedError();
}

export async function withExclusiveLock<T>(target: string, operation: () => Promise<T>): Promise<T> {
  const handle = await acquireExclusiveLock(target);
  try {
    return await operation();
  } finally {
    await handle.release();
  }
}

export async function atomicWrite(target: string, contents: string, expected: string): Promise<string> {
  const bytes = Buffer.from(contents, "utf8");
  const current = await stat(target).then(
    (value) => digest(readFileSyncNoFollow(target)),
    () => "MISSING",
  );
  if (current !== expected) throw new ConflictError();
  await ensureDirectory(dirname(target));
  const temporary = join(dirname(target), `.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    await writeFile(handle, bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, target);
  return digest(bytes);
}

function readFileSyncNoFollow(target: string): Buffer {
  const fd = openSyncNoFollow(target);
  try {
    const size = fstatSync(fd).size;
    const buffer = Buffer.alloc(size);
    readSyncFull(fd, buffer);
    return buffer;
  } finally {
    closeSync(fd);
  }
}

import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";

function openSyncNoFollow(target: string): number {
  return openSync(target, constants.O_RDONLY | constants.O_NOFOLLOW);
}

function readSyncFull(fd: number, buffer: Buffer): void {
  let offset = 0;
  while (offset < buffer.length) {
    const count = readSync(fd, buffer, offset, buffer.length - offset, offset);
    if (count <= 0) break;
    offset += count;
  }
}
