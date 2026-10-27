'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Cloud, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Field, Input, SectionLabel, Textarea } from '@/components/ui';
import { useBillingStatus } from '@/components/billing/BillingPanel';

interface Playbook {
  id: string;
  title: string;
  subject: string;
  body: string;
  created_at: string;
}

export function ReplyPlaybooks() {
  const { status, loading: statusLoading } = useBillingStatus();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const loadPlaybooks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/billing/playbooks', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json() as { playbooks?: Playbook[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Saved playbooks could not be loaded.');
      setPlaybooks(data.playbooks ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Saved playbooks could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status?.isPro) void loadPlaybooks();
  }, [status?.isPro, loadPlaybooks]);

  async function savePlaybook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/billing/playbooks', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, subject, body }),
      });
      const data = await response.json() as { playbook?: Playbook; error?: string };
      if (!response.ok || !data.playbook) throw new Error(data.error || 'Could not save the playbook.');
      setPlaybooks((current) => [data.playbook!, ...current]);
      setTitle(''); setSubject(''); setBody('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the playbook.');
    } finally {
      setSaving(false);
    }
  }

  async function removePlaybook(id: string) {
    setError('');
    try {
      const response = await fetch(`/api/billing/playbooks/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not remove the playbook.');
      setPlaybooks((current) => current.filter((playbook) => playbook.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not remove the playbook.');
    }
  }

  return (
    <Card className="mb-6 p-4 sm:p-5">
      <div className="flex items-start gap-2.5">
        <Cloud className="mt-0.5 h-4 w-4 text-accent" />
        <div><SectionLabel>Pro · your cloud reply playbooks</SectionLabel><p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">These are separate from the built-in free library. Your personal playbooks are saved to your account and remain independent of the local ledger.</p></div>
      </div>
      {statusLoading ? <p className="mt-3 text-xs text-ink-mute">Checking Pro access…</p> : !status?.billingReady ? (
        <p className="mt-3 text-xs text-ink-mute">Test-mode billing is not configured for this deployment. The existing free reply library remains available below.</p>
      ) : status.statusAvailable === false ? (
        <p className="mt-3 text-xs text-ink-mute">Subscription status could not be verified. Cloud playbook access is paused; your local workspace is unaffected.</p>
      ) : !status.authenticated || !status.verified ? (
        <p className="mt-3 text-xs text-ink-mute"><Link className="underline underline-offset-4" href="/signin">Sign in with a verified account</Link> to check subscription access.</p>
      ) : !status.isPro ? (
        <div className="mt-3 flex flex-wrap items-center gap-3"><p className="text-xs text-ink-mute">A Pro subscription is required to save personal cloud playbooks.</p><Link href="/pricing" className="inline-flex items-center gap-1 text-xs font-medium text-accent-deep underline underline-offset-4">See Free and Pro <ArrowUpRight className="h-3 w-3" /></Link></div>
      ) : (
        <>
          <form onSubmit={savePlaybook} className="mt-4 grid gap-3 rounded-xl border border-line bg-paper/50 p-3 sm:grid-cols-2">
            <Field label="Playbook name"><Input required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Extra revision boundary" /></Field>
            <Field label="Optional subject"><Input maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Re: one more revision" /></Field>
            <Field label="Reply text" className="sm:col-span-2"><Textarea required maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} className="min-h-24" placeholder="Write a reusable reply…" /></Field>
            <div className="sm:col-span-2"><Button size="sm" variant="accent" loading={saving}><Plus className="h-3.5 w-3.5" /> Save to my account</Button></div>
          </form>
          {loading ? <p className="mt-4 text-xs text-ink-mute">Loading saved playbooks…</p> : playbooks.length ? (
            <ul className="mt-4 space-y-2">{playbooks.map((playbook) => <li key={playbook.id} className="rounded-xl border border-line bg-card p-3">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium">{playbook.title}</p>{playbook.subject ? <p className="mt-0.5 text-xs text-ink-mute">Subject: {playbook.subject}</p> : null}<pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink-soft">{playbook.body}</pre></div><Button type="button" aria-label={`Delete ${playbook.title}`} title="Delete playbook" size="icon" variant="ghost" onClick={() => void removePlaybook(playbook.id)}><Trash2 className="h-4 w-4" /></Button></div>
            </li>)}</ul>
          ) : <p className="mt-4 text-xs text-ink-mute">No saved playbooks yet. Add your first one above.</p>}
        </>
      )}
      {error ? <p role="alert" className="mt-3 text-xs text-accent">{error}</p> : null}
    </Card>
  );
}
