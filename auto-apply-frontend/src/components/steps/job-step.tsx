"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useStory } from "@/lib/story-context";

export function JobStep() {
  const { job, setJob, next, back } = useStory();
  const [error, setError] = useState("");

  function onContinue() {
    if (!job.title.trim() || !job.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setError("");
    next();
  }

  return (
    <section className="mx-auto max-w-2xl px-6 pt-20 pb-16">
      <div className="mb-8">
        <h2 className="font-display text-4xl tracking-tightest sm:text-5xl">The target role.</h2>
        <p className="mt-3 text-muted-foreground">Paste the job &mdash; we&rsquo;ll tailor your resume to it.</p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-8">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Job title *</Label>
            <Input value={job.title} onChange={(e) => setJob({ title: e.target.value })} placeholder="Senior Backend Engineer" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company</Label>
              <Input value={job.company} onChange={(e) => setJob({ company: e.target.value })} placeholder="Acme Corp" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Job URL</Label>
              <Input value={job.url} onChange={(e) => setJob({ url: e.target.value })} placeholder="https://…" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description *</Label>
            <Textarea value={job.description} onChange={(e) => setJob({ description: e.target.value })} rows={10} placeholder="Paste the full job description here…" className="mt-1.5 resize-none" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button onClick={onContinue}>
          Tailor my resume <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
