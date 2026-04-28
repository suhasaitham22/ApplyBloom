"use client";

import { JobsList } from "./jobs-list";

export function JobsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Job matches</h1>
        <p className="text-sm text-neutral-500">
          Ranked against your profile and resume. Scores blend title/skill overlap, location, salary, and remote fit.
        </p>
      </div>
      <JobsList />
    </div>
  );
}
