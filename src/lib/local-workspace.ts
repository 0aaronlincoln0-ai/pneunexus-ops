import type { BootstrapData } from "../types";

const localWorkspaceKey = "resovii-local-workspace-v1";
const legacyLocalWorkspaceKey = "pneunexus-local-workspace-v1";

export function loadLocalWorkspace(): BootstrapData | null {
  try {
    const saved =
      localStorage.getItem(localWorkspaceKey) ?? localStorage.getItem(legacyLocalWorkspaceKey);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as BootstrapData;
    return Array.isArray(parsed.devices) && Array.isArray(parsed.facilities) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLocalWorkspace(data: BootstrapData) {
  localStorage.setItem(localWorkspaceKey, JSON.stringify(data));
}
