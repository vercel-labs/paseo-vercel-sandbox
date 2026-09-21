# Paseo Vercel Sandbox plugin

This Paseo 0.8 plugin manages four persistent Vercel Sandbox agent hosts: Codex, Claude Code, OpenCode, and Pi. It uses Paseo's native surface, settings screen, and typed RPC. It does not require the repository's Next.js app, Vercel Blob, or a separate launcher.

## Install

Use Node.js 24 or newer and Paseo 0.8.x on both the controller daemon and client. In **Settings → Plugins**, turn on **Enable plugins**.

Install it from this repository:

```bash
paseo plugin add vercel-labs/paseo-vercel-sandbox:plugins/vercel-sandbox --ref plugin-vercel-sandbox
```

Paseo clones the repository and compiles the plugin itself. No dependency install or build step runs on the daemon host; the Vercel Sandbox SDK ships prebundled in `server/generated/sdk.js`.

## Configure

Open **Settings → Plugins → Vercel Sandbox**. On first setup, enter a Vercel token, team ID, project ID, and AI Gateway key; no replacement switches are needed.

Where to find them: create the token at https://vercel.com/account/settings/tokens. The team and project IDs are the `orgId` and `projectId` values in `.vercel/project.json` after running `vercel link` in any local folder for that project, and both also appear under each Settings → General page in the dashboard. Create the Gateway key in the AI Gateway section of your team dashboard. After credentials exist, enter a new secret only when you intend to rotate it and turn on that secret's replacement switch. Team and project IDs are restored when you revisit settings. Secret inputs clear after a successful save.

Secrets are stored in backend-private files under the daemon user's Paseo plugin state directory, not in Paseo's shared settings document. The plugin checks your Gateway key before creating a sandbox.

If a Create fails because the API refused it (for example an invalid project, a plan limit, or an exhausted Gateway budget), the row shows the failure and **Retry** runs the create again once you have fixed the cause. A create that timed out, hit a server error, lost its connection, or returned a conflict is kept as an unresolved allocation until the same host name can be looked up, because the sandbox may exist.

Existing hosts keep the credential context that created them. Replacing active credentials does not retag or transfer those hosts. There is no per-host credential replacement in this version. Keep the original token valid until its hosts are deleted. Rotating the active token does not repair a revoked token retained by an existing host; this version requires operator recovery for that situation. Credential removal is available only after every host journal is empty.

## First workspace

1. Open **Vercel Sandboxes** in the Paseo sidebar.
2. Choose **Create** for Codex, Claude Code, OpenCode, or Pi. The first Create installs the Paseo CLI and the agent CLI inside the new sandbox and takes a few minutes; later starts reuse the saved filesystem.
3. When the host is ready, choose **Reveal pairing link**, copy it, and paste it into Paseo's existing host pairing flow. Pairing is manual and happens once for that host.
4. In Paseo, use **Hosts → Add host** and paste the pairing link.
5. Create a workspace with the cloud host, set the repository directory to `/vercel/workspace/repo`, and choose the agent plus its Gateway model: Codex Gateway, Claude Sonnet 5, OpenCode Vercel AI Gateway, or Pi `vercel-ai-gateway`.

The controller daemon must be online for create, stop, resume, diagnose, and delete operations. A running cloud agent connection does not require the controller to remain online for ordinary agent work.

## Host lifecycle

Stop saves the persistent filesystem through a Sandbox snapshot. Resume restores the same named Sandbox, records the new session ID immediately, and verifies the same daemon identity. Delete requires typing the agent ID and removes the owned Sandbox and verified snapshots.

Running sessions time out after 30 minutes. The status screen shows the remote session end time, refreshes remote state on a throttled basis, and offers an explicit refresh. If a running session times out, the host changes to stopped and **Resume** becomes available; the plugin never automatically resumes it. Snapshots expire after 24 hours, and the 3 most recent snapshots are retained.

Snapshot recovery restores files and workspace history. It does not resume an active process or continue an interrupted turn.

The host uses the Vercel universal Sandbox image and a compatibility bootstrap that installs the pinned Paseo and agent CLIs. The managed image alone is not treated as a source of exact agent pins.

## State and recovery

Journals and credentials are private local files with restrictive permissions and compare-and-swap writes. Each slot has a runner lock spanning admission and worker lifetime, separate from journal locking. A disposed or replaced worker is cancelled and fenced before additional remote effects. Reload recovery marks interrupted operations failed and leaves an explicit retry action; it does not wait out a long lease.

A create operation allocates one stable random Sandbox name before remote work. If the create response is lost, the plugin retains the full host record and its credentials. Retry checks the same name. Delete also retains that record while the allocation remains uncertain; when the host can be found and verified, retrying Delete removes it. An absent lookup alone does not prove a timed-out create allocated nothing.

Provider diagnostics expose only structured readiness, provider match, exit status, and model count. Raw CLI stdout and stderr never enter public status, journals, or logs.

The existing standalone CLI and web launcher remain untouched. Remote publication is deferred. Offline package checks do not claim live browser, native, or cloud behavior.

## Development checks

From this plugin directory, run `npm ci`, `npm run typecheck`, `npm test`, and `npm run test:package`. The package check verifies that a clean copy of the committed files needs no install or build step and that the committed SDK prebundle is reproducible from the lockfile.

`npm run test:e2e` (run `npm run build` first; it imports the compiled SDK) installs a clean Git copy into an isolated Paseo 0.8 daemon, drives the browser UI for all four agents, verifies files and follow-ups after restart, then deletes its hosts and snapshots. It uses billable cloud resources. Set these environment variables in your local shell without committing their values:

- `PASEO_E2E_RUN=1`
- `PASEO_E2E_CLI`: absolute path to `@getpaseo/cli/dist/index.js` from version 0.8.0
- `PASEO_E2E_PLAYWRIGHT`: absolute path to an installed Playwright module with Chromium available
- `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, and `AI_GATEWAY_API_KEY`
- Optional `PASEO_E2E_REPORT`: destination for the redacted JSON report

The test reports its private recovery directory if a failure needs inspection. Keep that directory private: it contains test credentials and pairing state. Mobile and desktop clients require separate verification.
