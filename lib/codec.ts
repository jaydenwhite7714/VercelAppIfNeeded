import { gzipSync, gunzipSync, strToU8, strFromU8 } from 'fflate';
import { z } from 'zod';
import { CURRENCIES, type ChangeOrder, type Currency, type Settings } from './types';

/**
 * Change orders are shared as self-contained links: the entire document is
 * compressed into the URL fragment. Fragments are not sent in HTTP requests to
 * the link host, but the link is not encrypted or access-controlled; anyone
 * who receives it can inspect the document.
 */

export interface SharedChangeOrder {
  v: 1;
  checksum: string;
  fromName: string;
  fromBusiness: string;
  fromEmail: string;
  clientName: string;
  clientEmail?: string;
  projectName: string;
  number: string;
  issuedAt: string;
  title: string;
  summary: string;
  items: { d: string; h: number; r: number; a: number }[];
  total: number;
  currency: Currency;
  timeline: string;
  terms: string;
  validUntil?: string;
}

const currencySchema = z.enum(CURRENCIES.map((currency) => currency.code) as [Currency, ...Currency[]]);
const checksumSchema = z.string().min(1).max(10).regex(/^[a-z0-9]+$/);
const sharedOrderSchema = z.object({
  v: z.literal(1),
  checksum: checksumSchema,
  fromName: z.string(),
  fromBusiness: z.string(),
  fromEmail: z.string(),
  clientName: z.string(),
  clientEmail: z.string().optional(),
  projectName: z.string(),
  number: z.string(),
  issuedAt: z.string(),
  title: z.string(),
  summary: z.string(),
  items: z.array(z.object({ d: z.string(), h: z.number().finite().min(0), r: z.number().finite().min(0), a: z.number().finite().min(0) }).strict()).max(500),
  total: z.number().finite().min(0),
  currency: currencySchema,
  timeline: z.string(),
  terms: z.string(),
  validUntil: z.string().optional(),
}).strict();

export const MAX_SHARE_LENGTH = 7000;
export const MAX_SHARED_PAYLOAD_BYTES = 256 * 1024;

function decodeCompressedJson(encoded: string): string | null {
  if (!encoded || encoded.length > MAX_SHARE_LENGTH) return null;
  const output = gunzipSync(fromBase64Url(encoded), { out: new Uint8Array(MAX_SHARED_PAYLOAD_BYTES + 1) });
  if (output.byteLength > MAX_SHARED_PAYLOAD_BYTES) return null;
  return strFromU8(output);
}

export function isChangeOrderExpired(validUntil?: string, now = new Date()): boolean {
  return Boolean(validUntil && validUntil < now.toISOString().slice(0, 10));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Small, dependency-free checksum used to detect mangled links (not a signature). */
export function checksum(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = (h1 ^ code) * 0x01000193;
    h2 = (h2 + code * (i + 7)) * 0x85ebca6b;
    h1 >>>= 0;
    h2 >>>= 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}`.slice(0, 10);
}

export function buildSharedOrder(order: ChangeOrder, projectName: string, clientName: string, clientEmail: string | undefined, settings: Settings): SharedChangeOrder {
  const base: Omit<SharedChangeOrder, 'checksum'> = {
    v: 1,
    fromName: settings.name,
    fromBusiness: settings.businessName,
    fromEmail: settings.email,
    clientName,
    clientEmail,
    projectName,
    number: order.number,
    issuedAt: new Date(order.createdAt).toISOString().slice(0, 10),
    title: order.title,
    summary: order.summary,
    items: order.items.map((item) => ({ d: item.description, h: item.hours, r: item.rate, a: item.amount })),
    total: order.total,
    currency: order.currency,
    timeline: order.timelineImpact,
    terms: order.terms,
    validUntil: order.validUntil,
  };
  const payload = JSON.stringify(base);
  return { ...base, checksum: checksum(payload) };
}

export function encodeSharedOrder(order: SharedChangeOrder): string {
  const json = JSON.stringify(order);
  const compressed = gzipSync(strToU8(json), { level: 9 });
  return toBase64Url(compressed);
}

export function decodeSharedOrder(encoded: string): { order: SharedChangeOrder | null; corrupted: boolean } {
  try {
    const json = decodeCompressedJson(encoded);
    if (json === null) return { order: null, corrupted: true };
    const raw: unknown = JSON.parse(json);
    const result = sharedOrderSchema.safeParse(raw);
    if (!result.success) return { order: null, corrupted: true };
    const parsed = raw as SharedChangeOrder;
    const { checksum: embedded, ...rest } = parsed;
    const valid = embedded === checksum(JSON.stringify(rest));
    return { order: result.data, corrupted: !valid };
  } catch {
    return { order: null, corrupted: true };
  }
}

export function shareUrl(encoded: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://unbilled.app');
  return `${base}/c#${encoded}`;
}

