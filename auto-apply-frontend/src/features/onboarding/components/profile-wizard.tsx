"use client";

/*
 * Profile intake wizard — 4 steps, gates mode="auto" applies.
 *
 *   1. Basics        — legal name, email, phone, location
 *   2. Work Auth     — authorization type + sponsorship flag
 *   3. Preferences   — relocation, start date, notice, salary, links
 *   4. EEO (optional)— gender, race, veteran, disability (encrypted at rest)
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import {
  getProfile, saveProfile,
  type UserProfilePatch, type WorkAuth,
} from "@/features/studio/lib/studio-client";

type Step = 0 | 1 | 2 | 3;

const WORK_AUTH_OPTIONS: Array<{ value: WorkAuth; label: string }> = [
  { value: "citizen", label: "US Citizen" },
  { value: "green_card", label: "Green card / permanent resident" },
  { value: "h1b", label: "H1-B visa" },
  { value: "opt", label: "OPT" },
  { value: "stem_opt", label: "STEM OPT" },
  { value: "needs_sponsorship", label: "Need sponsorship" },
  { value: "other", label: "Other" },
];

interface WizardState extends Required<Pick<UserProfilePatch,
  "legal_first_name" | "legal_last_name" | "email" | "phone" | "location"
>> {
  work_authorization: WorkAuth | "";
  visa_sponsorship_needed: boolean | null;
  relocation_ok: boolean | null;
  earliest_start_date: string;
  notice_period_weeks: number | null;
  salary_min: number | null;
  salary_max: number | null;
  linkedin_url: string;
  portfolio_url: string;
  github_url: string;
  eeo_gender: string;
  eeo_race: string;
  eeo_veteran: string;
  eeo_disability: string;
}

const EMPTY: WizardState = {
  legal_first_name: "", legal_last_name: "", email: "", phone: "", location: "",
  work_authorization: "", visa_sponsorship_needed: null, relocation_ok: null,
  earliest_start_date: "", notice_period_weeks: null, salary_min: null, salary_max: null,
  linkedin_url: "", portfolio_url: "", github_url: "",
  eeo_gender: "", eeo_race: "", eeo_veteran: "", eeo_disability: "",
};

export function ProfileWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [state, setState] = useState<WizardState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { profile } = await getProfile();
        if (!cancelled && profile) {
          setState((s) => ({
            ...s,
            legal_first_name: profile.legal_first_name ?? "",
            legal_last_name: profile.legal_last_name ?? "",
            email: profile.email ?? "",
            phone: profile.phone ?? "",
            location: profile.location ?? "",
            work_authorization: profile.work_authorization ?? "",
            visa_sponsorship_needed: profile.visa_sponsorship_needed,
            relocation_ok: profile.relocation_ok,
            earliest_start_date: profile.earliest_start_date ?? "",
            notice_period_weeks: profile.notice_period_weeks,
            salary_min: profile.salary_min,
            salary_max: profile.salary_max,
            linkedin_url: profile.linkedin_url ?? "",
            portfolio_url: profile.portfolio_url ?? "",
            github_url: profile.github_url ?? "",
          }));
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const step0Valid = useMemo(() =>
    Boolean(state.legal_first_name && state.legal_last_name && state.email && state.phone && state.location),
    [state],
  );
  const step1Valid = useMemo(() =>
    Boolean(state.work_authorization),
    [state],
  );
  const step2Valid = state.relocation_ok !== null;

  async function persist(nextStep?: Step, opts?: { finish?: boolean }) {
    setSaving(true);
    try {
      const patch: UserProfilePatch = {
        legal_first_name: state.legal_first_name || null,
        legal_last_name: state.legal_last_name || null,
        email: state.email || null,
        phone: state.phone || null,
        location: state.location || null,
        work_authorization: (state.work_authorization || null) as WorkAuth | null,
        visa_sponsorship_needed: state.visa_sponsorship_needed,
        relocation_ok: state.relocation_ok,
        earliest_start_date: state.earliest_start_date || null,
        notice_period_weeks: state.notice_period_weeks,
        salary_min: state.salary_min,
        salary_max: state.salary_max,
        linkedin_url: state.linkedin_url || null,
        portfolio_url: state.portfolio_url || null,
        github_url: state.github_url || null,
      };
      if (step === 3) {
        patch.eeo_gender = state.eeo_gender || null;
        patch.eeo_race = state.eeo_race || null;
        patch.eeo_veteran = state.eeo_veteran || null;
        patch.eeo_disability = state.eeo_disability || null;
      }
      const { complete } = await saveProfile(patch);
      if (opts?.finish) {
        toast.success(complete ? "Profile complete. Auto-apply unlocked." : "Progress saved.");
        router.push("/studio");
        return;
      }
      if (nextStep !== undefined) setStep(nextStep);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Stepper step={step} />
      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        {step === 0 && <StepBasics state={state} setState={setState} />}
        {step === 1 && <StepWorkAuth state={state} setState={setState} />}
        {step === 2 && <StepPreferences state={state} setState={setState} />}
        {step === 3 && <StepEEO state={state} setState={setState} />}

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1) as Step)}
            disabled={step === 0 || saving}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => persist((step + 1) as Step)}
              disabled={
                saving ||
                (step === 0 && !step0Valid) ||
                (step === 1 && !step1Valid) ||
                (step === 2 && !step2Valid)
              }
            >
              {saving ? "Saving…" : "Save & continue"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => persist(undefined, { finish: true })} disabled={saving}>
              <Check className="mr-1 h-4 w-4" />
              {saving ? "Saving…" : "Finish"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Basics", "Work auth", "Preferences", "EEO (optional)"];
  return (
    <ol className="flex items-center justify-between gap-2">
      {labels.map((l, i) => (
        <li key={l} className="flex-1">
          <div className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                i < step ? "bg-amber-400 text-neutral-900"
                : i === step ? "bg-neutral-900 text-white"
                : "bg-neutral-200 text-neutral-500"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < labels.length - 1 && (
              <div className={`ml-2 h-[2px] flex-1 ${i < step ? "bg-amber-400" : "bg-neutral-200"}`} />
            )}
          </div>
          <div className="mt-2 text-xs text-neutral-500">{l}</div>
        </li>
      ))}
    </ol>
  );
}

interface StepProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

function StepBasics({ state, setState }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Who are you?</h2>
      <p className="text-sm text-neutral-500">Legal name + contact — exactly what most applications ask for.</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Legal first name">
          <Input value={state.legal_first_name ?? ""} onChange={(e) => setState((s) => ({ ...s, legal_first_name: e.target.value }))} />
        </Field>
        <Field label="Legal last name">
          <Input value={state.legal_last_name ?? ""} onChange={(e) => setState((s) => ({ ...s, legal_last_name: e.target.value }))} />
        </Field>
      </div>
      <Field label="Email">
        <Input type="email" value={state.email ?? ""} onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))} />
      </Field>
      <Field label="Phone">
        <Input value={state.phone ?? ""} onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))} placeholder="+1 555 123 4567" />
      </Field>
      <Field label="Location">
        <Input value={state.location ?? ""} onChange={(e) => setState((s) => ({ ...s, location: e.target.value }))} placeholder="San Francisco, CA" />
      </Field>
    </div>
  );
}

function StepWorkAuth({ state, setState }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Work authorization</h2>
      <p className="text-sm text-neutral-500">Stored securely — used to auto-fill this field on applications.</p>
      <div className="grid gap-2">
        {WORK_AUTH_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
              state.work_authorization === opt.value
                ? "border-neutral-900 bg-neutral-50"
                : "border-neutral-200 hover:border-neutral-400"
            }`}
          >
            <input
              type="radio" name="work_auth" value={opt.value}
              checked={state.work_authorization === opt.value}
              onChange={() => setState((s) => ({
                ...s,
                work_authorization: opt.value,
                visa_sponsorship_needed: opt.value === "needs_sponsorship" ? true : opt.value === "h1b" || opt.value === "opt" || opt.value === "stem_opt" ? true : false,
              }))}
              className="accent-amber-500"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function StepPreferences({ state, setState }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Preferences</h2>
      <p className="text-sm text-neutral-500">Used to filter jobs that aren&apos;t a fit before we apply.</p>

      <div>
        <Label className="mb-2 block">Willing to relocate?</Label>
        <div className="flex gap-2">
          {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
            <button
              key={l}
              type="button"
              onClick={() => setState((s) => ({ ...s, relocation_ok: v }))}
              className={`rounded-full border px-4 py-1 text-sm ${
                state.relocation_ok === v
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <Field label="Earliest start date">
        <Input type="date" value={state.earliest_start_date} onChange={(e) => setState((s) => ({ ...s, earliest_start_date: e.target.value }))} />
      </Field>
      <Field label="Notice period (weeks)">
        <Input
          type="number" min={0} max={52}
          value={state.notice_period_weeks ?? ""}
          onChange={(e) => setState((s) => ({ ...s, notice_period_weeks: e.target.value ? Number(e.target.value) : null }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Salary floor (USD)">
          <Input type="number" min={0}
            value={state.salary_min ?? ""}
            onChange={(e) => setState((s) => ({ ...s, salary_min: e.target.value ? Number(e.target.value) : null }))}
          />
        </Field>
        <Field label="Salary ceiling (USD)">
          <Input type="number" min={0}
            value={state.salary_max ?? ""}
            onChange={(e) => setState((s) => ({ ...s, salary_max: e.target.value ? Number(e.target.value) : null }))}
          />
        </Field>
      </div>

      <Field label="LinkedIn URL">
        <Input value={state.linkedin_url} onChange={(e) => setState((s) => ({ ...s, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
      </Field>
      <Field label="Portfolio URL">
        <Input value={state.portfolio_url} onChange={(e) => setState((s) => ({ ...s, portfolio_url: e.target.value }))} placeholder="https://..." />
      </Field>
      <Field label="GitHub URL">
        <Input value={state.github_url} onChange={(e) => setState((s) => ({ ...s, github_url: e.target.value }))} placeholder="https://github.com/..." />
      </Field>
    </div>
  );
}

function StepEEO({ state, setState }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <div className="font-semibold text-amber-900">Voluntary</div>
          <div className="text-amber-800">
            Per EEOC guidelines — 100% optional. Stored AES-256-GCM encrypted.
            Skip if you prefer; you can always answer per-application.
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold">EEO information (optional)</h2>
      <Field label="Gender identity">
        <Input value={state.eeo_gender} onChange={(e) => setState((s) => ({ ...s, eeo_gender: e.target.value }))} placeholder="e.g. woman, man, nonbinary, prefer not to say" />
      </Field>
      <Field label="Race / ethnicity">
        <Input value={state.eeo_race} onChange={(e) => setState((s) => ({ ...s, eeo_race: e.target.value }))} placeholder="e.g. Asian, Black, Hispanic, prefer not to say" />
      </Field>
      <Field label="Veteran status">
        <Input value={state.eeo_veteran} onChange={(e) => setState((s) => ({ ...s, eeo_veteran: e.target.value }))} placeholder="e.g. veteran, non-veteran, prefer not to say" />
      </Field>
      <Field label="Disability status">
        <Input value={state.eeo_disability} onChange={(e) => setState((s) => ({ ...s, eeo_disability: e.target.value }))} placeholder="e.g. yes, no, prefer not to say" />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-medium text-neutral-700">{label}</Label>
      {children}
    </div>
  );
}
