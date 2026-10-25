'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { CURRENCIES, type Currency, type Project, type ScopeItem, type ScopeKind } from '@/lib/types';
import { createProject, uid, updateProject } from '@/lib/db';
import { SCOPE_TEMPLATES, type ScopeTemplateItem } from '@/lib/templates';
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';

const KIND_LABEL: Record<ScopeKind, string> = {
  deliverable: 'Deliverable',
  included: 'Included',
  excluded: 'Excluded',
};

const KIND_STYLE: Record<ScopeKind, string> = {
  deliverable: 'text-sage',
  included: 'text-ink-soft',
  excluded: 'text-accent-deep',
};

function blankScope(kind: ScopeKind = 'deliverable'): ScopeItem {
  return { id: uid(), kind, label: '', hours: kind === 'excluded' ? 2 : 2.5 };
}

function fromTemplate(items: ScopeTemplateItem[]): ScopeItem[] {
  return items.map((item) => ({ ...item, id: uid() }));
}

export function ProjectForm({
  open,
  onClose,
  project,
  onSaved,
  currency = 'USD',
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
  onSaved?: (project: Project) => void;
  currency?: Currency;
}) {
  const { push } = useToast();
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [rate, setRate] = useState(95);
  const [budget, setBudget] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [revisionRounds, setRevisionRounds] = useState(2);
  const [notes, setNotes] = useState('');
  const [scope, setScope] = useState<ScopeItem[]>([blankScope(), blankScope('included'), blankScope('excluded')]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (project) {
      setName(project.name);
      setClientName(project.clientName);
      setClientEmail(project.clientEmail ?? '');
      setRate(project.rate);
      setBudget(project.budget ?? '');
      setStartDate(project.startDate);
      setDueDate(project.dueDate ?? '');
      setRevisionRounds(project.revisionRounds);
      setNotes(project.notes ?? '');
      setScope(project.scope);
    } else {
      setName('');
      setClientName('');
      setClientEmail('');
      setRate(95);
      setBudget('');
      setStartDate(new Date().toISOString().slice(0, 10));
      setDueDate('');
      setRevisionRounds(2);
      setNotes('');
      setScope([blankScope(), blankScope('included'), blankScope('excluded')]);
    }
    setError(null);
  }, [open, project]);

  const filledScope = useMemo(() => scope.filter((item) => item.label.trim().length > 0), [scope]);

  function applyTemplate(templateId: string) {
    const template = SCOPE_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) return;
    setScope(fromTemplate(template.items));
    setRevisionRounds(template.revisionRounds);
    if (!name) setName(template.projectName);
    push(`${template.name} scope loaded — edit anything.`);
  }

  function updateItem(id: string, patch: Partial<ScopeItem>) {
    setScope((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function save() {
    if (!name.trim() || !clientName.trim()) {
      setError('A project needs a name and a client.');
      return;
    }
    if (!rate || rate <= 0) {
      setError('Set your hourly rate so requests can be priced.');
      return;
    }
    setSaving(true);
    try {
      if (project) {
        await updateProject(project.id, {
          name: name.trim(),
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          rate,
          budget: budget === '' ? undefined : Number(budget),
          startDate,
          dueDate: dueDate || undefined,
          revisionRounds,
          notes: notes.trim() || undefined,
          scope: filledScope,
        });
        push('Project updated.');
        const updated: Project = { ...project, name, clientName, clientEmail, rate, budget: budget === '' ? undefined : Number(budget), startDate, dueDate, revisionRounds, notes, scope: filledScope };
        onSaved?.(updated);
      } else {
        const created = await createProject({
          name: name.trim(),
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          rate,
          budget: budget === '' ? undefined : Number(budget),
          startDate,
          dueDate: dueDate || undefined,
          revisionRounds,
          scope: filledScope.length ? filledScope : [blankScope()],
          notes: notes.trim() || undefined,
        });
        push('Project created. Paste the next client message into Requests.');
        onSaved?.(created);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the project.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={project ? 'Edit project' : 'New project'}
      description="This is the agreement the engine checks requests against. Plain language is enough — no contract upload."
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="mono-label normal-case tracking-[0.03em]">{filledScope.length} scope items</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {project ? 'Save changes' : 'Create project'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {!project ? (
          <div>
            <p className="mono-label mb-2">Start from a template</p>
            <div className="flex flex-wrap gap-1.5">
              {SCOPE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template.id)}
                  className="group flex items-center gap-1.5 rounded-full border border-line-strong/70 bg-paper/60 px-2.5 py-1 text-[11.5px] text-ink-soft transition-colors hover:border-ink/40 hover:bg-card hover:text-ink"
                >
                  <Wand2 className="h-3 w-3 text-ink-mute group-hover:text-accent" />
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project name">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Halcyon Coffee — brand & site" />
          </Field>
          <Field label="Client name">
            <Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Maya Chen" />
          </Field>
          <Field label="Client email" optional>
            <Input
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              placeholder="maya@halcyoncoffee.com"
            />
          </Field>
          <Field label="Project fee" optional hint="Used for the effective-rate number in reports.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">{CURRENCIES.find((option) => option.code === currency)?.symbol ?? currency}</span>
              <Input
                type="number"
                min={0}
                value={budget}
                onChange={(event) => setBudget(event.target.value === '' ? '' : Number(event.target.value))}
                className="pl-7 tnum"
                placeholder="7200"
              />
            </div>
          </Field>
          <Field label="Your rate" hint="Per hour. Used to price every request.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-mute">{CURRENCIES.find((option) => option.code === currency)?.symbol ?? currency}</span>
              <Input
                type="number"
                min={1}
                value={rate}
                onChange={(event) => setRate(Number(event.target.value))}
                className="pl-7 tnum"
              />
            </div>
          </Field>
          <Field label="Revision rounds included">
            <Select value={revisionRounds} onChange={(event) => setRevisionRounds(Number(event.target.value))}>
              {[0, 1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? 'None' : `${value} round${value === 1 ? '' : 's'}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start date">
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label="Delivery date" optional>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">Agreed scope</p>
              <p className="mt-0.5 text-[11.5px] text-ink-mute">
                What is included, what is not, and how much of it. This is what the engine matches against.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {scope.map((item, index) => (
              <div key={item.id} className="rounded-xl border border-line bg-paper/40 p-2.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={item.kind}
                    onChange={(event) => updateItem(item.id, { kind: event.target.value as ScopeKind })}
                    className={cn('h-9 shrink-0 text-[12px] sm:w-[126px]', KIND_STYLE[item.kind])}
                    aria-label={`Scope type for item ${index + 1}`}
                  >
                    {(['deliverable', 'included', 'excluded'] as ScopeKind[]).map((kind) => (
                      <option key={kind} value={kind}>
                        {KIND_LABEL[kind]}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={item.label}
                    onChange={(event) => updateItem(item.id, { label: event.target.value })}
                    placeholder={
                      item.kind === 'excluded' ? 'e.g. Copywriting and page content' : 'e.g. Homepage (1)'
                    }
                    className="h-9 flex-1 text-[13px]"
                    aria-label={`Scope label for item ${index + 1}`}
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-line bg-card px-2 py-1">
                      <span className="mono-label">qty</span>
                      <input
                        type="number"
                        min={1}
                        value={item.qty ?? ''}
                        onChange={(event) => updateItem(item.id, { qty: event.target.value === '' ? undefined : Number(event.target.value) })}
                        className="w-9 bg-transparent text-right text-[12px] tnum outline-none"
                        aria-label={`Quantity for item ${index + 1}`}
                      />
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-line bg-card px-2 py-1">
                      <span className="mono-label">hrs</span>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={item.hours ?? ''}
                        onChange={(event) => updateItem(item.id, { hours: event.target.value === '' ? undefined : Number(event.target.value) })}
                        className="w-10 bg-transparent text-right text-[12px] tnum outline-none"
                        aria-label={`Hours for item ${index + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setScope((items) => items.filter((entry) => entry.id !== item.id))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition-colors hover:bg-accent-soft hover:text-accent-deep"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setScope((items) => [...items, blankScope()])}>
              <Plus className="h-3.5 w-3.5" /> Deliverable
            </Button>
            <Button size="sm" variant="outline" onClick={() => setScope((items) => [...items, blankScope('included')])}>
              <Plus className="h-3.5 w-3.5" /> Included
            </Button>
            <Button size="sm" variant="outline" onClick={() => setScope((items) => [...items, blankScope('excluded')])}>
              <Plus className="h-3.5 w-3.5" /> Excluded
            </Button>
          </div>
        </div>

        <Field label="Notes" optional hint="Anything you want to remember about the relationship or the agreement.">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20" />
        </Field>

        {error ? <p className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-[12.5px] text-accent-deep">{error}</p> : null}
      </div>
    </Modal>
  );
}
