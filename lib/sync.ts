// Cross-device cloud sync. The browser never holds a Supabase credential —
// it only talks to our own /api/sync route (see app/api/sync/route.ts), which
// holds the secret service key server-side. Devices are linked purely by a
// random "sync code" kept in localStorage; there is no login, so this code is
// what stands in for a password — treat it like one (don't post it publicly).

const CODE_KEY = "calorie-tracker:sync-code";
// No 0/O/1/I, to avoid transcription mistakes when copying between devices.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function getSyncCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CODE_KEY);
}

export function setSyncCode(code: string): void {
  window.localStorage.setItem(CODE_KEY, code);
}

export function clearSyncCode(): void {
  window.localStorage.removeItem(CODE_KEY);
}

export function generateSyncCode(): string {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

export interface CloudSnapshot {
  data: unknown;
  updatedAt: number;
}

export async function pullSnapshot(code: string): Promise<CloudSnapshot | null> {
  const res = await fetch(`/api/sync?code=${encodeURIComponent(code)}`, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Sync pull failed (${res.status})`);
  return body.found ? { data: body.data, updatedAt: body.updatedAt } : null;
}

export async function pushSnapshot(code: string, data: unknown, updatedAt: number): Promise<void> {
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, data, updatedAt }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Sync push failed (${res.status})`);
  }
}
