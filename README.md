# Paseo + Vercel Sandbox

Run a [Paseo](https://paseo.sh) daemon and a coding agent inside a persistent
[Vercel Sandbox](https://vercel.com/docs/sandbox), then connect from your
existing Paseo client over Paseo's end-to-end encrypted relay.

The sandbox filesystem is preserved across stop and resume, so you can pick up
where you left off. The daemon inside the sandbox never listens on a public
port: clients reach it through the Paseo relay only.

This is an independent package. It does not require changes to Paseo and does
not depend on Paseo's experimental plugin API.

## Deploy your launcher

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fpaseo-vercel-sandbox%2Ftree%2Fpaseo-web-launcher-20260916&project-name=paseo-sandbox&repository-name=paseo-sandbox&env=LAUNCHER_SECRET%2CAI_GATEWAY_API_KEY&envDescription=Set+a+random+owner+access+key+of+at+least+32+characters+and+your+Vercel+AI+Gateway+API+key.+Keep+both+private.&envLink=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fpaseo-vercel-sandbox%2Ftree%2Fpaseo-web-launcher-20260916%23deploy-your-launcher&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22private%22%7D%5D)

Deploy a private web launcher to your Vercel account. Choose Codex, Claude Code,
OpenCode, or Pi, start a sandbox, and pair it with Paseo. The launcher runs on Vercel, so you can return from another browser.

The button creates a Vercel project and a **private Blob store** for session
records and pairing links. Set two variables when prompted:

| Variable | Value |
| --- | --- |
| `LAUNCHER_SECRET` | At least 32 random characters from your password manager. Use this key to sign in. |
| `AI_GATEWAY_API_KEY` | Your [Vercel AI Gateway API key](https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys). |

Open the deployed app, sign in with your access key, choose an agent, and select
**Start host**. When ready, select **Show pairing**, then **Copy**. In [Paseo](https://app.paseo.sh),
select **Paste pairing link** (under **Hosts → Add host** if already connected),
paste it, and select **Pair**. Return to the workspace screen. Choose **Add project
→ Search for directory**, enter `/vercel/workspace/repo`, and select it. Choose
**Select model**, then your agent and model (**Gateway** for Codex). Enter a task
and select **Create**. Keep the pairing link private.

The web launcher uses `vercel/sandbox/universal:latest` and installs the
compatible agent versions pinned below. Each agent choice has its own sandbox;
conversations on that host share its files and credentials. Only starting an
agent creates a sandbox; deployment alone does not.

Wait for active work to finish before selecting **Stop**. **Resume** restores
files and conversations, then restarts the daemon. The 30-minute timeout and
24-hour snapshot retention below still apply. Save any work you need before
**Delete**, which removes the sandbox and its snapshots.

For the web app, select Node.js 24.x in the Vercel project’s build settings.

If setup fails, check the app's setup checklist and your project variables.
Interrupted operations retain their session record. Use **Retry** when offered;
the launcher reuses that session instead of creating another one. After a timeout, Retry becomes available within 10 minutes of the operation
starting.
Operations have a bounded execution window after the request, independently of
the browser; they do not retry automatically. Missing or expired hosts are never
silently replaced: explicitly delete their record before starting again.

The project must have OIDC enabled under **Settings → Security** so the launcher
can create sandboxes using its Vercel identity. The default project setup supplies
this identity; if it is disabled, enable it and redeploy.

This is a single-owner app. Anyone with your access key can manage all four
sessions. It uses the deployed project's Vercel identity, so a personal Vercel
token is not needed. Keep the connected Blob store private. CLI sessions below
use local records and are separate from the web launcher.

For terminal control, use the CLI instructions below.

## Prerequisites

The following steps are for terminal control. Web users can use the Deploy Button above.

- Node.js 22 or newer, npm, Git, and the [Vercel CLI](https://vercel.com/docs/cli).
- A Vercel account with access to a project that can create sandboxes.
- A [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) API key for the
  coding agent.
- A browser for the verified web setup. CLI, desktop, and mobile clients are also available from Paseo.

## Install

This launcher uses the published Paseo 0.8.0 SDK and CLI. It is not published
to npm. Clone this repository, then build and install a local tarball:

```bash
git clone https://github.com/vercel-labs/paseo-vercel-sandbox.git
cd paseo-vercel-sandbox
npm ci
npm run build
npm pack
npm install -g ./elisabethrulke-paseo-vercel-sandbox-0.1.0.tgz
```

### Authenticate

Authenticate the launcher with the Vercel CLI so it can mint project-scoped
OIDC tokens:

```bash
vercel login
vercel link   # from paseo-vercel-sandbox
```

Run the launcher commands below from that linked directory.

Alternatively set `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID`.

Set the agent key:

```bash
export AI_GATEWAY_API_KEY=...
```

```bash
paseo-sandbox doctor
```

For a CLI client, install the version used by this integration:

```bash
npm install -g @getpaseo/cli@0.8.0
```

`doctor` confirms Vercel authentication and the agent key without creating
anything.

## Create a session

```bash
paseo-sandbox create --provider codex --image vercel/sandbox/universal:latest
# prints a session id

paseo-sandbox provision <id>
```

`--provider` accepts `codex`, `claude`, `opencode`, `pi`, or `copilot`.
`--model` accepts a slash-qualified AI Gateway model ID. Omitting the model
uses the provider default: `openai/gpt-6-astra` for Codex and Copilot, and
`anthropic/claude-sonnet-5` for Claude, OpenCode, and Pi.

`provision` creates the sandbox, installs the pinned Paseo CLI
(`@getpaseo/cli@0.8.0`) and all pinned agent CLIs, configures Gateway access,
starts the daemon on localhost, enables the relay, and runs Paseo's provider
diagnostic API for the selected provider. The launcher treats a diagnostic as
usable only when Paseo reports `Status: Ready` and at least one model. If the
diagnostic fails after pairing, the session is marked failed but its pairing
link is preserved so `connect` and `resume` remain available for recovery.

The exact agent pins are `@openai/codex@0.154.0`,
`@anthropic-ai/claude-code@2.1.273`, `opencode-ai@1.18.31`,
`@earendil-works/pi-coding-agent@0.85.1`, and `@github/copilot@1.0.83`.
These are external CLI versions, not Paseo's bundled server SDK versions.

The disposable sandbox home receives owner-only files. The launcher pins the
provider directories in the daemon environment: Claude to
`$HOME/.claude`, OpenCode config to `$HOME/.config/opencode`, OpenCode data to
`$HOME/.local/share`, and Pi to `$HOME/.pi/agent`. Claude settings are merged
with a Gateway model and supported model-alias keys; OpenCode receives `vercel`
auth in `$HOME/.local/share/opencode/auth.json`; Pi receives
`vercel-ai-gateway` auth in `$HOME/.pi/agent/auth.json`; Codex receives its
Responses provider in `$HOME/.codex/config.toml`. Paseo’s `config.json` adds
the configured Gateway model to Codex’s catalog and supplies Copilot’s configured
model as its picker entry and BYOK default. The configured Copilot picker entry is static;
it does not establish runtime model discovery, model execution, or Gateway BYOK
routing. `OPENCODE_AUTH_CONTENT` is
cleared so it cannot override the managed file. Unrelated JSON entries, legal
Codex TOML values, and Codex settings such as `approval_policy` are preserved
across retries. The Gateway key itself is passed only through command
environment, never bootstrap source, command arguments, or logs.

## Run a sample task

For the empty workspace created above, seed the sample project and run a task:

```bash
paseo-sandbox seed <id>
paseo-sandbox run <id> 'Run npm test, fix src/math.mjs so the test passes, and explain the change. Do not modify test/ or package.json.'
```

Expect one passing test and no failures. This creates the conversation you open
in the next step. `seed` writes fixture files; use it only in this empty sample
workspace, not in your own repository.

## Connect from Paseo

```bash
paseo-sandbox connect <id>
```

It prints the exact command for the CLI client:

```bash
PASEO_HOST="$(paseo-sandbox connect <id> --url)" paseo ls
```

`connect` prints this command without exposing the credential. `connect <id>
--url` deliberately reveals the private link for pairing a graphical client.
The environment-variable form keeps the link out of process arguments.

To pair the [Paseo web client](https://app.paseo.sh), run
`paseo-sandbox connect <id> --url`. In the web client, select **Hosts → Add
host → Paste pairing link**. Paste the entire URL into **Pairing link** and
select **Pair**. Select **Back**, then open the workspace under **repo** in
the sidebar and the existing conversation. This explicit pairing flow also
works in a browser with no saved Paseo hosts.
Web pairing and user-originated follow-ups were verified with Codex, Claude
Code, OpenCode, and Pi on September 16, 2026. Desktop and mobile were not
part of that verification.
The pairing link is a credential: anyone holding it can reach your daemon.
Do not commit it or include it in shared logs.

## Stop and resume

```bash
paseo-sandbox stop <id>
paseo-sandbox resume <id>
```

`resume` requires a stopped or stopping Sandbox; the SDK waits for snapshotting
to finish. If it is already running, finish active work
and run `stop` first. This prevents an existing daemon from retaining old credentials.

`resume` restarts the daemon, so it needs `AI_GATEWAY_API_KEY` in the
environment again, and it refuses to continue if the restarted daemon's
identity does not match the original pairing offer.

Stop snapshots the sandbox filesystem. Resume boots a new VM session from that
snapshot. Your repository files, Paseo home, and agent history on disk survive.
Running processes do not survive. The daemon is restarted on resume. Continue
an existing conversation with:

```bash
PASEO_HOST="$(paseo-sandbox connect <id> --url)" paseo send <agent-id> '<follow-up>'
```

This starts a new turn using the saved conversation.

## Export your work

```bash
paseo-sandbox export <id> --output ./my-recovered-work
```

Exports the full workspace (tracked and untracked files) to `./my-recovered-work`
and writes SHA-256 hashes to the sidecar `./my-recovered-work.manifest.json`.
The hashes describe the exported local files. Finish active tasks before exporting
if you need a consistent workspace across files.
A workspace file named `manifest.json` is preserved and included in those hashes.
The command refuses to overwrite an existing output directory or sidecar. Its
JSON output includes `exported`, `manifest` (the sidecar path), and `files`.

If provisioning fails, the launcher saves a redacted `failed` state and prints
the destroy command. It keeps any created sandbox available for inspection until
you destroy it or its timeout expires.

## Clean up

```bash
paseo-sandbox destroy <id>
```

Deletes the sandbox and all snapshots recorded for the session, then verifies
nothing owned remains. Sandbox snapshots are billed storage, so destroy when
you are done.

## Verification and limitations

The September 16 checks exercised Codex, Claude Code, OpenCode, and Pi
through Paseo 0.8.0 and AI Gateway on `vercel/sandbox/universal:latest`.
Each agent fixed a seeded addition bug, passed the unchanged test, and
answered a browser-originated follow-up by rerunning the test. Earlier
five-provider checks also exercised stop/resume, conversation recall, and
workspace export. These are bounded fixture checks, not proof that every
repository, model, or client feature works.

The default launcher uses `vercel/sandbox/node:24`. Pass
`--image vercel/sandbox/universal:latest` to select the universal image.
Provisioning installs the package's pinned CLIs even when an image already
contains agent binaries. The universal-image inventory test separately
verified its four preinstalled agents without replacing them.

## Limitations

- Desktop and mobile clients require separate device tests.
- Agent conversations on one sandbox share the filesystem, user, and
  credentials. Separate folders are not separate security boundaries.
  Create separate sandbox sessions for untrusted projects.
- The launcher runs tasks in permissive agent modes. Use the sample fixture
  first and review the agent's permission mode before opening other code.
- Stop during an active turn terminates the process. Files and conversation
  history survive through snapshots; the in-flight turn does not continue.
- Sessions time out after 30 minutes by default. This launcher does not
  automatically extend the timeout. Resume restores the filesystem and
  restarts the daemon; it does not make an interrupted task finish itself.
- Snapshot retention is capped at the three most recent snapshots, with
  24-hour expiration. Export work before the last usable snapshot expires.
- Local session records contain the pairing link and are required to manage
  the sandbox. Preserve them in `~/.paseo-vercel-sandbox`, or the directory
  selected by `PASEO_SANDBOX_STATE_DIR`, and keep them private.
- AI Gateway credentials are available to the trusted agent processes inside
  the sandbox. Relay encryption protects transport, not access between
  agents sharing that sandbox.

## How it works

1. `provision` creates a persistent sandbox with the selected image and
   ownership tags. Without `--image`, the launcher selects `vercel/sandbox/node:24`.
2. A bootstrap script installs pinned CLIs and writes merge-safe Gateway
   configuration for all five agents.
3. `paseo daemon pair --relay --json` inside the sandbox produces the offer
   link. The launcher extracts and validates the daemon identity before
   returning the link.
4. Your client talks to the daemon end-to-end encrypted through the relay.
5. `stop` snapshots the filesystem; `resume` boots from the latest snapshot,
   refreshes file-backed credentials, and restarts the daemon.
6. `destroy` deletes the sandbox and its snapshots and verifies removal.

## Development

Run these commands from the repository root:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:package
```

Live end-to-end verification (creates real billable resources, cleans them up
on success and on failure):

```bash
paseo_test_root="$(mktemp -d)"
export PASEO_SANDBOX_STATE_DIR="$paseo_test_root/state"
export PASEO_TEST_RECEIPTS_DIR="$paseo_test_root/receipts"
npm run build
npm run test:live
```

The runner uses an isolated local client configuration and retains redacted
receipts. Private session state stays in `PASEO_SANDBOX_STATE_DIR`; keep it
private because it contains pairing links. Cleanup removes the remote Sandbox
and snapshots, not these local records.
