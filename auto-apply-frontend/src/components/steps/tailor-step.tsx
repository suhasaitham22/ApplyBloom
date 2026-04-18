"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStory } from "@/lib/story-context";
import { tailorResumeOnBackend } from "@/lib/backend-api-client";

export function TailorStep() {
  const { resume, job, tailored, setTailored, demoMode, setDemoMode, next, back } = useStory();
  const [loading, setLoading] = useState(!tailored);
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !resume || !job.title) return;
    ran.current = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await tailorResumeOnBackend(resume, {
          title: job.title,
          company: job.company || undefined,
          description: job.description,
          url: job.url || undefined,
        });
        setTailored(data.tailored);
        setDemoMode(data.demo_mode);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Tailor request failed");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="mt-8 font-display text-3xl tracking-tightest">Rewriting for the role…</h2>
        <p className="mt-3 text-muted-foreground">Emphasizing the skills and wins that matter for this job.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-xl px-6 pt-20 text-center">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={back} className="mt-4">Go back</Button>
      </section>
    );
  }

  if (!tailored || !resume) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 pt-10 pb-16">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tailored for</p>
        <h2 className="mt-2 font-display text-3xl tracking-tightest sm:text-4xl">
          {job.title}{job.company && <span className="text-muted-foreground"> &middot; {job.company}</span>}
        </h2>
        {demoMode && (
          <Badge variant="outline" className="mt-3">Heuristic mode &middot; wire Workers AI for full rewrite</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="p-8 space-y-6">
            <div>
              <h3 className="font-display text-3xl tracking-tightest">{resume.full_name}</h3>
              <p className="mt-1 text-muted-foreground">{tailored.headline}</p>
            </div>

            <p className="text-sm leading-relaxed">{tailored.summary}</p>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Skills</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tailored.skills.map((s, i) => (
                  <motion.div key={s + i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
                    <Badge>{s}</Badge>
                  </motion.div>
                ))}
              </div>
            </div>

            <Section title="Experience" items={tailored.experience} />
            <Section title="Education" items={tailored.education} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-secondary/50">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">What changed</p>
              <ul className="mt-3 space-y-2.5">
                <AnimatePresence>
                  {tailored.change_summary.map((c, i) => (
                    <motion.li key={c} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }} className="flex items-start gap-2 text-sm">
                      <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </div>
                      <span>{c}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button onClick={next}>
          Ready to apply <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

function Section({ title, items }: { title: string; items: { heading: string; bullets: string[] }[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="mt-2 space-y-3">
        {items.map((it, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
            <p className="text-sm font-medium">{it.heading}</p>
            <ul className="mt-1 space-y-0.5">
              {it.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
