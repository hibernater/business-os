/**
 * Desktop (Tauri) environment detection and bridge APIs.
 * In web mode, all functions gracefully fall back to no-ops.
 */

export function isDesktop(): boolean {
  return typeof window !== "undefined" && !!(window as Record<string, unknown>).__TAURI_INTERNALS__;
}

export async function readLocalFile(path: string): Promise<string | null> {
  if (!isDesktop()) return null;
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    return await readTextFile(path);
  } catch {
    return null;
  }
}

export async function pickFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
  if (!isDesktop()) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const result = await open({
      multiple: false,
      filters,
    });
    return typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}

export async function getPlatform(): Promise<string> {
  if (!isDesktop()) return "web";
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("get_platform");
  } catch {
    return "web";
  }
}
