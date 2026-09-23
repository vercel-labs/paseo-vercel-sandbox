import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdir, copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
// Paseo 0.8 rewrites CommonJS interop helpers; prebundling preserves SDK initialization order.
const output = join(root, "server/generated/sdk.js");
await build({
  stdin: { contents: 'export { Sandbox, Snapshot } from "@vercel/sandbox";', resolveDir: root },
  bundle: true, platform: "node", format: "esm", target: "node24", minify: true,
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(process.cwd() + "/package.json");' },
  outfile: output, logLevel: "silent",
});
// Paseo resolves type imports at install time, so the declarations must not reference @vercel/sandbox either.
const entry = join(root, "server/generated/sdk-entry.d.ts");
const types = join(root, "server/generated/sdk.d.ts");
await writeFile(entry, 'export { Sandbox, Snapshot } from "@vercel/sandbox";\n');
try {
  execFileSync(join(root, "node_modules/.bin/dts-bundle-generator"), [
    "--no-check", "--export-referenced-types", "--no-banner",
    "--external-inlines", "@vercel/sandbox", "--external-inlines", "@workflow/serde", "--external-inlines", "async-retry",
    "-o", types, entry,
  ], { cwd: root, stdio: "pipe" });
} finally { await rm(entry, { force: true }); }
const flat = (await readFile(types, "utf8")).replace(/from '(fs|stream)'/g, "from 'node:$1'");
await writeFile(types, flat);
await mkdir(join(root, "dist/server/generated"), { recursive: true });
await copyFile(output, join(root, "dist/server/generated/sdk.js"));
await copyFile(types, join(root, "dist/server/generated/sdk.d.ts"));
