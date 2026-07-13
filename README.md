# Calorie Tracker

A simple, mobile-first web app to track daily calorie intake against a budget,
with weekly and monthly views. Built with Next.js (App Router) + TypeScript and
plain CSS — no UI framework.

## How it works

- **Today** — a calorie ring showing budget / consumed / remaining, day
  navigation, and a running log. Tap **Add food** to log something.
- **Add food** — two ways:
  - **Frequent**: pick from your saved items and set a quantity.
  - **One-off**: type a name + calories for something you won't reuse.
  - **Photo** (coming next): snap/upload a photo and let a vision model estimate.
- **Foods** — manage your frequently-eaten items (name, calories/serving, unit).
- **Stats** — weekly bar chart and a monthly calendar heatmap, with totals and
  averages.
- **Settings** — daily budget, week start day, and JSON **export/import** for
  backup and moving data between devices.

## Data & storage

All data lives in your browser via `localStorage` — no account, no server, works
offline. The persistence code is isolated in [`lib/storage.ts`](lib/storage.ts)
behind a tiny `load`/`save`/`parse` API, so a cloud backend (e.g. Vercel KV) can
be dropped in later without touching the UI.

To move data to another device today: **Settings → Export backup**, then
**Import backup** on the other device.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Photo → calorie feature (added last)

Set these in `.env.local` (copy from [`.env.example`](.env.example)):

```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o        # or google/gemini-2.0-flash-001 (cheaper)
```

The key is only ever used server-side (in a Next.js route handler); it is never
exposed to the browser.

## Deploy (Vercel)

1. Push this folder to a Git repo (or use the Vercel CLI).
2. Import it in Vercel — it auto-detects Next.js.
3. Add the `OPENROUTER_*` environment variables (once the photo feature is in).
4. Deploy.
