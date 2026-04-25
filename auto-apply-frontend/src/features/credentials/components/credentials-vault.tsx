"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, Plus, Lock, ShieldCheck, X } from "lucide-react";
import {
  listCredentials, createCredential, revealCredential, deleteCredential, updateCredential,
  type RedactedCredential, type FullCredential, type CredentialProvider,
} from "@/features/studio/lib/studio-client";

const PROVIDERS: Array<{ id: CredentialProvider; name: string }> = [
  { id: "linkedin", name: "LinkedIn" },
  { id: "indeed", name: "Indeed" },
  { id: "greenhouse", name: "Greenhouse" },
  { id: "lever", name: "Lever" },
  { id: "workday", name: "Workday" },
  { id: "wellfound", name: "Wellfound" },
  { id: "generic", name: "Generic / Other" },
];

// How long plaintext stays visible after reveal (ms)
const REVEAL_TTL_MS = 30_000;

export function CredentialsVault() {
  const [items, setItems] = useState<RedactedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [reveals, setReveals] = useState<Record<string, FullCredential | undefined>>({});

  async function refresh() {
    try {
      const { credentials } = await listCredentials();
      setItems(credentials);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load credentials");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Auto-hide revealed secrets after TTL
  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (const id of Object.keys(reveals)) {
      if (reveals[id]) {
        timers.push(setTimeout(() => {
          setReveals((prev) => ({ ...prev, [id]: undefined }));
          toast.info("Password hidden (30s TTL)");
        }, REVEAL_TTL_MS));
      }
    }
    return () => { for (const t of timers) clearTimeout(t); };
  }, [reveals]);

  async function handleReveal(id: string) {
    const confirmed = window.confirm(
      "Reveal the saved password in plaintext? This action is recorded in the access log. " +
      "The password will auto-hide in 30 seconds.",
    );
    if (!confirmed) return;
    try {
      const { credential } = await revealCredential(id);
      setReveals((prev) => ({ ...prev, [id]: credential }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reveal");
    }
  }

  function hide(id: string) {
    setReveals((prev) => ({ ...prev, [id]: undefined }));
  }

  async function handleDelete(id: string, label: string | null) {
    if (!window.confirm(`Delete ${label || "this credential"}? This cannot be undone.`)) return;
    try {
      await deleteCredential(id);
      toast.success("Credential deleted");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ShieldCheck className="h-6 w-6" /> Credentials vault
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Job board logins are encrypted with AES-256-GCM before being stored. Passwords are
            <strong> never visible</strong> unless you explicitly reveal them — every reveal is logged.
          </p>
        </div>
        <Button onClick={() => setAdding(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add login
        </Button>
      </header>

      {adding && (
        <AddCredentialForm
          onCancel={() => setAdding(false)}
          onCreated={() => { setAdding(false); refresh(); }}
        />
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && items.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No saved logins yet. Add one per job board you want to auto-apply to.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((c) => {
          const revealed = reveals[c.id];
          return (
            <li key={c.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{c.provider}</Badge>
                    {c.label && <span className="font-medium">{c.label}</span>}
                  </div>
                  <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Username</span>
                    <code className="font-mono">{revealed?.username ?? c.username_masked}</code>
                    <span className="text-muted-foreground">Password</span>
                    <code className="font-mono">
                      {revealed?.password ?? (c.has_password ? "•".repeat(12) : "(none)")}
                    </code>
                    {c.last_used_at && (
                      <>
                        <span className="text-muted-foreground">Last used</span>
                        <span>{new Date(c.last_used_at).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {revealed ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => hide(c.id)}>
                      <EyeOff className="h-4 w-4" /> Hide
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleReveal(c.id)}>
                      <Eye className="h-4 w-4" /> Reveal
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="gap-1 text-destructive"
                    onClick={() => handleDelete(c.id, c.label)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AddCredentialForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [provider, setProvider] = useState<CredentialProvider>("linkedin");
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Username and password are required");
      return;
    }
    setSaving(true);
    try {
      await createCredential({
        provider, label: label.trim() || null, username: username.trim(), password,
      });
      toast.success("Credential saved (encrypted)");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Add a login</h3>
        <Button type="button" size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Job board</Label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value as CredentialProvider)}
          >
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Label (optional)</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Main account" />
        </div>
      </div>
      <div>
        <Label>Username / email</Label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
      </div>
      <div>
        <Label>Password</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <p className="mt-1 text-xs text-muted-foreground">
          Encrypted with AES-256-GCM before storage. We never see it in plaintext after this form submits.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save encrypted"}</Button>
      </div>
    </form>
  );
}
