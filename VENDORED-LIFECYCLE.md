# Vendored lifecycle provenance

The bounded lifecycle and provider bootstrap implementation in `server/lifecycle.ts`, `server/bootstrap.ts`, `server/pairing.ts`, and `server/providers.ts` was adapted from this repository at commit `e05d07040728430dda568697401045c869a4a83a`:

- `src/lifecycle.ts`
- `src/bootstrap.ts`
- `src/pairing.ts`
- `src/providers.ts`

The plugin copy removes launcher-only process-global credential reads and passes credentials explicitly. The original CLI and web launcher remain untouched.
