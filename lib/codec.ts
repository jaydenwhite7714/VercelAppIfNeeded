import { gzipSync, gunzipSync, strToU8, strFromU8 } from 'fflate';
import type { ChangeOrder, Currency, Settings } from './types';

/**
 * Change orders are shared as self-contained links: the entire document is
 * compressed into the URL fragment. Fragments are never sent to a server, so
 * the client's name, budget, and terms stay between the two of you.
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

export const MAX_SHARE_LENGTH = 7000;

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
    const json = strFromU8(gunzipSync(fromBase64Url(encoded)));
    const parsed = JSON.parse(json) as SharedChangeOrder;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) return { order: null, corrupted: true };
    const { checksum: embedded, ...rest } = parsed;
    const valid = embedded === checksum(JSON.stringify(rest));
    return { order: parsed, corrupted: !valid };
  } catch {
    return { order: null, corrupted: true };
  }
}

export function shareUrl(encoded: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://unbilled.app');
  return `${base}/c#${encoded}`;
}

export function approvalReceipt(order: SharedChangeOrder, approvedBy: string, timestamp: number): string {
  const when = new Date(timestamp).toUTCString();
  return [
    `CHANGE ORDER APPROVAL`,
    `Change order: ${order.number} — ${order.title}`,
    `Project: ${order.projectName}`,
    `Client: ${order.clientName}`,
    `Total approved: ${order.currency} ${order.total.toLocaleString('en-US')}`,
    `Approved by: ${approvedBy}`,
    `Approved at: ${when}`,
    `Document checksum: ${order.checksum}`,
    ``,
    `I approve the scope, fee, and timeline changes described in this change order.`,
  ].join('\n');
}

export interface ParsedApproval {
  approvedBy: string;
  approvedAt?: number;
  checksum?: string;
  total?: number;
  changeOrderNumber?: string;
}

/**
 * Clients paste the receipt they generated on the approval page. Parsing it
 * lets the ledger verify the document matches before recording the money.
 */
export function parseApprovalReceipt(text: string): ParsedApproval | null {
  if (!text || typeof text !== 'string') return null;
  const approvedBy = text.match(/Approved by:\s*(.+)/i)?.[1]?.trim();
  if (!approvedBy) return null;
  const approvedAtRaw = text.match(/Approved at:\s*(.+)/i)?.[1]?.trim();
  const parsedDate = approvedAtRaw ? Date.parse(approvedAtRaw) : NaN;
  const checksumMatch = text.match(/Document checksum:\s*([a-z0-9]+)/i)?.[1]?.trim();
  const totalMatch = text.match(/Total approved:\s*(?:[A-Z]{3}\s*)?([\d,]+(?:\.\d+)?)/i)?.[1];
  const changeOrderNumber = text.match(/Change order:\s*([A-Za-z0-9-]+)/i)?.[1];
  return {
    approvedBy,
    approvedAt: Number.isNaN(parsedDate) ? undefined : parsedDate,
    checksum: checksumMatch,
    total: totalMatch ? Number(totalMatch.replace(/,/g, '')) : undefined,
    changeOrderNumber,
  };
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
    const json = strFromU8(gunzipSync(fromBase64Url(encoded)));
    const parsed = JSON.parse(json) as SharedScope;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.deliverables)) return { scope: null, corrupted: true };
    const { checksum: embedded, ...rest } = parsed;
    return { scope: parsed, corrupted: embedded !== checksum(JSON.stringify(rest)) };
  } catch {
    return { scope: null, corrupted: true };
  }
}
