import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "paseo-plugin.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

assert.equal(manifest.id, "vercel-sandbox");
assert.equal(manifest.requirements.paseo, ">=0.8.0");
// Install must be a plain clone: the Paseo CLI gives up after 60 s, and a cold npm ci exceeds that.
assert.equal(manifest.build, undefined);
assert.equal(pkg.dependencies["@vercel/sandbox"], "3.3.0");
assert.equal(pkg.devDependencies["@getpaseo/plugin"], "0.8.0");
assert.equal(pkg.devDependencies.react, "19.1.0");
for (const forbidden of ["next", "@vercel/blob", "@vercel/oidc"]) {
  assert.equal(pkg.dependencies[forbidden], undefined);
  assert.equal(pkg.devDependencies[forbidden], undefined);
}
for (const required of [
  "index.client.tsx", "index.server.ts", "client/hosts.tsx", "client/settings.tsx",
  "shared/agents.ts", "shared/rpc.ts", "server/service.ts", "server/runtime.ts",
  "server/generated/sdk.js", "server/generated/sdk.d.ts", "package-lock.json",
]) assert.ok(statSync(join(root, required)).isFile(), `missing ${required}`);

// Runtime source may import only what Paseo supplies, Node builtins, local files, or the prebundled SDK.
const allowed = new Set(["@getpaseo/plugin", "@getpaseo/plugin/server", "@getpaseo/plugin/client", "@getpaseo/plugin/client/ui", "@getpaseo/plugin/client/react-native", "zod", "react", "react/jsx-runtime", "react-native"]);
function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== "generated") yield* sources(path); }
    else if (/\.(ts|tsx)$/.test(entry.name)) yield path;
  }
}
const files = ["index.client.tsx", "index.server.ts"].map(f => join(root, f));
for (const dir of ["client", "server", "shared"]) files.push(...sources(join(root, dir)));
for (const file of files) {
  for (const match of readFileSync(file, "utf8").matchAll(/import\s+(type\s+)?[^;]*?from\s+"([^"]+)"/g)) {
    const spec = match[2];
    assert.notEqual(spec, "@vercel/sandbox", `${relative(root, file)} imports @vercel/sandbox; Paseo resolves type imports at install time, use ./sdk.js`);
    if (match[1]) continue; // other type-only imports are erased before Paseo resolves anything
    if (spec.startsWith(".") || spec.startsWith("node:")) continue;
    assert.ok(allowed.has(spec), `${relative(root, file)} imports ${spec}, which Paseo does not provide at runtime`);
  }
}

for (const match of readFileSync(join(root, "server/generated/sdk.d.ts"), "utf8").matchAll(/from '([^.'][^']*)'/g)) {
  assert.ok(match[1].startsWith("node:") || match[1] === "zod", `generated sdk.d.ts imports ${match[1]}, which is not installed on the daemon host`);
}
// The committed prebundle must be exactly what the lockfile produces, so a reviewer can rebuild it.
const digest = (dir) => ["sdk.js", "sdk.d.ts"].map(f => createHash("sha256").update(readFileSync(join(dir, "server/generated", f))).digest("hex")).join("+");
const committed = digest(root);
const temporary = mkdtempSync(join(tmpdir(), "paseo-vercel-sandbox-package-"));
const staged = join(temporary, "plugin");
cpSync(root, staged, { recursive: true, filter: (source) => !["node_modules", "dist"].some((name) => source === join(root, name) || source.startsWith(join(root, name) + "/")) });
const cache = process.env.PASEO_PLUGIN_NPM_CACHE ?? join(temporary, "npm-cache");
const npmEnv = { ...process.env, npm_config_cache: cache, npm_config_fetch_retries: "2", npm_config_fetch_timeout: "30000", npm_config_userconfig: "/dev/null", npm_config_registry: "https://registry.npmjs.org", NPM_CONFIG_REGISTRY: "https://registry.npmjs.org" };
execFileSync("npm", ["ci"], { cwd: staged, stdio: "pipe", env: npmEnv });
execFileSync("node", ["scripts/build-sdk.mjs"], { cwd: staged, stdio: "pipe", env: npmEnv });
assert.equal(digest(staged), committed, "committed server/generated/sdk.js or sdk.d.ts differs from a fresh build; run npm run build and commit both");
rmSync(temporary, { recursive: true, force: true });
console.log(`PASS clean package: no build step, runtime imports bounded, SDK prebundle reproducible (${committed.slice(0, 12)})`);
