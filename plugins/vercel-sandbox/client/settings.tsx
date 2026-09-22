import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { SettingsAction, SettingsCard, SettingsInput, SettingsRow, SettingsSection, SettingsSwitch, type SettingsInputHandle } from "@getpaseo/plugin/client/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import { removeCredentialsRpc, saveCredentialsRpc, statusRpc } from "../shared/rpc.js";

export function CredentialsScreen({ theme }: PluginSurfaceProps) {
  const getStatus = useRpc(statusRpc);
  const saveCredentials = useRpc(saveCredentialsRpc);
  const removeCredentials = useRpc(removeCredentialsRpc);
  const vercelTokenRef = useRef<SettingsInputHandle | null>(null);
  const gatewayKeyRef = useRef<SettingsInputHandle | null>(null);
  const teamIdRef = useRef<SettingsInputHandle | null>(null);
  const projectIdRef = useRef<SettingsInputHandle | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [contextCount, setContextCount] = useState(0);
  const [teamId, setTeamId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState("");
  const sessionTimeoutRef = useRef<SettingsInputHandle | null>(null);
  const sessionTimeoutTouchedRef = useRef(false);
  const parsedTimeout = sessionTimeout.trim() === "" ? undefined : Number(sessionTimeout);
  const timeoutInvalid = parsedTimeout !== undefined && (!Number.isInteger(parsedTimeout) || parsedTimeout < 5 || parsedTimeout > 1440);
  const [vercelToken, setVercelToken] = useState("");
  const [gatewayKey, setGatewayKey] = useState("");
  const [replaceVercelToken, setReplaceVercelToken] = useState(false);
  const [replaceGatewayKey, setReplaceGatewayKey] = useState(false);
  const teamIdTouchedRef = useRef(false);
  const projectIdTouchedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const status = await getStatus({});
      setConfigured(status.credentials.configured);
      setContextCount(status.credentials.contextCount);
      if (!teamIdTouchedRef.current) {
        const savedTeamId = status.credentials.teamId ?? "";
        setTeamId(savedTeamId);
        teamIdRef.current?.replaceText(savedTeamId);
      }
      if (!sessionTimeoutTouchedRef.current && status.credentials.sessionTimeoutMinutes !== undefined) {
        const saved = String(status.credentials.sessionTimeoutMinutes);
        setSessionTimeout(saved);
        sessionTimeoutRef.current?.replaceText(saved);
      }
      if (!projectIdTouchedRef.current) {
        const savedProjectId = status.credentials.projectId ?? "";
        setProjectId(savedProjectId);
        projectIdRef.current?.replaceText(savedProjectId);
      }
      setError(undefined);
    } catch {
      setError("Settings status is unavailable.");
    }
  }, [getStatus]);

  useEffect(() => { void refresh(); }, [refresh]);

  function clearSecretInputs() {
    setVercelToken("");
    setGatewayKey("");
    vercelTokenRef.current?.replaceText("");
    gatewayKeyRef.current?.replaceText("");
    setReplaceVercelToken(false);
    setReplaceGatewayKey(false);
  }

  async function save() {
    setBusy(true);
    setError(undefined);
    setSaved(undefined);
    try {
      if (timeoutInvalid) {
        setError("Session timeout must be a whole number of minutes between 5 and 1440. The Hobby plan allows at most 45.");
        return;
      }
      if (configured && ((vercelToken.length > 0 && !replaceVercelToken) || (gatewayKey.length > 0 && !replaceGatewayKey))) {
        setError("Turn on the replacement switch for each newly entered secret.");
        return;
      }
      await saveCredentials({
        teamId,
        projectId,
        vercelToken: vercelToken || undefined,
        gatewayKey: gatewayKey || undefined,
        replaceVercelToken,
        replaceGatewayKey,
        sessionTimeoutMinutes: parsedTimeout,
      });
      setSaved("Credentials saved in backend-private storage.");
      clearSecretInputs();
      await refresh();
    } catch {
      setError("Credentials were not saved. Check required fields and replacement switches.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(undefined);
    setSaved(undefined);
    try {
      await removeCredentials({});
      setSaved("Credentials removed.");
      clearSecretInputs();
      setTeamId("");
      setProjectId("");
      teamIdTouchedRef.current = false;
      projectIdTouchedRef.current = false;
      sessionTimeoutTouchedRef.current = false;
      setSessionTimeout("");
      teamIdRef.current?.replaceText("");
      projectIdRef.current?.replaceText("");
      sessionTimeoutRef.current?.replaceText("");
      await refresh();
    } catch (error) {
      setError(String(error).includes("credential_references_remain")
        ? "Delete every host that references these credentials before removal."
        : "Credentials were not removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsSection title="Vercel Sandbox credentials">
      <SettingsCard>
        <SettingsRow label="Configuration" hint="Secrets stay in backend-private files, not shared Paseo settings.">
          <Text style={{ color: theme.colors.foreground }}>
            {configured === null ? "Loading…" : configured ? `Configured (${contextCount} retained context${contextCount === 1 ? "" : "s"})` : "Not configured"}
          </Text>
        </SettingsRow>
        <SettingsInput ref={teamIdRef} label="Vercel team ID" onChangeText={(text) => { teamIdTouchedRef.current = true; setTeamId(text); }} placeholder="team_..." />
        <SettingsInput ref={projectIdRef} label="Vercel project ID" onChangeText={(text) => { projectIdTouchedRef.current = true; setProjectId(text); }} placeholder="prj_..." />
        <SettingsInput ref={sessionTimeoutRef} label="Session timeout (minutes)" onChangeText={(text) => { sessionTimeoutTouchedRef.current = true; setSessionTimeout(text); }} placeholder="1440 (Hobby plan: 45 or less)" />
        <SettingsInput ref={vercelTokenRef} label="Vercel token" onChangeText={setVercelToken} placeholder={configured ? "Leave blank to keep" : "Required"} secureTextEntry />
        {configured && (
          <SettingsSwitch label="Replace stored Vercel token" value={replaceVercelToken} onValueChange={setReplaceVercelToken} />
        )}
        <SettingsInput ref={gatewayKeyRef} label="AI Gateway key" onChangeText={setGatewayKey} placeholder={configured ? "Leave blank to keep" : "Required"} secureTextEntry />
        {configured && (
          <SettingsSwitch label="Replace stored AI Gateway key" value={replaceGatewayKey} onValueChange={setReplaceGatewayKey} />
        )}
        <SettingsAction label="Credential storage" actionLabel={busy ? "Saving…" : "Save credentials"} onPress={() => void save()} disabled={busy || timeoutInvalid || !teamId || !projectId || (configured !== true && (!vercelToken || !gatewayKey))} />
        <SettingsAction label="Credential removal" hint="Available only after every host journal is empty." actionLabel={busy ? "Working…" : "Remove credentials"} onPress={() => void remove()} disabled={busy || !configured} />
      </SettingsCard>
      {saved && <Text style={{ color: theme.colors.foreground }}>{saved}</Text>}
      {error && <Text style={{ color: theme.colors.foreground }}>{error}</Text>}
    </SettingsSection>
  );
}
