import { randomUUID } from "node:crypto";
import type { SessionState } from "./types.js";

export function newSessionState(options: {
  teamId: string;
  projectId: string;
  credentialId: string;
  agentProvider: string;
  agentModel: string;
}): SessionState {
  const id = randomUUID();
  const name = `paseo-vercel-sandbox-${id}`;
  const now = new Date().toISOString();
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    phase: "intent",
    sandboxName: name,
    region: "iad1",
    image: "vercel/sandbox/universal:latest",
    teamId: options.teamId,
    projectId: options.projectId,
    credentialId: options.credentialId,
    owner: randomUUID(),
    paseoHome: "/vercel/paseo-home",
    workspacePath: "/vercel/workspace",
    repoPath: "/vercel/workspace/repo",
    agentProvider: options.agentProvider,
    agentModel: options.agentModel,
    sessionIds: [],
    snapshotIds: [],
    snapshots: [],
  };
}
