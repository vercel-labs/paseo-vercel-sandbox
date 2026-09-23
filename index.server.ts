import type { PluginServerContext } from "@getpaseo/plugin/server";
import { register } from "./server/register.js";
import { PluginService } from "./server/service.js";

export default function contribute(server: PluginServerContext) {
  return register(server, new PluginService());
}
