import { resolveVercelCredentials } from "@/dist/auth.js";
import { AGENT_IDS, type PublicSlot } from "@/web/types";
import { BlobSlotStore, storeScope } from "@/web/store";
import { requireOwner, errorResponse, json } from "@/web/http";
import { setupStatus } from "@/web/config";
import { observeSlot } from "@/web/reconcile";

export async function GET() {
  const setup = setupStatus();
  if (!setup.ready) return json({ authenticated: false, setup }, 503);
  try {
    await requireOwner();
    const creds = await resolveVercelCredentials();
    const store = new BlobSlotStore(storeScope(creds.projectId));
    const slots: PublicSlot[] = await Promise.all(AGENT_IDS.map(async agent => {
      const observed = await observeSlot(store, creds, agent);
      const record = observed.stored.value;
      const expired = record?.operation?.status === "running" && Date.parse(record.operation.leaseUntil) <= Date.now();
      return { agent, phase: observed.phase, operation: record?.operation && {
        id: record.operation.id, action: record.operation.action, status: expired ? "failed" : record.operation.status,
        leaseUntil: record.operation.leaseUntil, publicError: expired ? "operation_expired" : record.operation.publicError,
      }, updatedAt: record?.session?.updatedAt };
    }));
    return json({ authenticated: true, setup, slots });
  } catch (error) { return errorResponse(error); }
}