export function approvalReceipt(order: SharedChangeOrder, approvedBy: string, timestamp: number, note = ''): string {
  const when = new Date(timestamp).toUTCString();
  const safeName = approvedBy.replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
  const safeNote = note
    .replace(/\r/g, '')
    .slice(0, 2_000)
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  return [
    `CHANGE ORDER APPROVAL`,
    `Change order: ${order.number} — ${order.title}`,
    `Project: ${order.projectName}`,
    `Client: ${order.clientName}`,
    `Total approved: ${order.currency} ${order.total.toLocaleString('en-US')}`,
    `Approved by: ${safeName}`,
    `Approved at: ${when}`,
    `Document checksum: ${order.checksum}`,
    ...(safeNote ? [`Client note:`, safeNote] : []),
    ``,
    `I approve the scope, fee, and timeline changes described in this change order.`,
    `This text receipt is not a cryptographic signature and does not independently verify identity.`,
  ].join('\n');
}

export interface ParsedApproval {
  approvedBy: string;
  approvedAt: number;
  checksum: string;
  total: number;
  currency: Currency;
  changeOrderNumber: string;
}

/**
 * Parse the complete receipt format. This checks its internal document details,
 * not the approver's identity or the authenticity of the text (the checksum is
 * an integrity check, not a cryptographic signature).
 */
export function parseApprovalReceipt(text: string): ParsedApproval | null {
  if (!text || typeof text !== 'string' || text.length > 10_000) return null;
  const approvedBy = text.match(/^Approved by:\s*(.+)$/im)?.[1]?.trim();
  const approvedAtRaw = text.match(/^Approved at:\s*(.+)$/im)?.[1]?.trim();
  const parsedDate = approvedAtRaw ? Date.parse(approvedAtRaw) : NaN;
  const checksumMatch = text.match(/^Document checksum:\s*([a-z0-9]{1,10})\s*$/im)?.[1];
  const totalMatch = text.match(/^Total approved:\s*([A-Z]{3})\s*([\d,]+(?:\.\d{1,2})?)\s*$/im);
  const changeOrderNumber = text.match(/^Change order:\s*([A-Za-z0-9-]+)(?:\s+—|$)/im)?.[1];
  const currency = totalMatch?.[1] as Currency | undefined;
  const total = totalMatch ? Number(totalMatch[2].replace(/,/g, '')) : NaN;
  if (!approvedBy || approvedBy.length > 200 || !Number.isFinite(parsedDate) || !checksumMatch ||
      !totalMatch || !Number.isFinite(total) || total < 0 || !currency || !CURRENCIES.some((option) => option.code === currency) || !changeOrderNumber) {
    return null;
  }
  return { approvedBy, approvedAt: parsedDate, checksum: checksumMatch, total, currency, changeOrderNumber };
}

/* ------------------------------------------------------------ shared scope */

export interface SharedScope {
  v: 1;
  checksum: string;
  fromName: string;
  fromBusiness: string;
  fromEmail: string;
  clientName: string;
  projectName: string;
  issuedAt: string;
  dueDate?: string;
  revisionRounds: number;
  rate?: number;
  currency: Currency;
  deliverables: { l: string; h?: number }[];
  included: string[];
  excluded: string[];
  note?: string;
}

const sharedScopeSchema = z.object({
  v: z.literal(1),
  checksum: checksumSchema,
  fromName: z.string(),
  fromBusiness: z.string(),
  fromEmail: z.string(),
  clientName: z.string(),
  projectName: z.string(),
  issuedAt: z.string(),
  dueDate: z.string().optional(),
  revisionRounds: z.number().int().min(0),
  rate: z.number().finite().min(0).optional(),
  currency: currencySchema,
  deliverables: z.array(z.object({ l: z.string(), h: z.number().finite().min(0).optional() }).strict()).max(1_000),
  included: z.array(z.string()).max(1_000),
  excluded: z.array(z.string()).max(1_000),
  note: z.string().optional(),
}).strict();

export function buildSharedScope(args: {
  settings: Settings;
  projectName: string;
  clientName: string;
  dueDate?: string;
  revisionRounds: number;
  rate: number;
  currency: Currency;
  deliverables: { l: string; h?: number }[];
  included: string[];
  excluded: string[];
  note?: string;
}): SharedScope {
  const base: Omit<SharedScope, 'checksum'> = {
    v: 1,
    fromName: args.settings.name,
    fromBusiness: args.settings.businessName,
    fromEmail: args.settings.email,
    clientName: args.clientName,
    projectName: args.projectName,
    issuedAt: new Date().toISOString().slice(0, 10),
    dueDate: args.dueDate,
    revisionRounds: args.revisionRounds,
    rate: args.rate,
    currency: args.currency,
    deliverables: args.deliverables,
    included: args.included,
    excluded: args.excluded,
    note: args.note,
  };
  return { ...base, checksum: checksum(JSON.stringify(base)) };
}

export function encodeSharedScope(scope: SharedScope): string {
  return toBase64Url(gzipSync(strToU8(JSON.stringify(scope)), { level: 9 }));
}

export function decodeSharedScope(encoded: string): { scope: SharedScope | null; corrupted: boolean } {
  try {
    const json = decodeCompressedJson(encoded);
    if (json === null) return { scope: null, corrupted: true };
    const raw: unknown = JSON.parse(json);
    const result = sharedScopeSchema.safeParse(raw);
    if (!result.success) return { scope: null, corrupted: true };
    const parsed = raw as SharedScope;
    const { checksum: embedded, ...rest } = parsed;
    return { scope: result.data, corrupted: embedded !== checksum(JSON.stringify(rest)) };
  } catch {
    return { scope: null, corrupted: true };
  }
}
