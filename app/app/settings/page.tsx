'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, HardDrive, RefreshCw, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/app/AppShell';
import { Button, Card, Field, Input, Modal, SectionLabel, Select, Textarea, useToast } from '@/components/ui';
import { CURRENCIES, type Currency, type Tone } from '@/lib/types';
import { DEFAULT_TERMS, exportWorkspace, importWorkspace, resetWorkspace, saveSettings, seedDemoWorkspace, validateWorkspace, type WorkspaceExport } from '@/lib/db';
import { useAsks, useChangeOrders, useProjects, useReadySettings } from '@/lib/hooks';
import { TONE_OPTIONS } from '@/lib/templates';
import { cn } from '@/lib/cn';

export default function SettingsPage() {
  const router = useRouter();
  const { push } = useToast();
  const { settings } = useReadySettings();
  const projects = useProjects();
  const asks = useAsks();
  const orders = useChangeOrders();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [rate, setRate] = useState(85);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [revisions, setRevisions] = useState(2);
  const [rush, setRush] = useState(1.5);
  const [tone, setTone] = useState<Tone>('warm');
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [saving, setSaving] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<WorkspaceExport | null>(null);

  useEffect(() => {
    if (!settings) return;
    setName(settings.name);
    setBusinessName(settings.businessName);
    setRole(settings.role);
    setEmail(settings.email);
    setRate(settings.hourlyRate);
    setCurrency(settings.currency);
    setRevisions(settings.includedRevisions);
    setRush(settings.rushMultiplier);
    setTone(settings.tone);
    setTerms(settings.terms);
  }, [settings]);

  const currencyLocked = projects === undefined || asks === undefined || orders === undefined || Boolean(projects.length || asks.length || orders.length);
  const currencyHint = projects === undefined || asks === undefined || orders === undefined
    ? 'Checking saved workspace data…'
    : currencyLocked
      ? 'Locked because saved amounts are not converted. Changing units would relabel existing records.'
      : 'Choose before creating projects; values are never automatically converted.';

  if (!settings) return null;

  async function save() {
    setSaving(true);
    try {
      await saveSettings({
        name,
        businessName,
        role,
        email,
        hourlyRate: rate,
        currency,
        includedRevisions: revisions,
        rushMultiplier: rush,
        tone,
        terms,
      });
      push('Settings saved.');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not save settings.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    try {
      const data = await exportWorkspace();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `unbilled-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      push('Backup downloaded.');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not create a backup.', 'error');
    }
  }

  async function importData(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!validateWorkspace(parsed)) {
        push('That file is not an Unbilled backup. Your current data was not changed.', 'error');
        return;
      }
      setPendingImport(parsed);
    } catch {
      push('Could not read that file. Your current data was not changed.', 'error');
    }
  }

  async function confirmImport() {
    if (!pendingImport || confirmingImport) return;
    setConfirmingImport(true);
    try {
      await importWorkspace(pendingImport);
      setPendingImport(null);
      push('Backup restored.');
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not restore that backup. Your current data was not changed.', 'error');
    } finally {
      setConfirmingImport(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="How Unbilled writes and bills for you"
        description="These defaults power the pricing and the reply drafts. Nothing here is sent anywhere — it is stored in this browser only."
        actions={
          <Button onClick={save} loading={saving}>
            Save changes
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <SectionLabel>Profile</SectionLabel>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Your name">
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field label="Business or studio" optional>
                <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
              </Field>
              <Field label="Role">
                <Input value={role} onChange={(event) => setRole(event.target.value)} />
              </Field>
              <Field label="Client-facing email" optional>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionLabel>Money defaults</SectionLabel>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Hourly rate" hint="Used for new projects.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">
                    {CURRENCIES.find((option) => option.code === currency)?.symbol ?? currency}
                  </span>
                  <Input
                    type="number"
                    min={1}
                    value={rate}
                    onChange={(event) => setRate(Number(event.target.value))}
                    className="pl-7 tnum"
                  />
                </div>
              </Field>
              <Field
                label="Currency"
                hint={currencyHint}
              >
                <Select disabled={currencyLocked} value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
                  {CURRENCIES.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Revision rounds included" hint="Checked against revision requests.">
                <Select value={revisions} onChange={(event) => setRevisions(Number(event.target.value))}>
                  {[0, 1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Rush premium" hint="Applied to requests with urgent language.">
                <Select value={rush} onChange={(event) => setRush(Number(event.target.value))}>
                  {[1, 1.25, 1.5, 1.75, 2].map((value) => (
                    <option key={value} value={value}>
                      {value}×
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionLabel>Voice</SectionLabel>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTone(option.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    tone === option.value ? 'border-ink bg-card' : 'border-line bg-paper/40 hover:border-ink/30',
                  )}
                >
                  <p className="text-[13px] font-medium">{option.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-mute">{option.blurb}</p>
                </button>
              ))}
            </div>
            <Field label="Default change order terms" className="mt-4" hint="Appears at the bottom of every change order.">
              <Textarea value={terms} onChange={(event) => setTerms(event.target.value)} className="min-h-28 text-[12.5px]" />
            </Field>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-sage" />
              <SectionLabel className="flex-1">Your data</SectionLabel>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-ink-mute">
              Unbilled stores everything in IndexedDB in this browser. There is no account and no server copy. Export a
              backup before switching devices or clearing site data.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['Projects', projects?.length ?? 0],
                ['Requests', asks?.length ?? 0],
                ['Orders', orders?.length ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-line bg-paper/50 px-2.5 py-2">
                  <p className="mono-label">{label}</p>
                  <p className="text-[14px] tnum">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={exportData}>
                <Download className="h-3.5 w-3.5" /> Export backup
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Import
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importData(file);
                  event.target.value = '';
                }}
              />
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <p className="mono-label">sample workspace</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-mute">
                Add a worked example — one client, one scope, and sample decisions. Existing data is kept; if the example is already present, it will not be added again.
              </p>
              <Button
                size="sm"
                variant="subtle"
                className="mt-2"
                loading={sampleLoading}
                onClick={async () => {
                  setSampleLoading(true);
                  try {
                    await seedDemoWorkspace();
                    push('Sample workspace is ready, or it was already present.');
                    router.refresh();
                  } catch (error) {
                    push(error instanceof Error ? error.message : 'Could not load sample data.', 'error');
                  } finally {
                    setSampleLoading(false);
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Load sample data
              </Button>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionLabel>Start over</SectionLabel>
            <p className="mt-2.5 text-[12px] leading-relaxed text-ink-mute">
              Deletes every project, request, change order and setting in this browser. Export first if you want a copy.
            </p>
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setResetOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete everything
            </Button>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionLabel>About</SectionLabel>
            <dl className="mt-2.5 space-y-1.5 text-[12px]">
              {[
                ['Version', '1.0.0'],
                ['Scope engine', 'Deterministic rules, no model'],
                ['Storage', 'IndexedDB (local)'],
                ['Account', 'None required'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-ink-mute">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-mute">
              Unbilled is not legal advice. Pricing estimates are market medians meant to start a conversation with your
              client, not to replace your judgement.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={pendingImport !== null}
        onClose={() => { if (!confirmingImport) setPendingImport(null); }}
        title="Replace this browser’s workspace?"
        description="Importing this backup replaces all projects, requests, change orders, settings, and activity currently stored in this browser."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={confirmingImport} onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button variant="accent" loading={confirmingImport} onClick={() => void confirmImport()}>
              Replace and restore backup
            </Button>
          </div>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-soft">
          The selected backup contains {pendingImport?.projects.length ?? 0} projects, {pendingImport?.asks.length ?? 0} requests, and {pendingImport?.changeOrders.length ?? 0} change orders. Cancel to keep your current data, or confirm to replace it.
        </p>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => { if (!resetting) setResetOpen(false); }}
        title="Delete all local data?"
        description="This cannot be undone."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={resetting} onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              loading={resetting}
              onClick={async () => {
                if (resetting) return;
                setResetting(true);
                try {
                  await resetWorkspace();
                  setResetOpen(false);
                  push('Everything deleted.');
                  router.push('/onboarding');
                } catch (error) {
                  push(error instanceof Error ? error.message : 'Could not delete the workspace.', 'error');
                } finally {
                  setResetting(false);
                }
              }}
            >
              Delete everything
            </Button>
          </div>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Every project, request, change order and preference in this browser will be removed. The app will return to
          onboarding.
        </p>
      </Modal>
    </>
  );
}
