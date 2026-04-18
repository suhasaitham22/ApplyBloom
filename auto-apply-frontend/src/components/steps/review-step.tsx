"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStory } from "@/lib/story-context";
import type { StructuredResume } from "@/lib/api-types";
import { chatAboutResumeOnBackend } from "@/lib/backend-api-client";

type ChatMsg = { role: "user" | "assistant"; content: string };

export function ReviewStep() {
  const { resume, setResume, next, back, demoMode } = useStory();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: demoMode
        ? "Running in heuristic mode. Edit fields directly, or try: “make the summary shorter”."
        : "I’ve structured your resume. Edit anything or ask me to rewrite sections.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  if (!resume) {
    return (
      <section className="mx-auto max-w-xl px-6 pt-20 text-center">
        <p className="text-muted-foreground">No resume loaded.</p>
        <Button variant="outline" size="sm" onClick={back} className="mt-4">Go back</Button>
      </section>
    );
  }

  function update<K extends keyof StructuredResume>(key: K, value: StructuredResume[K]) {
    setResume({ ...resume, [key]: value } as StructuredResume);
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
    <section className="mx-auto max-w-6xl px-6 pt-10 pb-16">
      <div className="mb-8">
        <h2 className="font-display text-3xl tracking-tightest sm:text-4xl">Your resume</h2>
        <p className="mt-2 text-sm text-muted-foreground">Edit any field directly, or chat with the assistant.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Resume editor */}
        <Card>
          <CardContent className="p-8 space-y-6">
            <div>
              <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
              <Input id="name" value={resume.full_name} onChange={(e) => update("full_name", e.target.value)} className="mt-1.5 border-0 bg-transparent px-0 text-3xl font-display tracking-tight h-auto focus-visible:ring-0 focus-visible:border-b focus-visible:rounded-none" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Headline</Label>
              <Input value={resume.headline} onChange={(e) => update("headline", e.target.value)} className="mt-1.5 border-0 bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:border-b focus-visible:rounded-none" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input value={resume.contact.email} onChange={(e) => update("contact", { ...resume.contact, email: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
                <Input value={resume.contact.phone} onChange={(e) => update("contact", { ...resume.contact, phone: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Location</Label>
                <Input value={resume.contact.location} onChange={(e) => update("contact", { ...resume.contact, location: e.target.value })} className="mt-1.5" />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Summary</Label>
              <Textarea value={resume.summary} onChange={(e) => update("summary", e.target.value)} rows={4} className="mt-1.5 resize-none" />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Skills</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {resume.skills.map((s, i) => (
                  <motion.div key={s + i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
                    <Badge variant="secondary">{s}</Badge>
                  </motion.div>
                ))}
              </div>
            </div>

            <SectionList title="Experience" items={resume.experience} onChange={(v) => update("experience", v)} />
            <SectionList title="Education" items={resume.education} onChange={(v) => update("education", v)} />
          </CardContent>
        </Card>

        {/* Chat panel */}
        <Card className="flex flex-col h-[640px] sticky top-20">
          <div className="flex items-center gap-2 border-b px-5 py-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Assistant</span>
            {demoMode && <Badge variant="outline" className="ml-auto text-[10px]">Heuristic</Badge>}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {sending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="rounded-2xl bg-secondary px-3.5 py-2.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex items-center gap-2 border-t p-3">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Make the summary shorter…" disabled={sending} className="flex-1" />
            <Button type="submit" size="icon" disabled={sending || !draft.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button onClick={next}>
          Looks good <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

function SectionList({ title, items, onChange }: { title: string; items: { heading: string; bullets: string[] }[]; onChange: (v: { heading: string; bullets: string[] }[]) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{title}</Label>
      <div className="mt-2 space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border bg-secondary/30 p-3">
            <Input value={it.heading} onChange={(e) => { const copy = items.slice(); copy[i] = { ...it, heading: e.target.value }; onChange(copy); }} className="border-0 bg-transparent px-0 h-auto font-medium focus-visible:ring-0" />
            <ul className="mt-1.5 space-y-1">
              {it.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
                  <Input value={b} onChange={(e) => { const copy = items.slice(); const bullets = it.bullets.slice(); bullets[j] = e.target.value; copy[i] = { ...it, bullets }; onChange(copy); }} className="border-0 bg-transparent px-0 h-auto text-sm focus-visible:ring-0" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
