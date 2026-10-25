export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'CHF' | 'SEK' | 'INR' | 'JPY' | 'BRL';

export type Tone = 'warm' | 'firm' | 'formal';

export type ScopeKind = 'deliverable' | 'included' | 'excluded';

export interface ScopeItem {
  id: string;
  kind: ScopeKind;
  label: string;
  /** How many of this thing the agreement covers. Omit when it is binary (included / excluded). */
  qty?: number;
  /** Estimated hours for one unit. Used to price extras. */
  hours?: number;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientEmail?: string;
  status: 'active' | 'paused' | 'complete';
  rate: number;
  budget?: number;
  startDate: string;
  dueDate?: string;
  revisionRounds: number;
  scope: ScopeItem[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type Verdict = 'covered' | 'gray' | 'extra';

export type AskStatus = 'open' | 'absorbed' | 'billed' | 'declined' | 'clarified';

export interface AskReason {
  tone: 'good' | 'bad' | 'neutral';
  text: string;
}

export interface Ask {
  id: string;
  projectId: string;
  sourceText: string;
  title: string;
  status: AskStatus;
  verdict: Verdict;
  confidence: number;
  reasons: AskReason[];
  matchedScopeId?: string;
  workLabel?: string;
  hours: number;
  value: number;
  rush: boolean;
  changeOrderId?: string;
  notes?: string;
  createdAt: number;
  decidedAt?: number;
}

export interface ChangeOrderItem {
  id: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

export type ChangeOrderStatus = 'draft' | 'sent' | 'approved' | 'declined';

export interface ChangeOrder {
  id: string;
  number: string;
  projectId: string;
  askIds: string[];
  title: string;
  summary: string;
  items: ChangeOrderItem[];
  total: number;
  currency: Currency;
  timelineImpact: string;
  terms: string;
  status: ChangeOrderStatus;
  validUntil?: string;
  createdAt: number;
  updatedAt: number;
  sentAt?: number;
  approvedAt?: number;
  approvedBy?: string;
  approvalId?: string;
}

export interface Settings {
  id: 'settings';
  name: string;
  businessName: string;
  role: string;
  email: string;
  currency: Currency;
  hourlyRate: number;
  tone: Tone;
  includedRevisions: number;
  rushMultiplier: number;
  terms: string;
  onboardedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Activity {
  id: string;
  type: 'absorbed' | 'billed' | 'declined' | 'clarified' | 'project' | 'change-order' | 'approved';
  message: string;
  amount?: number;
  projectId?: string;
  at: number;
}

export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: 'USD', symbol: '$', label: 'USD — US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP — British Pound' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD — Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'SEK', symbol: 'kr', label: 'SEK — Swedish Krona' },
  { code: 'INR', symbol: '₹', label: 'INR — Indian Rupee' },
  { code: 'JPY', symbol: '¥', label: 'JPY — Japanese Yen' },
  { code: 'BRL', symbol: 'R$', label: 'BRL — Brazilian Real' },
];

export const VERDICT_META: Record<Verdict, { label: string; short: string; description: string }> = {
  covered: {
    label: 'Covered by scope',
    short: 'Covered',
    description: 'This is already in the agreement. Do it, but still confirm it in writing.',
  },
  gray: {
    label: 'Gray area',
    short: 'Gray',
    description: 'The agreement is silent. Decide now, while it is still small.',
  },
  extra: {
    label: 'Outside the scope',
    short: 'Extra',
    description: 'This is new work. Price it or trade it — do not absorb it by accident.',
  },
};

export const ASK_STATUS_META: Record<AskStatus, { label: string; description: string }> = {
  open: { label: 'Undecided', description: 'No decision logged yet.' },
  absorbed: { label: 'Absorbed', description: 'You did it for free. Logged as goodwill.' },
  billed: { label: 'Billed', description: 'Sent as a change order.' },
  declined: { label: 'Declined', description: 'Politely turned down.' },
  clarified: { label: 'Held', description: 'Parked until the scope is confirmed.' },
};
