import { z } from 'zod';
import type { Activity, Ask, ChangeOrder, Project, Settings } from '@/lib/types';

export interface WorkspaceExport {
  app: 'unbilled';
  version: 1;
  exportedAt: string;
  settings: Settings | null;
  projects: Project[];
  asks: Ask[];
  changeOrders: ChangeOrder[];
  activity: Activity[];
}

const nonNegative = z.number().finite().min(0);
const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'SEK', 'INR', 'JPY', 'BRL']);
const scopeItemSchema = z.object({ id: z.string().min(1), kind: z.enum(['deliverable', 'included', 'excluded']), label: z.string(), qty: z.number().finite().positive().optional(), hours: nonNegative.optional() });
const settingsSchema = z.object({ id: z.literal('settings'), name: z.string(), businessName: z.string(), role: z.string(), email: z.string(), currency: currencySchema, hourlyRate: z.number().finite().positive(), tone: z.enum(['warm', 'firm', 'formal']), includedRevisions: z.number().int().min(0), rushMultiplier: z.number().finite().min(1), terms: z.string(), onboardedAt: nonNegative.optional(), createdAt: nonNegative, updatedAt: nonNegative });
const projectSchema = z.object({ id: z.string().min(1), name: z.string(), clientName: z.string(), clientEmail: z.string().optional(), status: z.enum(['active', 'paused', 'complete']), rate: z.number().finite().positive(), budget: nonNegative.optional(), startDate: z.string(), dueDate: z.string().optional(), revisionRounds: z.number().int().min(0), scope: z.array(scopeItemSchema), notes: z.string().optional(), createdAt: nonNegative, updatedAt: nonNegative });
const askSchema = z.object({ id: z.string().min(1), projectId: z.string().min(1), sourceText: z.string(), title: z.string(), status: z.enum(['open', 'absorbed', 'billed', 'declined', 'clarified']), verdict: z.enum(['covered', 'gray', 'extra']), confidence: z.number().finite().min(0).max(1), reasons: z.array(z.object({ tone: z.enum(['good', 'bad', 'neutral']), text: z.string() })), matchedScopeId: z.string().optional(), workLabel: z.string().optional(), hours: nonNegative, value: nonNegative, rush: z.boolean(), changeOrderId: z.string().optional(), notes: z.string().optional(), createdAt: nonNegative, decidedAt: nonNegative.optional() });
const orderSchema = z.object({ id: z.string().min(1), number: z.string().min(1), projectId: z.string().min(1), askIds: z.array(z.string()), title: z.string(), summary: z.string(), items: z.array(z.object({ id: z.string().min(1), description: z.string(), hours: nonNegative, rate: nonNegative, amount: nonNegative })), total: nonNegative, currency: currencySchema, timelineImpact: z.string(), terms: z.string(), status: z.enum(['draft', 'sent', 'approved', 'declined']), validUntil: z.string().optional(), createdAt: nonNegative, updatedAt: nonNegative, sentAt: nonNegative.optional(), approvedAt: nonNegative.optional(), approvedBy: z.string().optional(), approvalId: z.string().optional() });
const activitySchema = z.object({ id: z.string().min(1), type: z.enum(['absorbed', 'billed', 'declined', 'clarified', 'project', 'change-order', 'approved']), message: z.string(), amount: nonNegative.optional(), projectId: z.string().optional(), at: nonNegative });
const workspaceSchema = z.object({ app: z.literal('unbilled'), version: z.literal(1), exportedAt: z.string(), settings: settingsSchema.nullable(), projects: z.array(projectSchema), asks: z.array(askSchema), changeOrders: z.array(orderSchema), activity: z.array(activitySchema) }).superRefine((workspace, context) => {
  const projectIds = new Set(workspace.projects.map((project) => project.id));
  const asksById = new Map(workspace.asks.map((ask) => [ask.id, ask]));
  const ordersById = new Map(workspace.changeOrders.map((order) => [order.id, order]));
  const askIds = new Set(asksById.keys());
  const orderIds = new Set(ordersById.keys());
  if (projectIds.size !== workspace.projects.length || askIds.size !== workspace.asks.length || orderIds.size !== workspace.changeOrders.length) context.addIssue({ code: 'custom', message: 'Duplicate record IDs.' });
  workspace.asks.forEach((ask, index) => {
    if (!projectIds.has(ask.projectId)) context.addIssue({ code: 'custom', path: ['asks', index, 'projectId'], message: 'Missing project reference.' });
    if (ask.changeOrderId) {
      const order = ordersById.get(ask.changeOrderId);
      if (!order) context.addIssue({ code: 'custom', path: ['asks', index, 'changeOrderId'], message: 'Missing change-order reference.' });
      else if (order.projectId !== ask.projectId) context.addIssue({ code: 'custom', path: ['asks', index, 'changeOrderId'], message: 'Request and change order belong to different projects.' });
    }
  });
  workspace.changeOrders.forEach((order, index) => {
    const linkedAsks = order.askIds.map((id) => asksById.get(id));
    if (!projectIds.has(order.projectId) || linkedAsks.some((ask) => !ask)) context.addIssue({ code: 'custom', path: ['changeOrders', index], message: 'Invalid project or request reference.' });
    if (linkedAsks.some((ask) => ask && ask.projectId !== order.projectId)) context.addIssue({ code: 'custom', path: ['changeOrders', index, 'askIds'], message: 'Change order and request belong to different projects.' });
    if (order.items.reduce((sum, item) => sum + item.amount, 0) !== order.total) context.addIssue({ code: 'custom', path: ['changeOrders', index, 'total'], message: 'Change-order total does not match its line items.' });
  });
  workspace.activity.forEach((entry, index) => {
    if (entry.projectId && !projectIds.has(entry.projectId)) context.addIssue({ code: 'custom', path: ['activity', index, 'projectId'], message: 'Missing project reference.' });
  });
});

export function validateWorkspace(data: unknown): data is WorkspaceExport {
  return workspaceSchema.safeParse(data).success;
}
