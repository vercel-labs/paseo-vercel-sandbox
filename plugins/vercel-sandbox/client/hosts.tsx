import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { copyText } from "@getpaseo/plugin/client/react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AGENT_DETAILS, AGENT_IDS, type AgentId } from "../shared/agents.js";
import { actRpc, revealPairingRpc, statusRpc, type PublicSlot, type StatusOutput } from "../shared/rpc.js";

type ActionName = "start" | "stop" | "resume" | "delete" | "diagnose";

const ACTION_LABELS: Record<ActionName, string> = {
  start: "Create",
  stop: "Stop",
  resume: "Resume",
  delete: "Delete",
  diagnose: "Run diagnostic",
};

interface HostsScreenProps extends PluginSurfaceProps {
  openSettings: (id: string) => void;
}

export function HostsScreen({ theme, layout, openSettings }: HostsScreenProps) {
  const getStatus = useRpc(statusRpc);
  const act = useRpc(actRpc);
  const revealPairing = useRpc(revealPairingRpc);
  const [status, setStatus] = useState<StatusOutput | null>(null);
  const [selected, setSelected] = useState<AgentId>("codex");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pairingUrl, setPairingUrl] = useState<string>();
  const [deleteText, setDeleteText] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (remote = false) => {
    try {
      setStatus(await getStatus({ refresh: remote }));
      setError(undefined);
    } catch {
      setError("Status unavailable. Check the daemon and plugin logs.");
    }
  }, [getStatus]);

  useEffect(() => {
    void refresh(true);
    const timer = setInterval(() => void refresh(false), 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  const slot = useMemo(
    () => status?.slots.find((item) => item.agent === selected),
    [status, selected],
  );
  const operationRunning = slot?.operation?.status === "running";
  const operationFailed = slot?.operation?.status === "failed";
  const failedOperation = operationFailed ? slot?.operation : undefined;
  const retryAction = failedOperation?.action;

  useEffect(() => {
    setPairingUrl(undefined);
    setDeleteOpen(false);
    setDeleteText("");
  }, [selected, slot?.phase, slot?.operation?.id]);

  async function runAction(action: ActionName) {
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await act({ agent: selected, action, confirm: action === "delete" ? deleteText : undefined });
      setMessage(action === "delete" ? "Delete requested. The host and verified snapshots will be removed." : `${ACTION_LABELS[action]} started.`);
      setDeleteOpen(false);
      setDeleteText("");
      setPairingUrl(undefined);
      await refresh(true);
    } catch {
      setError("The request was not accepted. Check the current operation and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    setBusy(true);
    setError(undefined);
    try {
      const result = await revealPairing({ agent: selected });
      setPairingUrl(result.url);
      setMessage("Pairing link revealed. Copy it now and paste it into Paseo.");
    } catch {
      setError("Pairing is unavailable until the host is ready.");
    } finally {
      setBusy(false);
    }
  }

  const styles = useMemo(() => ({
    screen: { flexGrow: 1, padding: layout.compact ? 16 : 24, backgroundColor: theme.colors.surface0, gap: 16 },
    title: { fontSize: 22, fontWeight: "700", color: theme.colors.foreground },
    subtitle: { color: theme.colors.foregroundMuted },
    agentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    agentButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
    card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
    action: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
    actionText: { fontWeight: "600" },
    label: { color: theme.colors.foregroundMuted },
    value: { color: theme.colors.foreground, fontWeight: "600" },
    pairing: { color: theme.colors.foreground, fontFamily: "monospace" },
    danger: { color: theme.colors.foreground },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, color: theme.colors.foreground },
  }) as const, [theme, layout.compact]);

  function buttonStyle(enabled = true, active = false) {
    return {
      ...styles.action,
      borderColor: theme.colors.border,
      backgroundColor: active ? theme.colors.accent : theme.colors.surface1,
      opacity: enabled ? 1 : 0.45,
    };
  }

  function actionTextStyle(enabled = true) {
    return { ...styles.actionText, color: theme.colors.foreground, opacity: enabled ? 1 : 0.7 };
  }

  function phaseText(item: PublicSlot | undefined): string {
    if (!item) return "Unavailable";
    if (item.operation?.status === "running") return `${ACTION_LABELS[item.operation.action] ?? item.operation.action}: running`;
    if (item.phase === "empty") return "Not created";
    return item.phase;
  }

  const createEnabled = !busy && Boolean(status?.credentials.configured) && !operationRunning && !retryAction &&
    (!slot?.phase || slot.phase === "empty" || slot.phase === "failed" || slot.phase === "destroyed");
  const stopEnabled = !busy && !operationRunning && !retryAction && slot?.phase === "ready";
  const resumeEnabled = !busy && !operationRunning && !retryAction && slot?.phase === "stopped";
  const diagnosticEnabled = !busy && !operationRunning && !retryAction && slot?.phase === "ready";
  const revealEnabled = !busy && !operationRunning && slot?.phase === "ready";
  const deleteEnabled = !busy && !operationRunning && Boolean(slot?.phase && slot.phase !== "empty");

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View>
        <Text style={styles.title}>Vercel Sandboxes</Text>
        <Text style={styles.subtitle}>Cloud agent hosts managed by this daemon</Text>
      </View>
      {!status?.credentials.configured && (
        <View style={styles.row}>
          <Text style={styles.subtitle}>Configure credentials before creating a host.</Text>
          <Pressable accessibilityRole="button" onPress={() => openSettings("credentials")} style={buttonStyle()}>
            <Text style={styles.actionText}>Open settings</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.agentRow} accessibilityLabel="Agent slots">
        {AGENT_IDS.map((agent) => (
          <Pressable
            key={agent}
            accessibilityRole="button"
            onPress={() => setSelected(agent)}
            style={{ ...styles.agentButton, borderColor: selected === agent ? theme.colors.accent : theme.colors.border, backgroundColor: selected === agent ? theme.colors.surface1 : theme.colors.surface0 }}
          >
            <Text style={{ color: theme.colors.foreground, fontWeight: selected === agent ? "700" : "400" }}>
              {AGENT_DETAILS[agent].title}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ ...styles.card, borderColor: theme.colors.border, backgroundColor: theme.colors.surface1 }}>
        <Text style={styles.title}>{AGENT_DETAILS[selected].title}</Text>
        <Text style={styles.subtitle}>{AGENT_DETAILS[selected].detail}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Status: </Text>
          <Text style={styles.value}>{phaseText(slot)}</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void refresh(true)} style={buttonStyle(!busy)}>
            <Text style={actionTextStyle(!busy)}>Refresh</Text>
          </Pressable>
        </View>
        {slot?.sandboxStatus && (
          <View style={styles.row}><Text style={styles.label}>Sandbox: </Text><Text style={styles.value}>{slot.sandboxStatus}</Text></View>
        )}
        {slot?.expiresAt && (
          <View style={styles.row}><Text style={styles.label}>Session ends: </Text><Text style={styles.value}>{new Date(slot.expiresAt).toLocaleString()}</Text></View>
        )}
        {slot?.statusError && (
          <Text style={styles.danger}>
            {slot.statusError === "existing_host_missing" ? "The remote host is missing; use Delete after reviewing snapshots." : "Remote status is unavailable. The local host record is retained."}
          </Text>
        )}
        <Text style={styles.subtitle}>Running sessions time out after 30 minutes. Snapshots are kept for 24 hours, with the 3 most recent retained.</Text>
        {retryAction && (
          <Text style={styles.danger}>
            Last operation failed{failedOperation?.publicError === "operation_ambiguous" ? " with an uncertain remote result" : ""}. Retry reconciles the same host.
          </Text>
        )}
        {slot?.diagnostic && (
          <View style={styles.row}>
            <Text style={styles.label}>Diagnostic: </Text>
            <Text style={slot.diagnostic.ok ? styles.value : styles.danger}>
              {slot.diagnostic.ok ? `Ready (${slot.diagnostic.modelCount ?? 0} models)` : "Needs attention"}
            </Text>
          </View>
        )}
        <View style={styles.row}>
          {retryAction ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => retryAction === "delete" ? setDeleteOpen(true) : void runAction(retryAction)} style={buttonStyle(!busy, true)}>
              <Text style={actionTextStyle(!busy)}>Retry {ACTION_LABELS[retryAction].toLowerCase()}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable accessibilityRole="button" disabled={!createEnabled} onPress={() => void runAction("start")} style={buttonStyle(createEnabled)}>
                <Text style={actionTextStyle(createEnabled)}>Create</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!stopEnabled} onPress={() => void runAction("stop")} style={buttonStyle(stopEnabled)}>
                <Text style={actionTextStyle(stopEnabled)}>Stop</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!resumeEnabled} onPress={() => void runAction("resume")} style={buttonStyle(resumeEnabled)}>
                <Text style={actionTextStyle(resumeEnabled)}>Resume</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!diagnosticEnabled} onPress={() => void runAction("diagnose")} style={buttonStyle(diagnosticEnabled)}>
                <Text style={actionTextStyle(diagnosticEnabled)}>Diagnostic</Text>
              </Pressable>
            </>
          )}
        </View>
        {slot?.phase === "ready" && (
          <View style={{ gap: 8 }}>
            <Pressable accessibilityRole="button" disabled={!revealEnabled} onPress={() => void reveal()} style={buttonStyle(revealEnabled, true)}>
              <Text style={actionTextStyle(revealEnabled)}>Reveal pairing link</Text>
            </Pressable>
            {pairingUrl && (
              <View style={{ gap: 8 }}>
                <Text style={styles.pairing} selectable>{pairingUrl}</Text>
                <Pressable accessibilityRole="button" onPress={() => void copyText(pairingUrl).catch(() => setError("Copying is unavailable on this client."))} style={buttonStyle()}>
                  <Text style={styles.actionText}>Copy pairing link</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        {deleteEnabled && (
          <View style={{ gap: 8 }}>
            {!deleteOpen && (
              <Pressable accessibilityRole="button" disabled={!deleteEnabled} onPress={() => setDeleteOpen(true)} style={buttonStyle(deleteEnabled)}>
                <Text style={actionTextStyle(deleteEnabled)}>Delete…</Text>
              </Pressable>
            )}
            {deleteOpen && (
              <View style={{ gap: 8 }}>
                <Text style={styles.danger}>Type {selected} to permanently delete this host and its verified snapshots.</Text>
                <TextInput value={deleteText} onChangeText={setDeleteText} accessibilityLabel="Delete confirmation" autoCapitalize="none" autoComplete="off" style={styles.input} placeholder={selected} placeholderTextColor={theme.colors.foregroundMuted} />
                <View style={styles.row}>
                  <Pressable accessibilityRole="button" disabled={busy || deleteText !== selected} onPress={() => void runAction("delete")} style={buttonStyle(!(busy || deleteText !== selected), true)}>
                    <Text style={actionTextStyle(!(busy || deleteText !== selected))}>Delete permanently</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setDeleteOpen(false); setDeleteText(""); }} style={buttonStyle(!busy)}>
                    <Text style={actionTextStyle(!busy)}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
      {message && <Text style={styles.value}>{message}</Text>}
      {error && <Text style={styles.danger}>{error}</Text>}
    </ScrollView>
  );
}
