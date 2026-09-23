export const AGENT_IDS = ["codex", "claude", "opencode", "pi"] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_DETAILS: Record<AgentId, { title: string; detail: string }> = {
  codex: { title: "Codex", detail: "OpenAI coding agent" },
  claude: { title: "Claude Code", detail: "Anthropic coding agent" },
  opencode: { title: "OpenCode", detail: "Open source coding agent" },
  pi: { title: "Pi", detail: "Minimal coding agent" },
};
