-- Adds per-session system prompt override (optional)
alter table public.sessions
  add column if not exists system_prompt text;
