import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import YAML from "yaml";

const defaultConfigPath = join(homedir(), ".agentctl", "config.yaml");

export async function loadAgentctlConfig(path = defaultConfigPath) {
  try {
    const raw = await readFile(path, "utf8");
    return YAML.parse(raw) ?? {};
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function saveAgentctlConfig(config, path = defaultConfigPath) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, YAML.stringify(config), "utf8");
}

export function getDefaultAgentctlConfigPath() {
  return defaultConfigPath;
}
