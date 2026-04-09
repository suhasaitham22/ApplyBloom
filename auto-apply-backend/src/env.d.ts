interface ExportedHandler<TEnv = unknown> {
  fetch(request: Request, env: TEnv, ctx?: unknown): Response | Promise<Response>;
}

interface Env {
  API_VERSION: string;
  DEV_DEMO_USER_ID?: string;
  DEV_IMMEDIATE_QUEUE_PROCESSING?: string;
  RESEND_API_KEY?: string;
  RESEND_WEBHOOK_SECRET?: string;
  RESEND_FROM_EMAIL?: string;
  GREENHOUSE_BOARD_TOKENS?: string;
  LEVER_COMPANY_TOKENS?: string;
  PLAYWRIGHT_APPLY_ENABLED?: string;
  PLAYWRIGHT_HEADLESS?: string;
}
