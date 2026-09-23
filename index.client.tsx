import type { PluginClientContext } from "@getpaseo/plugin/client";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { HostsScreen } from "./client/hosts.js";
import { CredentialsScreen } from "./client/settings.js";

export default function contribute(client: PluginClientContext) {
  const HostsScreenWithSettings = (props: PluginSurfaceProps) => (
    <HostsScreen {...props} openSettings={client.openSettings} />
  );
  const removeSurface = client.addSurface("hosts", HostsScreenWithSettings);
  const removeSidebar = client.addSidebarItem({
    id: "vercel-sandbox",
    title: "Vercel Sandboxes",
    icon: "Boxes",
    surface: "hosts",
  });
  const removeSettings = client.addSettingsScreen({
    id: "credentials",
    title: "Vercel Sandbox",
    icon: "CloudCog",
    Component: CredentialsScreen,
  });

  return () => {
    removeSettings();
    removeSidebar();
    removeSurface();
  };
}
