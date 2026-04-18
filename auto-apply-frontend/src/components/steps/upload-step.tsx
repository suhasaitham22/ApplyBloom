"use client";

import { motion } from "framer-motion";
import { FileUp, Loader2, ArrowLeft } from "lucide-react";
import { useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStory } from "@/lib/story-context";
import { extractResumeText } from "@/lib/extract-resume-text";
import { structureResumeOnBackend } from "@/lib/backend-api-client";

export function UploadStep() {
  const { next, back, setResume, setResumeFileName, setRawResumeText, setDemoMode, setStatusMessage, statusMessage } = useStory();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    try {
      setError("");
      setIsProcessing(true);
      setStatusMessage(`Reading ${file.name}…`);
      const text = await extractResumeText(file);
      setRawResumeText(text);
      setResumeFileName(file.name);
      setStatusMessage("Structuring your resume…");
      const { data } = await structureResumeOnBackend(text, file.name);
      setResume(data.resume);
      setDemoMode(data.demo_mode);
      setTimeout(() => next(), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setIsProcessing(false);
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <section className="mx-auto max-w-2xl px-6 pt-20 pb-16">
      <div className="mb-10 text-center">
        <h2 className="font-display text-4xl tracking-tightest sm:text-5xl">Start with your resume.</h2>
        <p className="mt-3 text-muted-foreground">PDF, DOCX, or plain text. We&rsquo;ll parse it into an editable form.</p>
      </div>

      <motion.label
        htmlFor="resume-file"
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        whileHover={{ scale: 1.005 }}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition-colors ${
          isDragging ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/50"
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm font-medium">{statusMessage}</p>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FileUp className="h-6 w-6" />
            </div>
            <p className="mt-4 font-medium">Drop your resume here</p>
            <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
            <p className="mt-6 text-xs text-muted-foreground">PDF &middot; DOCX &middot; TXT</p>
          </>
        )}
        <input id="resume-file" type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={onSelect} />
      </motion.label>

      {error && <p className="mt-6 text-center text-sm text-destructive">{error}</p>}

      <div className="mt-10 text-center">
        <Button variant="ghost" size="sm" onClick={back}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
      </div>
    </section>
  );
}
