// Studio store dispatcher.
// Re-exports types + functions from either the Supabase adapter (when credentials
// are present and DEMO_MODE is not true) or the in-memory fallback.
//
// Every public function has the same signature in both adapters, so API handlers
// just call these without caring which backend is active.

import { supabaseEnabled } from "@/lib/supabase/client";

// ── Types & errors (shared) ───────────────────────────────────────────
export {
  StudioError,
  type Resume,
  type ChatSession,
  type ChatMessage,
  type JobQueueEntry,
  type SessionStatus,
  type SessionMode,
  type ChatRole,
  type JobStatus,
  type AutoApplyPreferences,
} from "./memory-store";

// Imports for dispatch
import type {
  Resume,
  ChatSession,
  ChatMessage,
  JobQueueEntry,
  SessionMode,
  AutoApplyPreferences,
} from "./memory-store";

import * as mem from "./memory-store";
import * as sb from "./supabase-store";

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DEMO_MODE?: string;
};

const useSupabase = (env: Env) => supabaseEnabled(env);

// ── Resumes ────────────────────────────────────────────────────────────
export function createResume(env: Env, userId: string, opts: Parameters<typeof mem.createResume>[1]): Promise<Resume> {
  return useSupabase(env) ? sb.sbCreateResume(env, userId, opts) : mem.createResume(userId, opts);
}
export function listResumes(env: Env, userId: string): Promise<Resume[]> {
  return useSupabase(env) ? sb.sbListResumes(env, userId) : mem.listResumes(userId);
}
export function getResume(env: Env, userId: string, resumeId: string): Promise<Resume | null> {
  return useSupabase(env) ? sb.sbGetResume(env, userId, resumeId) : mem.getResume(userId, resumeId);
}
export function updateResume(env: Env, userId: string, resumeId: string, patch: Parameters<typeof mem.updateResume>[2]): Promise<Resume | null> {
  return useSupabase(env) ? sb.sbUpdateResume(env, userId, resumeId, patch) : mem.updateResume(userId, resumeId, patch);
}
export function deleteResume(env: Env, userId: string, resumeId: string): Promise<boolean> {
  return useSupabase(env) ? sb.sbDeleteResume(env, userId, resumeId) : mem.deleteResume(userId, resumeId);
}

// ── Sessions ───────────────────────────────────────────────────────────
export function hasActiveSession(env: Env, userId: string): Promise<ChatSession | null> {
  return useSupabase(env) ? sb.sbHasActiveSession(env, userId) : mem.hasActiveSession(userId);
}
export function createSession(env: Env, userId: string, opts: { resume_id?: string | null; mode?: SessionMode; title?: string; preferences?: AutoApplyPreferences }): Promise<ChatSession> {
  return useSupabase(env) ? sb.sbCreateSession(env, userId, opts) : mem.createSession(userId, opts);
}
export function listSessions(env: Env, userId: string): Promise<ChatSession[]> {
  return useSupabase(env) ? sb.sbListSessions(env, userId) : mem.listSessions(userId);
}
export function getSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  return useSupabase(env) ? sb.sbGetSession(env, userId, sessionId) : mem.getSession(userId, sessionId);
}
export function updateSession(env: Env, userId: string, sessionId: string, patch: Partial<ChatSession>): Promise<ChatSession | null> {
  return useSupabase(env) ? sb.sbUpdateSession(env, userId, sessionId, patch) : mem.updateSession(userId, sessionId, patch);
}
export function startSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  return useSupabase(env) ? sb.sbStartSession(env, userId, sessionId) : mem.startSession(userId, sessionId);
}
export function pauseSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  return useSupabase(env) ? sb.sbPauseSession(env, userId, sessionId) : mem.pauseSession(userId, sessionId);
}
export function resumeSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  return useSupabase(env) ? sb.sbResumeSession(env, userId, sessionId) : mem.resumeSession(userId, sessionId);
}
export function cancelSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  return useSupabase(env) ? sb.sbCancelSession(env, userId, sessionId) : mem.cancelSession(userId, sessionId);
}
export function completeSession(env: Env, userId: string, sessionId: string): Promise<ChatSession | null> {
  return useSupabase(env) ? sb.sbCompleteSession(env, userId, sessionId) : mem.completeSession(userId, sessionId);
}

// ── Messages ───────────────────────────────────────────────────────────
export function listMessages(env: Env, sessionId: string): Promise<ChatMessage[]> {
  return useSupabase(env) ? sb.sbListMessages(env, sessionId) : mem.listMessages(sessionId);
}
export function appendMessage(
  env: Env,
  userId: string,
  sessionId: string,
  msg: Parameters<typeof mem.appendMessage>[2],
  options?: Parameters<typeof mem.appendMessage>[3],
): Promise<ChatMessage> {
  return useSupabase(env) ? sb.sbAppendMessage(env, userId, sessionId, msg, options) : mem.appendMessage(userId, sessionId, msg, options);
}

// ── Job queue ──────────────────────────────────────────────────────────
export function enqueueJobs(env: Env, userId: string, sessionId: string, jobs: Parameters<typeof mem.enqueueJobs>[2]): Promise<JobQueueEntry[]> {
  return useSupabase(env) ? sb.sbEnqueueJobs(env, userId, sessionId, jobs) : mem.enqueueJobs(userId, sessionId, jobs);
}
export function listJobs(env: Env, sessionId: string): Promise<JobQueueEntry[]> {
  return useSupabase(env) ? sb.sbListJobs(env, sessionId) : mem.listJobs(sessionId);
}
export function updateJob(env: Env, sessionId: string, jobId: string, patch: Partial<JobQueueEntry>): Promise<JobQueueEntry | null> {
  return useSupabase(env) ? sb.sbUpdateJob(env, sessionId, jobId, patch) : mem.updateJob(sessionId, jobId, patch);
}

// Back-compat aliases
export const lockSession = startSession;
export const hasRunningSession = hasActiveSession;
