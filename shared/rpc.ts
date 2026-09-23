import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";
import { AGENT_IDS } from "./agents.js";

const agent = z.enum(AGENT_IDS);
const action = z.enum(["start", "stop", "resume", "delete", "diagnose"]);

const operation = z.object({
  id: z.string(),
  action,
  status: z.enum(["running", "failed", "complete"]),
  leaseUntil: z.string(),
  publicError: z.enum(["operation_failed", "operation_ambiguous", "operation_interrupted", "operation_expired", "credential_context_missing", "existing_host_missing", "daemon_identity_changed", "provider_readiness_failed"]).optional(),
});

const diagnostic = z.object({
  ok: z.boolean(),
  provider: z.string(),
  providerMatched: z.boolean(),
  status: z.string().optional(),
  modelCount: z.number().int().nonnegative().optional(),
  exitCode: z.number().int(),
  parseError: z.boolean(),
  checkedAt: z.string(),
});

const slot = z.object({
  agent,
  phase: z.enum([
    "empty", "intent", "creating", "created", "bootstrapping", "ready",
    "stopping", "stopped", "resuming", "destroying", "destroyed", "failed",
  ]),
  sandboxStatus: z.string().optional(),
  expiresAt: z.string().optional(),
  statusError: z.enum(["remote_status_unavailable", "existing_host_missing", "credential_context_missing"]).optional(),
  operation: operation.optional(),
  diagnostic: diagnostic.optional(),
  pairingRevealed: z.boolean().optional(),
  updatedAt: z.string().optional(),
});

const statusOutput = z.object({
  credentials: z.object({
    configured: z.boolean(),
    activeContextId: z.string().optional(),
    contextCount: z.number().int().nonnegative(),
    teamId: z.string().optional(),
    projectId: z.string().optional(),
    sessionTimeoutMinutes: z.number().int().optional(),
  }),
  slots: z.array(slot),
});

const credentialsSaveInput = z.object({
  teamId: z.string().min(1),
  projectId: z.string().min(1),
  vercelToken: z.string().min(1).optional(),
  gatewayKey: z.string().min(1).optional(),
  replaceVercelToken: z.boolean(),
  replaceGatewayKey: z.boolean(),
  sessionTimeoutMinutes: z.number().int().min(5).max(24 * 60).optional(),
});

export const statusRpc = defineRpc({
  name: "vercel-sandbox.status",
  input: z.object({ refresh: z.boolean().optional() }),
  output: statusOutput,
});

export const actRpc = defineRpc({
  name: "vercel-sandbox.act",
  input: z.object({
    agent,
    action,
    confirm: z.string().optional(),
  }),
  output: z.object({ accepted: z.boolean(), operationId: z.string() }),
});

export const revealPairingRpc = defineRpc({
  name: "vercel-sandbox.pairing.reveal",
  input: z.object({ agent }),
  output: z.object({ url: z.string(), revealedAt: z.string() }),
});

export const saveCredentialsRpc = defineRpc({
  name: "vercel-sandbox.credentials.save",
  input: credentialsSaveInput,
  output: z.object({ activeContextId: z.string() }),
});

export const removeCredentialsRpc = defineRpc({
  name: "vercel-sandbox.credentials.remove",
  input: z.object({}),
  output: z.object({ removed: z.boolean() }),
});

export type StatusOutput = z.output<typeof statusOutput>;
export type PublicSlot = z.output<typeof slot>;
export type CredentialsSaveInput = z.output<typeof credentialsSaveInput>;
