import { resolveVercelCredentials } from "@/dist/auth.js";
import { AGENT_IDS } from "@/web/types";
import { BlobSlotStore, storeScope } from "@/web/store";
import { requireOwner, errorResponse, json } from "@/web/http";

export async function GET(request: Request) {
  try {
    await requireOwner();
    const agent = new URL(request.url).searchParams.get("agent");
    if (!AGENT_IDS.includes(agent as never)) throw new Error("invalid_request");
    const creds = await resolveVercelCredentials();
    const record = (await new BlobSlotStore(storeScope(creds.projectId)).read(agent as (typeof AGENT_IDS)[number])).value;
    if (!record?.session?.pairingUrl || record.session.phase === "destroying") throw new Error("invalid_request");
    return json({ pairingUrl: record.session.pairingUrl });
  } catch (error) { return errorResponse(error); }
}
