"use client";

import { motion } from "framer-motion";
import { useState, type ChangeEvent, type DragEvent } from "react";
import { useStory } from "@/lib/story-context";
import { extractResumeText } from "@/lib/extract-resume-text";
import { structureResumeOnBackend } from "@/lib/backend-api-client";

export function UploadStep() {
  const { next, setResume, setResumeFileName, setRawResumeText, setDemoMode, setStatusMessage, statusMessage } = useStory();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFile(file: File) {
    try {
      setIsProcessing(true);
      setStatusMessage(`Reading ${file.name}…`);
      const text = await extractResumeText(file);
      setRawResumeText(text);
      setResumeFileName(file.name);

      setStatusMessage("Structuring your resume…");
      const { data } = await structureResumeOnBackend(text, file.name);
      setResume(data.resume);
      setDemoMode(data.demo_mode);
      setStatusMessage(data.demo_mode ? "Structured with heuristics (Workers AI offline)." : "Structured with Workers AI.");
      setTimeout(() => next(), 500);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsProcessing(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
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
    <motion.section key="upload" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="mx-auto max-w-2xl px-6 pt-16">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-3xl font-semibold tracking-tight text-neutral-900" style={{ fontFamily: "var(--font-syne), sans-serif" }}>Let’s start with your resume.</h2>
        <p className="text-neutral-600">PDF, DOCX, or plain text. We’ll parse it into a clean, editable form.</p>
      </div>
      <div onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} className={`relative rounded-3xl border-2 border-dashed p-12 text-center transition-colors ${isDragging ? "border-indigo-400 bg-indigo-50" : "border-neutral-300 bg-white"}`}>
        {isProcessing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-indigo-500" />
            <p className="text-sm font-medium text-neutral-700">{statusMessage}</p>
          </motion.div>
        ) : (
          <>
            <motion.div animate={{ y: isDragging ? -4 : 0 }} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-white">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <p className="mb-1 text-base font-medium text-neutral-900">Drop your resume here</p>
            <p className="mb-4 text-sm text-neutral-500">or click to browse</p>
            <label className="inline-flex cursor-pointer rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800">
              Choose file
              <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={onSelect} />
            </label>
          </>
        )}
      </div>
      {statusMessage && !isProcessing && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center text-sm text-rose-600">{statusMessage}</motion.p>
      )}
    </motion.section>
  );
}
