"use client";

import { useCallback, useEffect, useState } from "react";

const AGENTS = [
  { id: "codex", name: "Codex", mark: "CX", detail: "OpenAI coding agent" },
  { id: "claude", name: "Claude Code", mark: "CL", detail: "Anthropic coding agent" },
  { id: "opencode", name: "OpenCode", mark: "OC", detail: "Open source coding agent" },
  { id: "pi", name: "Pi", mark: "PI", detail: "Minimal coding agent" },
] as const;
type Agent = (typeof AGENTS)[number]["id"];
type Slot = { agent: Agent; phase: string; operation?: { action: string; status: string; leaseUntil: string; publicError?: string } };

export default function Launcher() {
  const [hydrated, setHydrated] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Agent>("codex");
  const [authenticated, setAuthenticated] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [pairing, setPairing] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/status", { cache: "no-store" });
    const body = await response.json();
    setAuthenticated(response.ok && body.authenticated);
    setMissing(body.setup?.missing ?? body.missing ?? []);
    if (response.ok) setSlots(body.slots);
  }, []);

  useEffect(() => { setHydrated(true); void refresh(); }, [refresh]);
  useEffect(() => {
    if (!slots.some(slot => slot.operation && slot.operation.status !== "complete" && Date.parse(slot.operation.leaseUntil) > Date.now())) return;
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, [slots, refresh]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setMessage(""); setSigningIn(true);
    try {
    const response = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
    if (!response.ok) { setMessage(response.status === 503 ? "Finish setup before signing in." : "That owner key did not match."); return; }
    setKey(""); await refresh();
    } catch { setMessage("Could not reach the launcher. Try again."); }
    finally { setSigningIn(false); }
  }

  async function act(action: "start" | "stop" | "resume" | "delete") {
    if (action === "delete" && !confirm("Delete this sandbox and its retained snapshots? Its files and Paseo history will be removed.")) return;
    if (action === "stop" && !confirm("Stop after the current agent turn finishes. Continue?")) return;
    setMessage("");
    const response = await fetch("/api/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agent: selected, action }) });
    const body = await response.json();
    setMessage(response.ok ? `${action} accepted. You can close this page; refresh later to check progress.` : body.error === "operation_in_progress" ? "An operation is already running for this agent." : "The operation could not be accepted.");
    await refresh();
  }

  async function revealPairing() {
    const response = await fetch(`/api/pairing?agent=${selected}`, { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setPairing(body.pairingUrl); else setMessage("Pairing is available when this host is ready.");
  }

  const slot = slots.find(item => item.agent === selected);
  const agent = AGENTS.find(item => item.id === selected)!;
  const unfinished = Boolean(slot?.operation && slot.operation.status !== "complete");
  const leaseSafe = !slot?.operation || Date.parse(slot.operation.leaseUntil) <= Date.now();
  const locked = unfinished && !leaseSafe;
  const failed = slot?.operation?.status === "failed";
  const running = locked && !failed;
  const retry = unfinished && leaseSafe;

  if (!authenticated) return <main className="shell">
    <header><div className="brand"><span className="brandMark">P</span>Paseo</div><span className="privateTag">Private launcher</span></header>
    <section className="hero authHero">
      <div><p className="eyebrow">Your Vercel account. Your coding agents.</p><h1>Run your coding agents in Vercel Sandbox.</h1><p className="lede">This single-owner launcher keeps four persistent Paseo hosts in your own Vercel project.</p></div>
      <form className="signin" onSubmit={signIn}><label htmlFor="owner-key">Owner key</label><input disabled={!hydrated || signingIn} id="owner-key" type="password" autoComplete="current-password" value={key} onChange={event => setKey(event.target.value)} /><button disabled={!hydrated || signingIn}>{signingIn ? "Signing in…" : "Sign in"}</button>{message && <p className="error">{message}</p>}</form>
    </section>
    {missing.length > 0 && <section className="setup"><h2>Setup needed</h2><p>Complete these settings, then redeploy:</p><ul>{missing.map(item => <li key={item}>{item === "BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN" ? "Connect a private Blob store in the project Storage tab." : <code>{item}</code>}</li>)}</ul></section>}
  </main>;

  return <main className="shell">
    <header><div className="brand"><span className="brandMark">P</span>Paseo</div><button className="textButton" onClick={() => fetch("/api/auth", { method: "DELETE" }).then(() => location.reload())}>Sign out</button></header>
    <section className="hero"><div><p className="eyebrow">Remote workspace</p><h1>Choose your agent.</h1><p className="lede">Each choice has one private host. Start it here, then pair it with Paseo.</p></div><button className="refresh" onClick={refresh}>Refresh state</button></section>
    <section className="agents" aria-label="Agent choices">{AGENTS.map(item => {
      const itemSlot = slots.find(value => value.agent === item.id);
      return <button key={item.id} className={`agentCard ${selected === item.id ? "selected" : ""}`} onClick={() => { setSelected(item.id); setPairing(""); }}>
        <span className="agentMark">{item.mark}</span><span><strong>{item.name}</strong><small>{item.detail}</small></span><span className={`status ${itemSlot?.phase ?? "empty"}`}>{itemSlot?.phase ?? "empty"}</span>
      </button>;
    })}</section>
    <section className="session">
      <div className="sessionHead"><div><p className="eyebrow">Selected host</p><h2>{agent.name}</h2></div><span className="phase">{failed ? `${slot?.operation?.action} failed` : running ? `${slot?.operation?.action} in progress` : slot?.phase ?? "empty"}</span></div>
      {failed && <p className="error" role="alert">The last operation failed. Your existing host has been kept. {slot?.operation?.publicError === "operation_expired" ? "It exceeded the execution deadline." : "Check the project configuration before retrying."}</p>}
      {unfinished && <div className="notice">{leaseSafe ? "The last operation can be retried safely now." : `Remote work may still be finishing. Retry and Delete unlock automatically at ${new Date(slot!.operation!.leaseUntil).toLocaleTimeString()}.`}</div>}
      <div className="actions">
        {retry && <button onClick={() => act(slot!.operation!.action as "start" | "stop" | "resume" | "delete")}>Retry {slot!.operation!.action}</button>}
        {!unfinished && (!slot || slot.phase === "empty") && <button onClick={() => act("start")}>Start host</button>}
        {(slot?.phase === "ready" || slot?.phase === "failed") && <button onClick={revealPairing}>Show pairing</button>}
        {!unfinished && slot?.phase === "ready" && <><button className="secondary" onClick={() => act("stop")}>Stop</button></>}
        {!unfinished && slot?.phase === "stopped" && <button onClick={() => act("resume")}>Resume</button>}
        {slot && slot.phase !== "empty" && <button className="danger" disabled={locked} onClick={() => act("delete")}>Delete</button>}
      </div>
      {message && <p className="message">{message}</p>}
      {pairing && <div className="pairing"><h3>Pair {agent.name}</h3><ol><li>Open Paseo and choose <strong>Paste pairing link</strong>. For an existing setup, use <strong>Hosts → Add host</strong>.</li><li>Paste the link and select <strong>Pair</strong>. Return to the workspace screen.</li><li>Choose <strong>Add project → Search for directory</strong>, enter <code>/vercel/workspace/repo</code>, and select it.</li><li>Choose <strong>Select model → {selected === "claude" ? "Claude" : agent.name}</strong>{selected === "codex" ? ", then Gateway" : " and a model"}. Enter a task and select <strong>Create</strong>.</li></ol><div className="copyRow"><input readOnly value={pairing} aria-label="Private pairing link" /><button onClick={() => navigator.clipboard.writeText(pairing)}>Copy</button></div><p className="fine">Treat this link as private. A readiness check confirms the agent configuration; it does not run an agent turn.</p></div>}
      <div className="facts"><span>30 minute sandbox timeout</span><span>Stopped snapshots expire after 24 hours</span><span>Up to 3 snapshots retained</span></div>
    </section>
  </main>;
}
