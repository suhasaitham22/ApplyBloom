// Thin wrapper around Cloudflare Workers AI with a heuristic fallback when the
// AI binding is not present (e.g. local dev without wrangler AI support).
// Fallback returns deterministic, LLM-shaped output so the product stays responsive.

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmJsonOptions<TSchema> {
  system: string;
  user: string;
  exampleOutput: TSchema;
  /**
   * If Workers AI is unavailable, this builds a stub response from the user input.
   * Keep it short — the UI will render a clear "demo mode" banner.
   */
  fallback: () => TSchema;
}

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export async function runLlmJson<TSchema>(
  env: Pick<Env, "AI" | "DEMO_MODE">,
  options: LlmJsonOptions<TSchema>,
): Promise<{ data: TSchema; demo: boolean }> {
  if (!env.AI) {
    return { data: options.fallback(), demo: true };
  }

  const prompt = [
    { role: "system", content: options.system },
    { role: "user", content: options.user },
    {
      role: "system",
      content:
        "Respond with JSON only that matches this example shape exactly: " +
        JSON.stringify(options.exampleOutput),
    },
  ] satisfies LlmMessage[];

  try {
    const raw = (await env.AI.run(DEFAULT_MODEL, { messages: prompt })) as {
      response?: string;
    };
    const text = typeof raw?.response === "string" ? raw.response : "";
    const parsed = extractJson<TSchema>(text);
    if (parsed) {
      return { data: parsed, demo: false };
    }
  } catch {
    // fall through to heuristic
  }

  return { data: options.fallback(), demo: true };
}

function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
