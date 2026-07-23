import { NextResponse } from "next/server";

// Photo → calorie estimate. Sends the uploaded image to a vision model via
// OpenRouter and returns a structured estimate. Until OPENROUTER_API_KEY is set,
// it returns a clearly-labeled demo estimate so the whole UI flow is testable —
// so "only the LLM needs plugging in" is literally true: add the key.

export const runtime = "nodejs";
// Vision calls routinely take longer than Vercel's 10s default for serverless
// functions, which would kill the request mid-flight in production.
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a nutrition assistant. From the photo, identify the food and estimate BOTH its TOTAL calories and its TOTAL protein in grams.
For EVERY calorie and protein figure, cross-check at least 3 reputable nutrition references (e.g. USDA FoodData Central, official product labels, established food-composition databases) and reconcile them into a single best estimate. Set "sources" to the integer number of distinct references you cross-checked (aim for 3 or more).
Reply with ONLY a JSON object, no prose or markdown, in exactly this shape:
{"name":"<short food name>","kcal":<integer total kcal>,"protein":<integer total grams of protein>,"items":[{"name":"<item>","kcal":<int>,"protein":<int grams>}],"sources":<int>,"note":"<one short sentence on assumptions>"}`;

interface EstimateResult {
  ok: boolean;
  name: string;
  kcal: number;
  protein: number;
  items: { name: string; kcal: number; protein: number }[];
  sources: number;
  note: string;
  mock: boolean;
  error?: string;
}

export async function POST(req: Request) {
  let body: { image?: string; hint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const { image, hint } = body;
  if (!image || typeof image !== "string") {
    return NextResponse.json({ ok: false, error: "No image provided" }, { status: 400 });
  }

  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/o4-mini";
  // Reasoning models (o-series, gpt-5, etc.) think before answering, which is
  // better for judging portions/ingredients from a photo. Effort is tunable and
  // can be turned off ("off"/"none") to fall back to a plain sampling model.
  const effort = (process.env.OPENROUTER_REASONING_EFFORT || "medium").toLowerCase();
  const reasoningOn = effort !== "off" && effort !== "none";

  // No key yet → labeled demo estimate so the flow is fully testable now.
  if (!key) {
    return NextResponse.json({
      ok: true,
      mock: true,
      name: hint?.trim() ? hint.trim() : "Estimated meal",
      kcal: 450,
      protein: 20,
      items: [{ name: hint?.trim() || "Meal", kcal: 450, protein: 20 }],
      sources: 3,
      note: "Demo estimate — add an OPENROUTER_API_KEY to switch on real photo analysis.",
    } satisfies EstimateResult);
  }

  // Reasoning tokens count toward the completion cap, so a reasoning model
  // needs plenty of headroom or the final JSON gets truncated; a plain model
  // does not. Reasoning models also reject a custom temperature, so we only set
  // one on the non-reasoning path.
  const payload: Record<string, unknown> = {
    model,
    // The cross-check-3-sources instruction makes reasoning models think more,
    // and reasoning tokens count toward this cap — give complex, multi-item
    // plates enough room that the final JSON isn't truncated mid-object.
    max_tokens: reasoningOn ? 3000 : 700,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: hint?.trim() ? `Extra context: ${hint.trim()}` : "Estimate the calories in this food.",
          },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
  };
  if (reasoningOn) {
    // We only need the final answer, not the chain of thought, so exclude it.
    const level = ["low", "medium", "high"].includes(effort) ? effort : "medium";
    payload.reasoning = { effort: level, exclude: true };
  } else {
    payload.temperature = 0.2;
  }

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      const hint =
        resp.status === 401
          ? "Your OPENROUTER_API_KEY looks invalid."
          : resp.status === 402
            ? "Your OpenRouter account is out of credit."
            : "";
      return NextResponse.json(
        { ok: false, error: `${hint || `LLM request failed (${resp.status}).`} ${detail.slice(0, 160)}`.trim() },
        { status: 502 },
      );
    }

    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const parsed = parseEstimate(content);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: "Could not read the model's response." }, { status: 502 });
    }
    return NextResponse.json({ ...parsed, ok: true, mock: false } satisfies EstimateResult);
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || "Network error" }, { status: 500 });
  }
}

function parseEstimate(content: string): Omit<EstimateResult, "ok" | "mock" | "error"> | null {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = JSON.parse(cleaned.slice(start, end + 1));
    const kcal = Math.round(Number(obj.kcal));
    if (!Number.isFinite(kcal)) return null;
    const protein = Math.max(0, Math.round(Number(obj.protein) || 0));
    const items = Array.isArray(obj.items)
      ? obj.items.map((it: unknown) => {
          const o = (it ?? {}) as Record<string, unknown>;
          return {
            name: String(o.name ?? "Item"),
            kcal: Math.round(Number(o.kcal) || 0),
            protein: Math.max(0, Math.round(Number(o.protein) || 0)),
          };
        })
      : [];
    const sources = Math.max(0, Math.round(Number(obj.sources) || 0));
    return { name: String(obj.name ?? "Estimated meal"), kcal, protein, items, sources, note: String(obj.note ?? "") };
  } catch {
    return null;
  }
}
