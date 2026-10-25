'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { saveSettings, emptySettings, seedDemoWorkspace } from '@/lib/db';
import { CURRENCIES, type Currency, type Tone } from '@/lib/types';
import { ROLE_OPTIONS, TONE_OPTIONS } from '@/lib/templates';
import { Button, Field, Input, Select } from '@/components/ui';
import { LogoMark, Wordmark } from '@/components/brand';
import { draftFor } from '@/lib/scripts';
import { cn } from '@/lib/cn';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [role, setRole] = useState('Brand designer');
  const [email, setEmail] = useState('');
  const [rate, setRate] = useState(95);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [revisions, setRevisions] = useState(2);
  const [rushMultiplier, setRushMultiplier] = useState(1.5);
  const [tone, setTone] = useState<Tone>('warm');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const steps = ['You', 'Your rate', 'Your voice'];

  async function finish(seed = false) {
    setSaving(true);
    setError(null);
    try {
      if (!seed) {
        await saveSettings({
          ...emptySettings(),
          name: name.trim() || 'Freelancer',
          businessName: businessName.trim(),
          role,
          email: email.trim(),
          hourlyRate: rate,
          currency,
          includedRevisions: revisions,
          rushMultiplier,
          tone,
          onboardedAt: Date.now(),
        });
        router.push('/app');
      } else {
        await seedDemoWorkspace();
        router.push('/app');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not finish setup. Your data was not changed.');
    } finally {
      setSaving(false);
    }
  }

  const preview = draftFor('bill', {
    userName: name || 'You',
    businessName,
    clientName: 'Maya',
    projectName: 'Halcyon Coffee',
    askTitle: 'Add a pricing page',
    hours: 4,
    value: Math.round(4 * rate),
    currency,
    tone,
    dueDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    changeOrderNumber: 'CO-001',
  });

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 sm:py-8">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Unbilled home">
            <Wordmark />
          </Link>
          <Link href="/app" className="text-[12.5px] text-ink-mute transition-colors hover:text-ink">
            Skip to the ledger
          </Link>
        </div>

        <div className="mx-auto w-full max-w-[440px] flex-1 py-10 sm:py-14">
          <div className="flex items-center gap-2">
            {steps.map((label, index) => (
              <div key={label} className="flex flex-1 flex-col gap-1.5">
                <span className={cn('h-[3px] rounded-full', index <= step ? 'bg-ink' : 'bg-line')} />
                <span className={cn('mono-label', index === step ? 'text-ink' : 'text-ink-mute')}>
                  {String(index + 1).padStart(2, '0')} {label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-9">
            {step === 0 ? (
              <div className="animate-rise">
                <h1 className="text-[30px] leading-tight tracking-[-0.03em]">Let&apos;s set up your ledger.</h1>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-mute">
                  Three questions. Everything stays in this browser — there is no account to create.
                </p>
                <div className="mt-7 space-y-4">
                  <Field label="Your name">
                    <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sam Rivera" autoFocus />
                  </Field>
                  <Field label="Business or studio name" optional hint="Appears on change orders and emails.">
                    <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Rivera Studio" />
                  </Field>
                  <Field label="What do you do?">
                    <Select value={role} onChange={(event) => setRole(event.target.value)}>
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Client-facing email" optional hint="Used for the “Email it” button — never sent anywhere.">
                    <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="sam@riverastudio.com" />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="animate-rise">
                <h1 className="text-[30px] leading-tight tracking-[-0.03em]">What is an hour worth?</h1>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-mute">
                  Every request gets priced at this rate. You can override it per project later.
                </p>
                <div className="mt-7 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Hourly rate">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">$</span>
                        <Input
                          type="number"
                          min={1}
                          value={rate}
                          onChange={(event) => setRate(Number(event.target.value))}
                          className="pl-7 tnum"
                        />
                      </div>
                    </Field>
                    <Field label="Currency">
                      <Select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>
                        {CURRENCIES.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Revision rounds" hint="Included per deliverable.">
                      <Select value={revisions} onChange={(event) => setRevisions(Number(event.target.value))}>
                        {[0, 1, 2, 3, 4].map((value) => (
                          <option key={value} value={value}>
                            {value === 0 ? 'None' : value}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Rush premium" hint="Applied to urgent requests.">
                      <Select value={rushMultiplier} onChange={(event) => setRushMultiplier(Number(event.target.value))}>
                        {[1, 1.25, 1.5, 1.75, 2].map((value) => (
                          <option key={value} value={value}>
                            {value}×
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="rounded-xl border border-line bg-card p-3.5">
                    <p className="mono-label">what this means</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                      A “quick” extra page (4 hours) is worth{' '}
                      <span className="font-medium text-ink tnum">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(4 * rate)}
                      </span>
                      . An urgent one is{' '}
                      <span className="font-medium text-ink tnum">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
                          4 * rate * rushMultiplier,
                        )}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="animate-rise">
                <h1 className="text-[30px] leading-tight tracking-[-0.03em]">How should it sound?</h1>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-mute">
                  The reply is written in your voice. You can edit every word before sending, and change this later.
                </p>
                <div className="mt-7 space-y-2">
                  {TONE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTone(option.value)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                        tone === option.value ? 'border-ink bg-card' : 'border-line bg-card/50 hover:border-ink/30',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                          tone === option.value ? 'border-ink bg-ink text-paper' : 'border-line-strong',
                        )}
                      >
                        {tone === option.value ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                      </span>
                      <span>
                        <span className="block text-[13.5px] font-medium">{option.label}</span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-ink-mute">{option.blurb}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-3 border-t border-line pt-5">
          {error ? <p role="alert" className="rounded-lg border border-accent/25 bg-accent-soft px-3 py-2 text-[12px] leading-relaxed text-accent-deep">{error}</p> : null}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? router.push('/') : setStep(step - 1))}
              className="px-0 hover:bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Home' : 'Back'}
            </Button>
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !name.trim()}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => finish(false)} loading={saving}>
                Open my ledger <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => finish(true)}
            className="text-center text-[11.5px] text-ink-mute transition-colors hover:text-ink disabled:opacity-50"
          >
            Or explore with a sample workspace first
          </button>
        </div>
      </div>

      {/* preview panel */}
      <aside className="hidden border-l border-line bg-paper-deep/30 lg:flex lg:flex-col lg:justify-center lg:px-10">
        {mounted ? (
        <div className="mx-auto w-full max-w-[420px]">
          <div className="flex items-center gap-2">
            <LogoMark className="h-5 w-5" />
            <p className="mono-label">Preview · what you will send</p>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow-paper)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-[12px] font-medium text-ink">{preview.subject}</span>
              <span className="mono-label">draft</span>
            </div>
            <div className="max-h-[430px] overflow-hidden px-4 py-3.5">
              <p className="whitespace-pre-wrap text-[12px] leading-[1.7] text-ink-soft">{preview.body}</p>
            </div>
            <div className="hairline h-px" />
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="mono-label">change order · co-001</span>
              <span className="text-[12px] font-medium tnum">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(4 * rate)}
              </span>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-mute">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            This is a real generated reply, not a screenshot. Change your tone or rate and it updates.
          </p>
        </div>
        ) : null}
      </aside>
    </div>
  );
}
