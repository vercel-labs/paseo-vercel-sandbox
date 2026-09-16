import { after } from "next/server";
import { resolveVercelCredentials } from "@/dist/auth.js";
import { assertOrigin } from "@/web/auth";
import { requireOwner, errorResponse, json } from "@/web/http";
import { AGENT_IDS, type Action } from "@/web/types";
import { BlobSlotStore, storeScope } from "@/web/store";
import { acquireOperation } from "@/web/operations";
import { executeOperation } from "@/web/runtime";
import { parseObject } from "@/web/body";
import { reconcileAutoStop } from "@/web/reconcile";

export const maxDuration = 300;
const ACTIONS: Action[] = ["start", "stop", "resume", "delete"];

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await requireOwner();
    const body = await parseObject(request);
    if (!AGENT_IDS.includes(body.agent as never) || !ACTIONS.includes(body.action as Action)) throw new Error("invalid_request");
    const creds = await resolveVercelCredentials();
    const store = new BlobSlotStore(storeScope(creds.projectId));
    const agent = body.agent as (typeof AGENT_IDS)[number];
    if (body.action === "resume") await reconcileAutoStop(store, creds, agent);
    const acquired = await acquireOperation(store, agent, body.action as Action);
    after(() => executeOperation(store, acquired.record.agent, acquired.record.operation!.id));
    return json({ accepted: true, operationId: acquired.record.operation!.id }, 202);
  } catch (error) { return errorResponse(error); }
}
