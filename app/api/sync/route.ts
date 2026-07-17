import { NextResponse } from "next/server";

// Sole bridge to Supabase. The browser only ever calls this route; the
// service-role key lives in server env vars and is never sent to the client.
// Supabase RLS on the `snapshots` table is left with zero policies, so only
// this server (via the service role, which bypasses RLS) can read or write it
// — there is no per-user auth, the sync code is what stands in for one.

export const runtime = "nodejs";

const CODE_PATTERN = /^[A-Za-z0-9-]{6,64}$/;

function supabaseHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

function envOrNull() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export async function GET(req: Request) {
  const env = envOrNull();
  if (!env) return NextResponse.json({ error: "Sync isn't configured on the server yet." }, { status: 501 });

  const code = new URL(req.url).searchParams.get("code") || "";
  if (!CODE_PATTERN.test(code)) return NextResponse.json({ error: "Invalid sync code." }, { status: 400 });

  const resp = await fetch(`${env.url}/rest/v1/snapshots?id=eq.${encodeURIComponent(code)}&select=data,updated_at`, {
    headers: supabaseHeaders(env.key),
    cache: "no-store",
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json({ error: `Supabase error (${resp.status}) ${detail.slice(0, 160)}`.trim() }, { status: 502 });
  }
  const rows = (await resp.json()) as { data: unknown; updated_at: string }[];
  const row = rows[0];
  if (!row) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, data: row.data, updatedAt: new Date(row.updated_at).getTime() });
}

export async function POST(req: Request) {
  const env = envOrNull();
  if (!env) return NextResponse.json({ error: "Sync isn't configured on the server yet." }, { status: 501 });

  let body: { code?: string; data?: unknown; updatedAt?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { code, data, updatedAt } = body;
  if (!code || !CODE_PATTERN.test(code)) return NextResponse.json({ error: "Invalid sync code." }, { status: 400 });
  if (data === undefined) return NextResponse.json({ error: "No data provided." }, { status: 400 });

  const resp = await fetch(`${env.url}/rest/v1/snapshots?on_conflict=id`, {
    method: "POST",
    headers: { ...supabaseHeaders(env.key), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ id: code, data, updated_at: new Date(updatedAt ?? Date.now()).toISOString() }]),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    return NextResponse.json({ error: `Supabase error (${resp.status}) ${detail.slice(0, 160)}`.trim() }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
