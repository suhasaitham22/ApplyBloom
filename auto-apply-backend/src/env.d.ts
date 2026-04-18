interface ExportedHandler<TEnv = unknown> {
  fetch(request: Request, env: TEnv, ctx?: unknown): Response | Promise<Response>;
}

interface Ai {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

interface Env {
  API_VERSION: string;
  DEMO_MODE?: string;
  DEV_DEMO_USER_ID?: string;
  DEV_IMMEDIATE_QUEUE_PROCESSING?: string;

  SUPABASE_URL?: string;
  SUPABASE_JWT_SECRET?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_BUCKET?: string;

  RESEND_API_KEY?: string;
  RESEND_WEBHOOK_SECRET?: string;
  RESEND_FROM_EMAIL?: string;

  GREENHOUSE_BOARD_TOKENS?: string;
  LEVER_COMPANY_TOKENS?: string;

  AI?: Ai;
  AI_MODEL_ID?: string;

  // External LLM providers (optional — chosen in priority order)
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
}
