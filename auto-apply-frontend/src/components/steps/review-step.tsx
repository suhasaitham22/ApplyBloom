"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useStory } from "@/lib/story-context";
import { chatAboutResumeOnBackend } from "@/lib/backend-api-client";

type ChatMsg = { role: "user" | "assistant"; content: string };

export function ReviewStep() {
  const { resume, setResume, next, back, demoMode } = useStory();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: demoMode
        ? "I’m running in heuristic mode (Workers AI is offline). You can still edit fields directly. Try: “make the summary shorter”."
        : "Here’s your structured resume. Edit anything directly or ask me to rewrite sections.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  if (!resume) {
    return (
      <div className="mx-auto max-w-2xl px-6 pt-20 text-center text-neutral-600">
        No resume loaded. <button className="text-indigo-600 underline" onClick={back}>Go back</button>
      </div>
    );
  }

  function update<K extends keyof typeof resume>(key: K, value: (typeof resume)[K]) {
    setResume({ ...resume, [key]: value });
  }

  async function sendChat() {
    if (!draft.trim() || !resume) return;
    const userMsg: ChatMsg = { role: "user", content: draft.trim() };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setSending(true);
    try {
      const { data } = await chatAboutResumeOnBackend(resume, userMsg.content, messages);
      const reply = data.reply;
      setMessages((m) => [...m, { role: "assistant", content: reply.assistant_message }]);
      let updated = { ...resume };
      for (const op of reply.operations) {
        if (op.op === "replace_summary") updated = { ...updated, summary: op.value };
        else if (op.op === "replace_headline") updated = { ...updated, headline: op.value };
        else if (op.op === "set_skills") updated = { ...updated, skills: op.value };
      }
      setResume(updated);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: "Error: " + (err instanceof Error ? err.message : "request failed") }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.section key="review" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="mx-auto grid max-w-6xl gap-6 px-6 pt-8 lg:grid-cols-[1fr_380px]">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <EditableField label="Name" value={resume.full_name} onChange={(v) => update("full_name", v)} large />
        <EditableField label="Headline" value={resume.headline} onChange={(v) => update("headline", v)} />
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <EditableField label="Email" value={resume.contact.email} onChange={(v) => update("contact", { ...resume.contact, email: v })} />
          <EditableField label="Phone" value={resume.contact.phone} onChange={(v) => update("contact", { ...resume.contact, phone: v })} />
          <EditableField label="Location" value={resume.contact.location} onChange={(v) => update("contact", { ...resume.contact, location: v })} />
        </div>
        <div className="mt-6">
          <Label>Summary</Label>
          <textarea value={resume.summary} onChange={(e) => update("summary", e.target.value)} className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" rows={4} />
        </div>
        <div className="mt-6">
          <Label>Skills</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {resume.skills.map((s, i) => (
              <motion.span key={s + i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">{s}</motion.span>
            ))}
          </div>
        </div>
        <SectionList title="Experience" items={resume.experience} onChange={(v) => update("experience", v)} />
        <SectionList title="Education" items={resume.education} onChange={(v) => update("education", v)} />
        <div className="mt-8 flex items-center justify-between">
          <button onClick={back} className="text-sm text-neutral-500 hover:text-neutral-900">← Back</button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={next} className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white shadow-lg">Looks good →</motion.button>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex h-[600px] flex-col rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-700 p-6 text-white shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-300">Resume AI</span>
          {demoMode && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">Heuristic mode</span>}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "ml-auto max-w-[85%] bg-indigo-500 text-white" : "max-w-[90%] bg-white/10 text-neutral-100"}`}>{m.content}</motion.div>
            ))}
          </AnimatePresence>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="mt-4 flex items-center gap-2 rounded-full bg-white/10 p-1 ring-1 ring-white/20 focus-within:ring-white/50">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Make the summary shorter…" disabled={sending} className="flex-1 bg-transparent px-4 py-2 text-sm placeholder-neutral-400 focus:outline-none" />
          <motion.button type="submit" whileTap={{ scale: 0.92 }} disabled={sending || !draft.trim()} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40">{sending ? "…" : "Send"}</motion.button>
        </form>
      </motion.div>
    </motion.section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{children}</span>;
}

function EditableField({ label, value, onChange, large }: { label: string; value: string; onChange: (v: string) => void; large?: boolean }) {
  return (
    <div className="mb-1">
      <Label>{label}</Label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`mt-1 w-full rounded-lg border border-transparent bg-transparent p-1 transition-colors hover:bg-neutral-50 focus:border-indigo-500 focus:bg-white focus:outline-none ${large ? "text-2xl font-semibold tracking-tight text-neutral-900" : "text-sm text-neutral-800"}`} />
    </div>
  );
}

function SectionList({ title, items, onChange }: { title: string; items: { heading: string; bullets: string[] }[]; onChange: (v: { heading: string; bullets: string[] }[]) => void }) {
  return (
    <div className="mt-8">
      <Label>{title}</Label>
      <div className="mt-2 space-y-4">
        {items.map((it, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-neutral-200 bg-white p-3">
            <input value={it.heading} onChange={(e) => { const copy = items.slice(); copy[i] = { ...it, heading: e.target.value }; onChange(copy); }} className="w-full rounded bg-transparent text-sm font-semibold text-neutral-900 focus:bg-neutral-50 focus:outline-none" />
            <ul className="mt-2 space-y-1">
              {it.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-neutral-400" />
                  <input value={b} onChange={(e) => { const copy = items.slice(); const bullets = it.bullets.slice(); bullets[j] = e.target.value; copy[i] = { ...it, bullets }; onChange(copy); }} className="flex-1 rounded bg-transparent text-xs text-neutral-700 focus:bg-neutral-50 focus:outline-none" />
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
