"use client";

import { Lock, Pause } from "lucide-react";

export interface ChatLockBannerProps {
  running: boolean;
  onPause?: () => void;
}

export function ChatLockBanner({ running, onPause }: ChatLockBannerProps) {
  if (!running) return null;
  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
      <Lock className="h-3.5 w-3.5" />
      <span className="flex-1">Automation is running. Chat paused — answer any pending question from the dashboard, or pause to chat freely.</span>
      {onPause && (
        <button
          type="button"
          onClick={onPause}
          className="inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-0.5 font-medium text-amber-900 hover:bg-amber-100"
        >
          <Pause className="h-3 w-3" /> Pause
        </button>
      )}
    </div>
  );
}
